namespace TCG.FreightBroker.Contracts.Common;

public record AuditLogDto(
    int Id,
    string Action,
    int? EntityId,
    string? EntityType,
    string Username,
    string? Details,
    DateTimeOffset CreatedAt);
