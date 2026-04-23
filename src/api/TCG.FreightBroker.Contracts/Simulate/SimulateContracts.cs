namespace TCG.FreightBroker.Contracts.Simulate;

/// <summary>Input for a single manual-tester evaluation.</summary>
public record SimulateEvaluateRequest(
    string Lane,
    decimal CarrierCost,
    decimal CustomerRate,
    decimal SpotRate,
    decimal ContractRate,
    bool IsContract,
    int? WeeklyMinimum,
    int CurrentWeekBookings,
    int TotalUnmetContractLoads,
    int DaysRemaining,
    string? ClientCode,
    bool NeedsInsurance,
    /// <summary>When null, the engine uses the parameters currently stored in the DB.</summary>
    ParameterOverride? Parameters = null);

public record ParameterOverride(
    decimal CtrGPFloor,
    decimal CtrMarginFloor,
    decimal CtrMarginNormal,
    decimal SpotMarginFloor,
    decimal DatTolerance,
    bool CtrOverrideProfit,
    bool CtrOverrideMargin,
    int SpotBlockThreshold,
    int UrgencyDays,
    int UrgencyLoads);

public record SimulateRuleResult(
    string RuleName,
    string Status,
    string Description,
    int Weight);

public record SimulateEvaluateResponse(
    bool Pass,
    string Recommendation,
    int Score,
    bool ContractNeed,
    bool GpBlocked,
    decimal ContractGP,
    decimal GpFloor,
    IReadOnlyList<SimulateRuleResult> Rules);
