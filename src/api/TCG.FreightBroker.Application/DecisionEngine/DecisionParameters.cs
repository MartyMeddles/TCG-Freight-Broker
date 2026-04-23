namespace TCG.FreightBroker.Application.DecisionEngine;

/// <summary>
/// Tunable thresholds that govern the AI decision engine.
/// Defaults mirror the values shipped in the prototype workbench (P object).
/// </summary>
public class DecisionParameters
{
    /// <summary>Minimum contract-rate gross-profit % (global; overridden per client).</summary>
    public decimal CtrGPFloor { get; set; } = 10m;

    /// <summary>Minimum margin % accepted on a contract lane when an obligation deficit exists.</summary>
    public decimal CtrMarginFloor { get; set; } = 5m;

    /// <summary>Minimum margin % accepted on a normal (met) contract lane.</summary>
    public decimal CtrMarginNormal { get; set; } = 8m;

    /// <summary>Minimum margin % required on a spot load.</summary>
    public decimal SpotMarginFloor { get; set; } = 14m;

    /// <summary>How many % above the DAT spot benchmark the carrier cost may be.</summary>
    public decimal DatTolerance { get; set; } = 5m;

    /// <summary>Allow negative profit on contract lanes that need bookings.</summary>
    public bool CtrOverrideProfit { get; set; } = true;

    /// <summary>Allow sub-floor margin on contract lanes that need bookings.</summary>
    public bool CtrOverrideMargin { get; set; } = true;

    /// <summary>Total unmet contract loads above which spot loads are held.</summary>
    public int SpotBlockThreshold { get; set; } = 20;

    /// <summary>Days-remaining threshold that triggers the urgency escalation rule.</summary>
    public int UrgencyDays { get; set; } = 2;

    /// <summary>Remaining loads required on an urgent lane to fire the CRITICAL rule.</summary>
    public int UrgencyLoads { get; set; } = 5;
}
