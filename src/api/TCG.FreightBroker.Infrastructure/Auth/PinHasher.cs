using Microsoft.AspNetCore.Cryptography.KeyDerivation;
using System.Security.Cryptography;

namespace TCG.FreightBroker.Infrastructure.Auth;

public interface IPinHasher
{
    string Hash(string pin);
    bool Verify(string pin, string hashedPin);
}

public sealed class PinHasher : IPinHasher
{
    private const int SaltSize = 16;
    private const int HashSize = 32;
    private const int Iterations = 100_000;

    public string Hash(string pin)
    {
        var salt = RandomNumberGenerator.GetBytes(SaltSize);
        var hash = KeyDerivation.Pbkdf2(pin, salt, KeyDerivationPrf.HMACSHA512, Iterations, HashSize);
        return $"{Convert.ToBase64String(salt)}.{Convert.ToBase64String(hash)}";
    }

    public bool Verify(string pin, string hashedPin)
    {
        var parts = hashedPin.Split('.');
        if (parts.Length != 2) return false;

        byte[] salt;
        byte[] expectedHash;
        try
        {
            salt = Convert.FromBase64String(parts[0]);
            expectedHash = Convert.FromBase64String(parts[1]);
        }
        catch (FormatException)
        {
            return false;
        }

        var actualHash = KeyDerivation.Pbkdf2(pin, salt, KeyDerivationPrf.HMACSHA512, Iterations, HashSize);
        return CryptographicOperations.FixedTimeEquals(actualHash, expectedHash);
    }
}
