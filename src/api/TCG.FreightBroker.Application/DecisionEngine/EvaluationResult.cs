namespace TCG.FreightBroker.Application.DecisionEngine;

/// <summary>Full output of the AI evaluation for a single load.</summary>
public class EvaluationResult
{
    /// <summary>True only when all hard rules pass and there is no GP block or client hold.</summary>
    public bool Pass { get; init; }

    public IReadOnlyList<RuleResult> Rules { get; init; } = [];

    public Recommendation Recommendation { get; init; }

    /// <summary>Sum of all rule weights — higher is better.</summary>
    public int Score { get; init; }

    /// <summary>True when the load is needed to meet a contract obligation this week.</summary>
    public bool ContractNeed { get; init; }

    /// <summary>True when the contract-rate GP is below the floor; blocks auto-accept.</summary>
    public bool GpBlocked { get; init; }

    public decimal ContractGP { get; init; }

    public string? ClientCode { get; init; }

    /// <summary>The effective GP floor used (client-specific or global).</summary>
    public decimal GpFloor { get; init; }
}
