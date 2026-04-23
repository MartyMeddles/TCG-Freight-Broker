namespace TCG.FreightBroker.Application.Integrations;

/// <summary>Health status of a single external integration.</summary>
/// <param name="Name">Short integration name (e.g. "DAT", "e2open", "IMAP").</param>
/// <param name="IsStub">True when running against a stub/simulated implementation.</param>
/// <param name="IsHealthy">Whether the integration is reachable / operational.</param>
/// <param name="StatusMessage">Human-readable status detail.</param>
/// <param name="CheckedAt">UTC timestamp of the most recent health check.</param>
public record IntegrationHealth(
    string Name,
    bool IsStub,
    bool IsHealthy,
    string StatusMessage,
    DateTimeOffset CheckedAt);
