using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using TCG.FreightBroker.Api.Hubs;
using TCG.FreightBroker.Application.DecisionEngine;
using TCG.FreightBroker.Application.Integrations;
using TCG.FreightBroker.Application.LoadPipeline;
using TCG.FreightBroker.Domain.Entities;
using TCG.FreightBroker.Infrastructure.LoadPipeline;
using TCG.FreightBroker.Infrastructure.Persistence;

namespace TCG.FreightBroker.Api.Services;

/// <summary>
/// Background service that periodically generates a new load, evaluates it
/// through the decision engine, persists the result, and broadcasts the
/// outcome to all SignalR-connected clients.
/// </summary>
public sealed partial class AutoBookingHostedService : BackgroundService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly AutoBookingState _state;
    private readonly IHubContext<LoadsHub> _hub;
    private readonly ILogger<AutoBookingHostedService> _logger;
    private readonly TimeSpan _interval;
    private readonly Random _rng = new();

    // ── Compiled log messages (CA1848 / CA1873 compliance) ──────────────────
    [LoggerMessage(Level = LogLevel.Information, Message = "AutoBookingHostedService started; interval={Interval}s")]
    private static partial void LogStarted(ILogger logger, double interval);

    [LoggerMessage(Level = LogLevel.Debug, Message = "No active lanes found; skipping tick.")]
    private static partial void LogNoLanes(ILogger logger);

    [LoggerMessage(Level = LogLevel.Error, Message = "Error during auto-booking tick")]
    private static partial void LogTickError(ILogger logger, Exception ex);

    [LoggerMessage(Level = LogLevel.Information, Message = "AutoBooking: {Ref} [{Lane}] → {Status} ({Rec})")]
    private static partial void LogDecision(ILogger logger, string @ref, string lane, string status, string rec);

    [LoggerMessage(Level = LogLevel.Warning, Message = "[E2OPEN] Push failed for {Ref}: {Message}")]
    private static partial void LogE2openFailed(ILogger logger, string @ref, string message);

    [LoggerMessage(Level = LogLevel.Warning, Message = "[E2OPEN] Exception pushing {Ref}")]
    private static partial void LogE2openException(ILogger logger, string @ref, Exception ex);

    public AutoBookingHostedService(
        IServiceScopeFactory scopeFactory,
        AutoBookingState state,
        IHubContext<LoadsHub> hub,
        ILogger<AutoBookingHostedService> logger,
        IConfiguration configuration)
    {
        _scopeFactory = scopeFactory;
        _state = state;
        _hub = hub;
        _logger = logger;

        var seconds = configuration.GetValue<int>("AutoBooking:IntervalSeconds", 20);
        _interval = TimeSpan.FromSeconds(Math.Clamp(seconds, 5, 300));
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        LogStarted(_logger, _interval.TotalSeconds);

        using var timer = new PeriodicTimer(_interval);
        while (await timer.WaitForNextTickAsync(stoppingToken))
        {
            if (!_state.IsEnabled)
                continue;

            try
            {
                await ProcessOneTick(stoppingToken);
            }
            catch (Exception ex) when (ex is not OperationCanceledException)
            {
                LogTickError(_logger, ex);
            }
        }
    }

    private async Task ProcessOneTick(CancellationToken ct)
    {
        await using var scope = _scopeFactory.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var datService = scope.ServiceProvider.GetRequiredService<IDatRateService>();
        var e2open = scope.ServiceProvider.GetRequiredService<IE2openService>();

        var generated = await LoadGenerator.GenerateAsync(db, _rng, datService, ct);
        if (generated is null)
        {
            LogNoLanes(_logger);
            return;
        }

        var (load, input, clientCfg) = generated.Value;

        // ── Week context ─────────────────────────────────────────────────────
        var today = DateTimeOffset.UtcNow;
        int dayOfWeek = (int)today.DayOfWeek; // 0=Sun … 6=Sat
        int daysRemaining = dayOfWeek == 0 ? 0 : 7 - dayOfWeek;
        var weekContext = new WeekContext { DaysRemaining = daysRemaining };

        // ── Count this-week bookings for this lane ───────────────────────────
        var weekStart = today.AddDays(-(dayOfWeek == 0 ? 6 : dayOfWeek - 1));
        int currentWeekBookings = await db.Loads
            .AsNoTracking()
            .Where(l => l.LaneId == load.LaneId
                     && l.CreatedAt >= weekStart
                     && (l.Status == "Accepted" || l.IsAutoBooked))
            .CountAsync(ct);

        // ── Total active lanes as proxy for unmet contract loads ──────────────
        // Phase 9 will refine with per-lane weekly minimum tracking
        int totalUnmet = await db.Lanes.AsNoTracking().Where(l => l.IsActive).CountAsync(ct);

        // ── Evaluate ─────────────────────────────────────────────────────────
        var evaluator = new LoadEvaluator();
        var result = evaluator.Evaluate(input, currentWeekBookings, totalUnmet, weekContext, clientCfg);

        // ── Determine status ─────────────────────────────────────────────────
        string status;
        bool isAutoBooked;
        decimal? bookedRate;

        switch (result.Recommendation)
        {
            case Recommendation.AutoAccept:
            case Recommendation.ContractBook:
                status = "Accepted";
                isAutoBooked = true;
                bookedRate = input.CustomerRate;
                break;
            default:
                status = "PendingReview";
                isAutoBooked = false;
                bookedRate = null;
                break;
        }

        load.Status = status;
        load.IsAutoBooked = isAutoBooked;
        load.BookedRate = bookedRate;

        db.Loads.Add(load);

        // Save load first to get its generated Id for the Decision FK
        await db.SaveChangesAsync(ct);

        var decisionReason = result.Rules.Count > 0
            ? result.Rules[^1].Description
            : result.Recommendation.ToString();

        db.Decisions.Add(new Decision
        {
            LoadId = load.Id,
            Action = isAutoBooked ? "Accept" : "Hold",
            Reason = decisionReason,
            IsAutomatic = true,
            CreatedAt = DateTimeOffset.UtcNow,
        });
        await db.SaveChangesAsync(ct);

        // ── Push auto-accepted loads to e2open ────────────────────────────────
        if (isAutoBooked && load.BookedRate.HasValue)
        {
            var laneParts = input.Lane.Split(" → ", 2, StringSplitOptions.TrimEntries);
            string origin = laneParts.Length > 0 ? laneParts[0] : input.Lane;
            string dest = laneParts.Length > 1 ? laneParts[1] : string.Empty;
            try
            {
                var pushResult = await e2open.PushLoadAsync(
                    load.Id, load.ReferenceNumber,
                    origin, dest,
                    load.BookedRate.Value, load.PickupDate, ct);

                if (!pushResult.Success)
                    LogE2openFailed(_logger, load.ReferenceNumber, pushResult.Message);
            }
            catch (Exception ex)
            {
                // e2open push is best-effort; never fail the booking cycle.
                LogE2openException(_logger, load.ReferenceNumber, ex);
            }
        }

        // ── Broadcast ─────────────────────────────────────────────────────────
        string recLabel = result.Recommendation.ToString();
        var evt = new LoadEvent(
            load.Id,
            load.ReferenceNumber,
            input.Lane,
            load.TargetRate,
            load.BookedRate,
            load.Status,
            load.IsAutoBooked,
            recLabel,
            decisionReason,
            DateTimeOffset.UtcNow);

        await _hub.Clients.All.SendAsync(LoadsHubEvents.LoadEvaluated, evt, ct);

        LogDecision(_logger, load.ReferenceNumber, input.Lane, status, recLabel);
    }
}

