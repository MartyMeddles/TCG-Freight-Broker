namespace TCG.FreightBroker.Application.Integrations;

/// <summary>
/// Represents a spot-rate quote returned by the DAT freight marketplace.
/// </summary>
/// <param name="Origin">City, State the load originates from.</param>
/// <param name="Destination">City, State the load delivers to.</param>
/// <param name="SpotRate">DAT benchmark spot rate in USD.</param>
/// <param name="Source">Which underlying source provided the quote (stub or live).</param>
/// <param name="RetrievedAt">UTC timestamp when the quote was fetched.</param>
public record DatSpotRate(
    string Origin,
    string Destination,
    decimal SpotRate,
    string Source,
    DateTimeOffset RetrievedAt);

/// <summary>
/// Retrieves spot-rate benchmarks from the DAT freight marketplace.
/// </summary>
public interface IDatRateService
{
    /// <summary>
    /// Returns the current DAT spot-rate benchmark for the given origin/destination pair.
    /// Implementations may call the real DAT API or return a stub value.
    /// </summary>
    Task<DatSpotRate> GetSpotRateAsync(
        string origin,
        string destination,
        CancellationToken cancellationToken = default);
}
