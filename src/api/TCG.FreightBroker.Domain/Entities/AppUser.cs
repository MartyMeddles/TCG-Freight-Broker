namespace TCG.FreightBroker.Domain.Entities;

public class AppUser
{
    public Guid Id { get; set; }
    public string Username { get; set; } = string.Empty;
    public string PinHash { get; set; } = string.Empty; // PBKDF2-HMACSHA512 hash
    public string DisplayName { get; set; } = string.Empty;
    public string Role { get; set; } = "Viewer"; // Admin, Manager, Viewer
    public bool IsActive { get; set; } = true;
    /// <summary>When true the user must set a new PIN on their next login.</summary>
    public bool MustChangePin { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset? LastLoginAt { get; set; }
}
