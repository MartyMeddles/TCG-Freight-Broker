namespace TCG.FreightBroker.Domain.Entities;

public class Decision
{
    public int Id { get; set; }
    public int LoadId { get; set; }
    public string Action { get; set; } = string.Empty; // Accept, Reject, Hold
    public string Reason { get; set; } = string.Empty;
    public bool IsAutomatic { get; set; }
    public Guid? UserId { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;

    public Load Load { get; set; } = null!;
}
