namespace TCG.FreightBroker.Application.DecisionEngine;

/// <summary>Per-client decision policy used by the evaluator.</summary>
public record ClientConfig
{
    public string Code { get; init; } = string.Empty;
    public string Name { get; init; } = string.Empty;

    /// <summary>Client-specific GP floor % that overrides the global CtrGPFloor.</summary>
    public decimal GpTarget { get; init; }

    /// <summary>When false, engine always returns Review regardless of other rules.</summary>
    public bool AutoAccept { get; init; } = true;
}
