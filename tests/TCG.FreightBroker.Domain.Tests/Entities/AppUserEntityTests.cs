namespace TCG.FreightBroker.Domain.Tests.Entities;

public class AppUserEntityTests
{
    [Fact]
    public void DefaultRole_IsViewer()
    {
        var user = new AppUser();
        user.Role.Should().Be("Viewer");
    }

    [Fact]
    public void DefaultIsActive_IsTrue()
    {
        var user = new AppUser();
        user.IsActive.Should().BeTrue();
    }

    [Fact]
    public void DefaultMustChangePin_IsFalse()
    {
        var user = new AppUser();
        user.MustChangePin.Should().BeFalse();
    }

    [Fact]
    public void DefaultLastLoginAt_IsNull()
    {
        var user = new AppUser();
        user.LastLoginAt.Should().BeNull();
    }

    [Fact]
    public void DefaultCreatedAt_IsApproximatelyUtcNow()
    {
        var before = DateTimeOffset.UtcNow.AddSeconds(-1);
        var user = new AppUser();
        var after = DateTimeOffset.UtcNow.AddSeconds(1);

        user.CreatedAt.Should().BeAfter(before).And.BeBefore(after);
    }

    [Fact]
    public void DefaultId_IsEmpty()
    {
        var user = new AppUser();
        user.Id.Should().Be(Guid.Empty);
    }
}
