namespace TCG.FreightBroker.Domain.Entities;

public class IntegrationConfig
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;        // e.g. "Samsara TMS"
    public string Type { get; set; } = string.Empty;        // REST, Webhook, SFTP, EDI, Email
    public string BaseUrl { get; set; } = string.Empty;     // e.g. "https://api.samsara.com"
    public string? ApiKey { get; set; }                     // stored masked after save
    public string? Notes { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
}
