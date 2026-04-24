using Microsoft.EntityFrameworkCore;
using TCG.FreightBroker.Application.DecisionEngine;
using TCG.FreightBroker.Application.Integrations;
using TCG.FreightBroker.Domain.Entities;
using TCG.FreightBroker.Infrastructure.Persistence;

namespace TCG.FreightBroker.Infrastructure.LoadPipeline;

/// <summary>
/// Generates a random, realistic load on one of the active lanes using
/// market-rate simulation. Returns both the <see cref="Load"/> entity
/// (unsaved) and the <see cref="LoadInput"/> needed by the decision engine.
/// </summary>
public sealed class LoadGenerator
{
    private static int _sequence;
    private static bool _seeded;

    /// <summary>
    /// Picks a random active lane and synthesises financial data.
    /// Returns <c>null</c> when no active lanes exist in the database.
    /// </summary>
    public static async Task<(Load Load, LoadInput Input, ClientConfig? ClientCfg)?> GenerateAsync(
        AppDbContext db,
        Random rng,
        IDatRateService datService,
        CancellationToken ct = default)
    {
        // Seed the sequence counter from the DB max on first call after restart,
        // so reference numbers never collide with existing rows.
        if (!_seeded)
        {
            var maxRef = await db.Loads
                .AsNoTracking()
                .Where(l => l.ReferenceNumber.StartsWith("LD-"))
                .Select(l => l.ReferenceNumber)
                .OrderByDescending(l => l)
                .FirstOrDefaultAsync(ct);

            if (maxRef is not null && int.TryParse(maxRef.AsSpan(3), out int maxNum))
                _sequence = maxNum - 1000;

            _seeded = true;
        }

        // Load active lanes, eager-load their client (null for spot lanes)
        var lanes = await db.Lanes
            .AsNoTracking()
            .Where(l => l.IsActive)
            .Include(l => l.Client)
            .ToListAsync(ct);

        if (lanes.Count == 0)
            return null;

        var lane = lanes[rng.Next(lanes.Count)];

        // ── Financial simulation ────────────────────────────────────────────
        // Base represents current DAT spot benchmark for this lane
        string origin = $"{lane.OriginCity}, {lane.OriginState}";
        string destination = $"{lane.DestinationCity}, {lane.DestinationState}";
        var datQuote = await datService.GetSpotRateAsync(origin, destination, ct);
        decimal spotRate = datQuote.SpotRate;
        decimal carrierCost = Math.Round(spotRate * rng.NextDecimal(0.78m, 0.96m), 2);
        bool isContract = lane.Client is not null;

        // Contract lanes: customer rate is a fixed contract negotiated against spot.
        // The contract rate is sometimes above, sometimes below current spot — 
        // modelling real-world scenarios where spot moves against the contract.
        // Range: 0.88–1.10 of spot → can produce thin or negative GP.
        decimal contractRate = isContract
            ? Math.Round(spotRate * rng.NextDecimal(0.88m, 1.10m), 2)
            : 0m;

        // Spot lanes: customer rate tracks spot closely with a small brokerage spread.
        // Range: 0.98–1.08 of spot → typically thin positive GP.
        decimal customerRate = isContract
            ? contractRate
            : Math.Round(spotRate * rng.NextDecimal(0.98m, 1.08m), 2);

        decimal profit = customerRate - carrierCost;
        decimal margin = customerRate > 0 ? Math.Round(profit / customerRate * 100m, 2) : 0m;
        decimal contractGP = contractRate > 0
            ? Math.Round((contractRate - carrierCost) / contractRate * 100m, 2)
            : 0m;

        int? weeklyMin = isContract ? rng.Next(3, 11) : null;

        // ── Build Load entity ───────────────────────────────────────────────
        int seq = Interlocked.Increment(ref _sequence);
        var pickup = DateTimeOffset.UtcNow.AddDays(rng.Next(1, 6));
        var delivery = pickup.AddDays(rng.Next(1, 4));

        var load = new Load
        {
            LaneId = lane.Id,
            ReferenceNumber = $"LD-{seq + 1000:D4}",
            PickupDate = pickup,
            DeliveryDate = delivery,
            CarrierCost = carrierCost,
            TargetRate = customerRate,
            Status = "Pending",
            IsAutoBooked = false,
            CreatedAt = DateTimeOffset.UtcNow,
        };

        // ── Build LoadInput for evaluator ───────────────────────────────────
        var input = new LoadInput
        {
            Lane = $"{origin} → {destination}",
            CarrierCost = carrierCost,
            CustomerRate = customerRate,
            Profit = profit,
            Margin = margin,
            SpotRate = spotRate,
            ContractRate = contractRate,
            ContractGP = contractGP,
            IsContract = isContract,
            WeeklyMinimum = weeklyMin,
            ClientCode = lane.Client?.Name.Split(' ')[0].ToUpperInvariant(),
            NeedsInsurance = lane.OriginState == "TX" && lane.DestinationState != "TX",
        };

        // ── Build ClientConfig from the Client entity ───────────────────────
        ClientConfig? clientCfg = lane.Client is null ? null : new ClientConfig
        {
            Code = input.ClientCode ?? lane.Client.Name[..Math.Min(3, lane.Client.Name.Length)].ToUpperInvariant(),
            Name = lane.Client.Name,
            GpTarget = 12m,     // Default GP target; could be stored per client later
            AutoAccept = true,
        };

        return (load, input, clientCfg);
    }
}

/// <summary>Extension helpers for <see cref="Random"/> to generate decimals.</summary>
internal static class RandomExtensions
{
    internal static decimal NextDecimal(this Random rng, decimal min, decimal max)
        => min + (decimal)rng.NextDouble() * (max - min);
}
