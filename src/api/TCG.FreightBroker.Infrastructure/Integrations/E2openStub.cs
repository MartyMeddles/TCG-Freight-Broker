using Microsoft.Extensions.Logging;
using TCG.FreightBroker.Application.Integrations;

namespace TCG.FreightBroker.Infrastructure.Integrations;

/// <summary>
/// Stub implementation of <see cref="IE2openService"/> that simulates
/// tendering loads to e2open without making real API calls.
/// Replace with an HTTP client backed by real e2open credentials when ready.
/// </summary>
public sealed partial class E2openStub : IE2openService
{
    private readonly ILogger<E2openStub> _logger;
    private static readonly Random _rng = new();

    [LoggerMessage(Level = LogLevel.Information,
        Message = "[E2OPEN-STUB] LoadId={LoadId} Ref={Ref} Success={Success} ExternalId={ExternalId}")]
    private static partial void LogPush(ILogger logger, int loadId, string @ref, bool success, string? externalId);

    public E2openStub(ILogger<E2openStub> logger) => _logger = logger;

    public async Task<E2openPushResult> PushLoadAsync(
        int loadId,
        string referenceNumber,
        string origin,
        string destination,
        decimal bookedRate,
        DateTimeOffset pickupDate,
        CancellationToken cancellationToken = default)
    {
        // Simulate a realistic network round-trip (50-250 ms).
        await Task.Delay(TimeSpan.FromMilliseconds(_rng.Next(50, 250)), cancellationToken);

        // 95 % success rate stub — surfaces retry paths without being annoying.
        bool success = _rng.NextDouble() < 0.95;

        string externalId = success ? $"E2O-{DateTime.UtcNow:yyyyMMdd}-{_rng.Next(10_000, 99_999)}" : string.Empty;
        string message = success
            ? $"Load {referenceNumber} tendered to e2open. Order ID: {externalId}"
            : $"e2open rejected load {referenceNumber}: simulated gateway timeout";

        LogPush(_logger, loadId, referenceNumber, success, success ? externalId : null);

        return new E2openPushResult(
            Success: success,
            ExternalId: success ? externalId : null,
            Message: message,
            SentAt: DateTimeOffset.UtcNow);
    }
}
