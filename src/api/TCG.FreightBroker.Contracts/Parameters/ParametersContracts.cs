namespace TCG.FreightBroker.Contracts.Parameters;

/// <summary>The full set of tunable decision-engine thresholds, mirroring <c>DecisionParameters</c>.</summary>
public record ParametersDto(
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

public record UpdateParametersRequest(
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
