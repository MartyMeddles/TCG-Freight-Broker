namespace TCG.FreightBroker.Domain.Entities;

public class AuditLog
{
    public int Id { get; set; }
    public string Action { get; set; } = string.Empty;   // e.g. LOAD_ACCEPT, LOAD_REJECT
    public int? EntityId { get; set; }                    // e.g. Load.Id
    public string? EntityType { get; set; }               // e.g. "Load"
    public string Username { get; set; } = string.Empty;
    public string? Details { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
}
