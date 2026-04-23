namespace TCG.FreightBroker.Domain.Tests.Entities;

public class LoadEntityTests
{
    [Fact]
    public void DefaultStatus_IsPending()
    {
        var load = new Load();
        load.Status.Should().Be("Pending");
    }

    [Fact]
    public void DefaultIsAutoBooked_IsFalse()
    {
        var load = new Load();
        load.IsAutoBooked.Should().BeFalse();
    }

    [Fact]
    public void DefaultReferenceNumber_IsEmpty()
    {
        var load = new Load();
        load.ReferenceNumber.Should().Be(string.Empty);
    }

    [Fact]
    public void DefaultCreatedAt_IsApproximatelyUtcNow()
    {
        var before = DateTimeOffset.UtcNow.AddSeconds(-1);
        var load = new Load();
        var after = DateTimeOffset.UtcNow.AddSeconds(1);

        load.CreatedAt.Should().BeAfter(before).And.BeBefore(after);
    }

    [Fact]
    public void DefaultBookedRate_IsNull()
    {
        var load = new Load();
        load.BookedRate.Should().BeNull();
    }

    [Fact]
    public void DefaultDecisions_IsEmpty()
    {
        var load = new Load();
        load.Decisions.Should().BeEmpty();
    }
}
