using Microsoft.Extensions.Logging;
using TCG.FreightBroker.Application.Integrations;

namespace TCG.FreightBroker.Infrastructure.Integrations;

/// <summary>
/// Stub implementation of <see cref="IDatRateService"/> that returns
/// plausible simulated spot rates without calling the real DAT API.
/// Replace with a real HTTP client when DAT credentials are available.
/// </summary>
public sealed partial class DatRateStub : IDatRateService
{
    private readonly ILogger<DatRateStub> _logger;
    private static readonly Random _rng = new();

    // Rough base rates per mile band — gives geographic plausibility.
    private static readonly Dictionary<string, decimal> _laneBaselines = new(StringComparer.OrdinalIgnoreCase)
    {
        ["Chicago"]    = 2_450m,
        ["Dallas"]     = 2_100m,
        ["Los Angeles"] = 3_100m,
        ["Atlanta"]    = 1_900m,
        ["Newark"]     = 2_700m,
        ["Houston"]    = 1_950m,
        ["Seattle"]    = 2_800m,
        ["Denver"]     = 2_300m,
    };

    private const decimal DefaultBase = 2_200m;

    [LoggerMessage(Level = LogLevel.Debug, Message = "[DAT-STUB] Spot rate {Origin} → {Destination}: ${SpotRate}")]
    private static partial void LogSpotRate(ILogger logger, string origin, string destination, decimal spotRate);

    public DatRateStub(ILogger<DatRateStub> logger) => _logger = logger;

    public Task<DatSpotRate> GetSpotRateAsync(
        string origin,
        string destination,
        CancellationToken cancellationToken = default)
    {
        decimal baseRate = GuessBase(origin, destination);

        // Simulate market variance ± 12 %
        decimal variance = baseRate * (decimal)(_rng.NextDouble() * 0.24 - 0.12);
        decimal spotRate = Math.Round(baseRate + variance, 2);

        LogSpotRate(_logger, origin, destination, spotRate);

        return Task.FromResult(new DatSpotRate(
            Origin: origin,
            Destination: destination,
            SpotRate: spotRate,
            Source: "DAT-Stub",
            RetrievedAt: DateTimeOffset.UtcNow));
    }

    private static decimal GuessBase(string origin, string destination)
    {
        // Average the known baselines for origin and destination cities, or use default.
        string? oCity = _laneBaselines.Keys.FirstOrDefault(k => origin.Contains(k, StringComparison.OrdinalIgnoreCase));
        string? dCity = _laneBaselines.Keys.FirstOrDefault(k => destination.Contains(k, StringComparison.OrdinalIgnoreCase));

        decimal oBase = oCity is not null ? _laneBaselines[oCity] : DefaultBase;
        decimal dBase = dCity is not null ? _laneBaselines[dCity] : DefaultBase;

        return (oBase + dBase) / 2m;
    }
}
