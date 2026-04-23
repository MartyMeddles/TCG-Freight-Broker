namespace TCG.FreightBroker.Contracts.Loads;

public record LoadDto(
    int Id,
    int LaneId,
    string ReferenceNumber,
    DateTimeOffset PickupDate,
    DateTimeOffset DeliveryDate,
    decimal TargetRate,
    decimal? BookedRate,
    string Status,
    bool IsAutoBooked,
    DateTimeOffset CreatedAt);

public record CreateLoadRequest(
    int LaneId,
    string ReferenceNumber,
    DateTimeOffset PickupDate,
    DateTimeOffset DeliveryDate,
    decimal TargetRate);

public record UpdateLoadStatusRequest(string Status, decimal? BookedRate);
