namespace TCG.FreightBroker.Contracts.Loads;

public record LoadDto(
    int Id,
    int LaneId,
    string ReferenceNumber,
    DateTimeOffset PickupDate,
    DateTimeOffset DeliveryDate,
    decimal CarrierCost,
    decimal TargetRate,
    decimal? BookedRate,
    string Status,
    bool IsAutoBooked,
    string? AiRecommendation,
    DateTimeOffset CreatedAt,
    string LaneName,
    string? ClientName);

public record CreateLoadRequest(
    int LaneId,
    string ReferenceNumber,
    DateTimeOffset PickupDate,
    DateTimeOffset DeliveryDate,
    decimal TargetRate);

public record UpdateLoadStatusRequest(string Status, decimal? BookedRate);
