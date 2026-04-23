namespace TCG.FreightBroker.Domain.Entities;

/// <summary>
/// Single-row key/value store for system-wide settings (e.g. serialised DecisionParameters).
/// </summary>
public class SystemSetting
{
    public int Id { get; set; }

    /// <summary>Unique setting name, e.g. "DecisionParameters".</summary>
    public string Key { get; set; } = string.Empty;

    /// <summary>JSON-encoded value.</summary>
    public string Value { get; set; } = string.Empty;

    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;
}
