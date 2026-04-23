using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using TCG.FreightBroker.Domain.Entities;
using TCG.FreightBroker.Infrastructure.Auth;
using TCG.FreightBroker.Infrastructure.Persistence;
using System.Text.Json;
using TCG.FreightBroker.Application.DecisionEngine;

namespace TCG.FreightBroker.Infrastructure.Seeding;

/// <summary>
/// Seeds known users on startup.
/// • martymeddles  – Admin  – created only if no users exist at all.
/// • maxdieterle   – Manager – upserted every startup; MustChangePin until they set a new one.
/// • holdenhendley – Viewer  – upserted every startup; MustChangePin until they set a new one.
/// </summary>
public sealed class DbSeeder : IHostedService
{
    private readonly IServiceProvider _services;
    private readonly ILogger<DbSeeder> _logger;

    private static readonly Action<ILogger, Exception?> _logSeeded =
        LoggerMessage.Define(LogLevel.Warning, new EventId(1, "AdminSeeded"),
            "Seeded default admin user (username=martymeddles, pin=1234). " +
            "Change the PIN immediately via the Users API.");

    private static readonly Action<ILogger, string, Exception?> _logUserEnsured =
        LoggerMessage.Define<string>(LogLevel.Information, new EventId(2, "UserEnsured"),
            "Ensured seed user exists: {Username}");

    public DbSeeder(IServiceProvider services, ILogger<DbSeeder> logger)
    {
        _services = services;
        _logger = logger;
    }

    public async Task StartAsync(CancellationToken cancellationToken)
    {
        await using var scope = _services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var hasher = scope.ServiceProvider.GetRequiredService<IPinHasher>();

        // ── Seed admin only when the table is empty ──────────────────────────
        if (!await db.AppUsers.AnyAsync(cancellationToken))
        {
            db.AppUsers.Add(new AppUser
            {
                Id = Guid.NewGuid(),
                Username = "martymeddles",
                DisplayName = "Marty Meddles",
                Role = "Admin",
                PinHash = hasher.Hash("1234"),
                MustChangePin = false,
                IsActive = true,
            });
            await db.SaveChangesAsync(cancellationToken);
            _logSeeded(_logger, null);
        }

        // ── Always ensure these named users exist (upsert by username) ───────
        await EnsureUserAsync(db, hasher,
            username: "maxdieterle",
            displayName: "Max Dieterle",
            role: "Manager",
            temporaryPin: "1234",
            ct: cancellationToken);

        await EnsureUserAsync(db, hasher,
            username: "holdenhendley",
            displayName: "Holden Hendley",
            role: "Viewer",
            temporaryPin: "1234",
            ct: cancellationToken);

        await SeedDemoDataAsync(db, cancellationToken);
    }

    public Task StopAsync(CancellationToken cancellationToken) => Task.CompletedTask;

    private async Task EnsureUserAsync(
        AppDbContext db,
        IPinHasher hasher,
        string username,
        string displayName,
        string role,
        string temporaryPin,
        CancellationToken ct)
    {
        var exists = await db.AppUsers.AnyAsync(u => u.Username == username, ct);
        if (!exists)
        {
            db.AppUsers.Add(new AppUser
            {
                Id = Guid.NewGuid(),
                Username = username,
                DisplayName = displayName,
                Role = role,
                PinHash = hasher.Hash(temporaryPin),
                MustChangePin = true,
                IsActive = true,
            });
            await db.SaveChangesAsync(ct);
            _logUserEnsured(_logger, username, null);
        }
    }

