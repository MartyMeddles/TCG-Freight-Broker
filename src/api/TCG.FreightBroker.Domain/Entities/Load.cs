namespace TCG.FreightBroker.Domain.Entities;

public class Load
{
    public int Id { get; set; }
    public int LaneId { get; set; }
    public string ReferenceNumber { get; set; } = string.Empty;
    public DateTimeOffset PickupDate { get; set; }
    public DateTimeOffset DeliveryDate { get; set; }
    public decimal CarrierCost { get; set; }
    public decimal TargetRate { get; set; }
    public decimal? BookedRate { get; set; }
    public string Status { get; set; } = "Pending"; // Pending, Accepted, Rejected, Booked
    public bool IsAutoBooked { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;

    public Lane Lane { get; set; } = null!;
    public ICollection<Decision> Decisions { get; set; } = [];
}
