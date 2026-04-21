namespace TCG.FreightBroker.Domain.Entities;

public class Lane
{
    public int Id { get; set; }
    public int ClientId { get; set; }
    public string OriginCity { get; set; } = string.Empty;
    public string OriginState { get; set; } = string.Empty;
    public string DestinationCity { get; set; } = string.Empty;
    public string DestinationState { get; set; } = string.Empty;
    public string Mode { get; set; } = "TL"; // TL, LTL, Dray
    public bool IsActive { get; set; } = true;
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;

    public Client Client { get; set; } = null!;
    public ICollection<Load> Loads { get; set; } = [];
}