    private static async Task SeedDemoDataAsync(AppDbContext db, CancellationToken ct)
    {
        // Skip if any clients already exist — demo data was already seeded.
        if (await db.Clients.AnyAsync(ct)) return;

        // ── 1. Clients ────────────────────────────────────────────────────────
        var pfg = new Client { Name = "Performance Food Group", IsActive = true };
        var sch = new Client { Name = "Schneider Logistics", IsActive = true };
        var sys = new Client { Name = "Sysco Corporation", IsActive = true };
        var spot = new Client { Name = "Spot Market", IsActive = true };
        db.Clients.AddRange(pfg, sch, sys, spot);
        await db.SaveChangesAsync(ct);

        // ── 2. Lanes ─────────────────────────────────────────────────────────
        var laneChiDal = new Lane { Client = pfg,  OriginCity = "Chicago",  OriginState = "IL", DestinationCity = "Dallas",    DestinationState = "TX", Mode = "TL" };
        var laneMemAtl = new Lane { Client = spot, OriginCity = "Memphis",  OriginState = "TN", DestinationCity = "Atlanta",   DestinationState = "GA", Mode = "TL" };
        var laneDalPhx = new Lane { Client = sch,  OriginCity = "Dallas",   OriginState = "TX", DestinationCity = "Phoenix",   DestinationState = "AZ", Mode = "TL" };
        var laneAtlClt = new Lane { Client = spot, OriginCity = "Atlanta",  OriginState = "GA", DestinationCity = "Charlotte", DestinationState = "NC", Mode = "TL" };
        var laneLarHou = new Lane { Client = spot, OriginCity = "Laredo",   OriginState = "TX", DestinationCity = "Houston",   DestinationState = "TX", Mode = "TL" };
        var laneHouMia = new Lane { Client = sys,  OriginCity = "Houston",  OriginState = "TX", DestinationCity = "Miami",     DestinationState = "FL", Mode = "TL" };
        db.Lanes.AddRange(laneChiDal, laneMemAtl, laneDalPhx, laneAtlClt, laneLarHou, laneHouMia);
        await db.SaveChangesAsync(ct);

        // ── 3. Reference dates (week of Apr 20–26, 2026) ─────────────────────
        var today = new DateTimeOffset(2026, 4, 23, 0, 0, 0, TimeSpan.Zero);

        // ── 4. Loads ─────────────────────────────────────────────────────────
        var ld1041 = new Load { Lane = laneChiDal, ReferenceNumber = "LD-1041", PickupDate = today.AddHours(8).AddMinutes(14),  DeliveryDate = today.AddDays(1), CarrierCost = 2100m, TargetRate = 2600m, BookedRate = 2600m, Status = "Accepted",  IsAutoBooked = true,  CreatedAt = today.AddHours(8).AddMinutes(14) };
        var ld1042 = new Load { Lane = laneMemAtl, ReferenceNumber = "LD-1042", PickupDate = today.AddHours(8).AddMinutes(21),  DeliveryDate = today.AddDays(1), CarrierCost = 1850m, TargetRate = 2300m, BookedRate = 2300m, Status = "Accepted",  IsAutoBooked = true,  CreatedAt = today.AddHours(8).AddMinutes(21) };
        var ld1043 = new Load { Lane = laneDalPhx, ReferenceNumber = "LD-1043", PickupDate = today.AddHours(8).AddMinutes(33),  DeliveryDate = today.AddDays(2), CarrierCost = 2400m, TargetRate = 2550m, BookedRate = null,   Status = "Pending",   IsAutoBooked = false, CreatedAt = today.AddHours(8).AddMinutes(33) };
        var ld1044 = new Load { Lane = laneAtlClt, ReferenceNumber = "LD-1044", PickupDate = today.AddHours(8).AddMinutes(45),  DeliveryDate = today.AddDays(1), CarrierCost = 1600m, TargetRate = 2100m, BookedRate = 2100m, Status = "Accepted",  IsAutoBooked = true,  CreatedAt = today.AddHours(8).AddMinutes(45) };
        var ld1045 = new Load { Lane = laneLarHou, ReferenceNumber = "LD-1045", PickupDate = today.AddHours(8).AddMinutes(58),  DeliveryDate = today.AddDays(1), CarrierCost = 1900m, TargetRate = 2200m, BookedRate = null,   Status = "Rejected",  IsAutoBooked = false, CreatedAt = today.AddHours(8).AddMinutes(58) };
        var ld1046 = new Load { Lane = laneChiDal, ReferenceNumber = "LD-1046", PickupDate = today.AddHours(9).AddMinutes(2),   DeliveryDate = today.AddDays(1), CarrierCost = 2050m, TargetRate = 2600m, BookedRate = null,   Status = "Pending",   IsAutoBooked = false, CreatedAt = today.AddHours(9).AddMinutes(2) };
        var ld1047 = new Load { Lane = laneHouMia, ReferenceNumber = "LD-1047", PickupDate = today.AddHours(9).AddMinutes(11),  DeliveryDate = today.AddDays(2), CarrierCost = 3100m, TargetRate = 3800m, BookedRate = null,   Status = "Pending",   IsAutoBooked = false, CreatedAt = today.AddHours(9).AddMinutes(11) };
        var ld1048 = new Load { Lane = laneMemAtl, ReferenceNumber = "LD-1048", PickupDate = today.AddHours(9).AddMinutes(19),  DeliveryDate = today.AddDays(1), CarrierCost = 1750m, TargetRate = 2250m, BookedRate = null,   Status = "Pending",   IsAutoBooked = false, CreatedAt = today.AddHours(9).AddMinutes(19) };
        db.Loads.AddRange(ld1041, ld1042, ld1043, ld1044, ld1045, ld1046, ld1047, ld1048);
        await db.SaveChangesAsync(ct);

        // ── 5. Decisions ─────────────────────────────────────────────────────
        db.Decisions.AddRange(
            new Decision { Load = ld1041, Action = "Accept", Reason = "AUTO-ACCEPT: margin 19.2% above floor", IsAutomatic = true,  CreatedAt = ld1041.CreatedAt },
            new Decision { Load = ld1042, Action = "Accept", Reason = "AUTO-ACCEPT: margin 19.6% above floor", IsAutomatic = true,  CreatedAt = ld1042.CreatedAt },
            new Decision { Load = ld1044, Action = "Accept", Reason = "CONTRACT-BOOK: contract lane obligation",IsAutomatic = true,  CreatedAt = ld1044.CreatedAt },
            new Decision { Load = ld1045, Action = "Reject", Reason = "REJECT: margin 13.6% below spot floor",  IsAutomatic = true,  CreatedAt = ld1045.CreatedAt }
        );
        await db.SaveChangesAsync(ct);

        // ── 6. Default decision parameters ───────────────────────────────────
        const string paramKey = "DecisionParameters";
        if (!await db.SystemSettings.AnyAsync(s => s.Key == paramKey, ct))
        {
            var defaults = new DecisionParameters();
            db.SystemSettings.Add(new SystemSetting
            {
                Key = paramKey,
                Value = JsonSerializer.Serialize(defaults),
                UpdatedAt = DateTimeOffset.UtcNow,
            });
            await db.SaveChangesAsync(ct);
        }
    }
}

