namespace TCG.FreightBroker.Application.DecisionEngine;

/// <summary>All financial and lane data the evaluator needs to score a load.</summary>
public record LoadInput
{
    public string Lane { get; init; } = string.Empty;

    /// <summary>What we pay the carrier ("our" cost in the prototype).</summary>
    public decimal CarrierCost { get; init; }

    /// <summary>What the customer pays us.</summary>
    public decimal CustomerRate { get; init; }

    /// <summary>CustomerRate − CarrierCost.</summary>
    public decimal Profit { get; init; }

    /// <summary>Profit / CustomerRate × 100.</summary>
    public decimal Margin { get; init; }

    /// <summary>DAT spot benchmark for this lane.</summary>
    public decimal SpotRate { get; init; }

    /// <summary>Contract rate for this lane (ctrRate in the prototype).</summary>
    public decimal ContractRate { get; init; }

    /// <summary>(ContractRate − CarrierCost) / ContractRate × 100.</summary>
    public decimal ContractGP { get; init; }

    /// <summary>True if this is a contract-lane load; false for spot.</summary>
    public bool IsContract { get; init; }

    /// <summary>Required weekly minimum bookings for this lane (null for spot).</summary>
    public int? WeeklyMinimum { get; init; }

    /// <summary>Client code linked to this lane (null if unassigned).</summary>
    public string? ClientCode { get; init; }

    /// <summary>
    /// Set to true for cross-border lanes that require cargo insurance.
    /// Causes an Insurance FAIL rule that blocks auto-accept on non-critical lanes.
    /// </summary>
    public bool NeedsInsurance { get; init; }
}
