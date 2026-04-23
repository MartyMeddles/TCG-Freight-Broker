namespace TCG.FreightBroker.Infrastructure.Tests.Auth;

public class PinHasherTests
{
    private readonly PinHasher _sut = new();

    [Fact]
    public void Hash_ProducesNonEmptyResult()
    {
        var result = _sut.Hash("1234");

        result.Should().NotBeNullOrEmpty();
    }

    [Fact]
    public void Hash_ContainsDotSeparator()
    {
        var result = _sut.Hash("1234");

        result.Should().Contain(".");
    }

    [Fact]
    public void Verify_WithCorrectPin_ReturnsTrue()
    {
        const string pin = "5678";
        var hashed = _sut.Hash(pin);

        var result = _sut.Verify(pin, hashed);

        result.Should().BeTrue();
    }

    [Fact]
    public void Verify_WithWrongPin_ReturnsFalse()
    {
        var hashed = _sut.Hash("1234");

        var result = _sut.Verify("9999", hashed);

        result.Should().BeFalse();
    }

    [Fact]
    public void Verify_WithMalformedHash_ReturnsFalse()
    {
        var result = _sut.Verify("1234", "not-a-valid-hash");

        result.Should().BeFalse();
    }

    [Fact]
    public void Verify_WithEmptyHash_ReturnsFalse()
    {
        var result = _sut.Verify("1234", string.Empty);

        result.Should().BeFalse();
    }

    [Fact]
    public void Hash_SamePinTwice_ProducesDifferentHashes()
    {
        const string pin = "1234";
        var hash1 = _sut.Hash(pin);
        var hash2 = _sut.Hash(pin);

        // Each hash uses a unique random salt so they must differ
        hash1.Should().NotBe(hash2);
    }

    [Fact]
    public void Verify_FirstHashStillValid_AfterSecondHashGenerated()
    {
        const string pin = "1234";
        var hash1 = _sut.Hash(pin);
        _ = _sut.Hash(pin); // generate a second hash (different salt)

        _sut.Verify(pin, hash1).Should().BeTrue();
    }
}
