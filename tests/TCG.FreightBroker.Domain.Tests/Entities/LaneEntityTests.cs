namespace TCG.FreightBroker.Domain.Tests.Entities;

public class LaneEntityTests
{
    [Fact]
    public void DefaultMode_IsTL()
    {
        var lane = new Lane();
        lane.Mode.Should().Be("TL");
    }

    [Fact]
    public void DefaultIsActive_IsTrue()
    {
        var lane = new Lane();
        lane.IsActive.Should().BeTrue();
    }

    [Fact]
    public void DefaultLoads_IsEmpty()
    {
        var lane = new Lane();
        lane.Loads.Should().BeEmpty();
    }

    [Fact]
    public void DefaultCreatedAt_IsApproximatelyUtcNow()
    {
        var before = DateTimeOffset.UtcNow.AddSeconds(-1);
        var lane = new Lane();
        var after = DateTimeOffset.UtcNow.AddSeconds(1);

        lane.CreatedAt.Should().BeAfter(before).And.BeBefore(after);
    }

    [Fact]
    public void DefaultOriginCity_IsEmpty()
    {
        var lane = new Lane();
        lane.OriginCity.Should().Be(string.Empty);
        lane.OriginState.Should().Be(string.Empty);
        lane.DestinationCity.Should().Be(string.Empty);
        lane.DestinationState.Should().Be(string.Empty);
    }
}
