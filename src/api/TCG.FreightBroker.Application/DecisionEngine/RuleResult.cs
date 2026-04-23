namespace TCG.FreightBroker.Application.DecisionEngine;

/// <summary>Outcome of a single decision rule.</summary>
public class RuleResult
{
    public string RuleName { get; init; } = string.Empty;

    /// <summary>"pass", "fail", or "warn".</summary>
    public string Status { get; init; } = string.Empty;

    public string Description { get; init; } = string.Empty;

    /// <summary>Positive = favourable, negative = unfavourable contribution to the overall score.</summary>
    public int Weight { get; init; }
}
