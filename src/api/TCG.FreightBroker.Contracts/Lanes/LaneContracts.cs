namespace TCG.FreightBroker.Contracts.Lanes;

public record LaneDto(
    int Id,
    int ClientId,
    string ClientName,
    string OriginCity,
    string OriginState,
    string DestinationCity,
    string DestinationState,
    string Mode,
    bool IsActive,
    DateTimeOffset CreatedAt);

public record CreateLaneRequest(
    int ClientId,
    string OriginCity,
    string OriginState,
    string DestinationCity,
    string DestinationState,
    string Mode);

public record UpdateLaneRequest(
    string OriginCity,
    string OriginState,
    string DestinationCity,
    string DestinationState,
    string Mode,
    bool IsActive);
