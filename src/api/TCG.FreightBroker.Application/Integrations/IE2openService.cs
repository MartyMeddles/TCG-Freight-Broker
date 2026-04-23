namespace TCG.FreightBroker.Application.Integrations;

/// <summary>Outcome of pushing a load tender to the e2open TMS.</summary>
/// <param name="Success">Whether the push was accepted by e2open.</param>
/// <param name="ExternalId">Confirmation / order ID returned by e2open, if any.</param>
/// <param name="Message">Human-readable outcome message.</param>
/// <param name="SentAt">UTC timestamp when the push was attempted.</param>
public record E2openPushResult(
    bool Success,
    string? ExternalId,
    string Message,
    DateTimeOffset SentAt);

/// <summary>
/// Sends accepted load tenders to the e2open transportation management platform.
/// </summary>
public interface IE2openService
{
    /// <summary>
    /// Pushes a booked load to e2open for carrier tendering.
    /// </summary>
    /// <param name="loadId">Internal database ID of the load.</param>
    /// <param name="referenceNumber">Human-readable reference (e.g. LD-1001).</param>
    /// <param name="origin">Origin city/state string.</param>
    /// <param name="destination">Destination city/state string.</param>
    /// <param name="bookedRate">Rate confirmed with the carrier, in USD.</param>
    /// <param name="pickupDate">Scheduled pickup date/time (UTC).</param>
    /// <param name="cancellationToken"></param>
    Task<E2openPushResult> PushLoadAsync(
        int loadId,
        string referenceNumber,
        string origin,
        string destination,
        decimal bookedRate,
        DateTimeOffset pickupDate,
        CancellationToken cancellationToken = default);
}
