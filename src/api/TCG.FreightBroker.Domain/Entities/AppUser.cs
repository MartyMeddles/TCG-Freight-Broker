namespace TCG.FreightBroker.Domain.Entities;

public class AppUser
{
    public Guid Id { get; set; }
    public string DisplayName { get; set; } = string.Empty;
    public string Role { get; set; } = "Viewer"; // Admin, Manager, Viewer
    public bool IsActive { get; set; } = true;
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
}
