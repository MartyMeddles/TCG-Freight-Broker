using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using TCG.FreightBroker.Domain.Entities;

namespace TCG.FreightBroker.Infrastructure.Auth;

public interface ITokenService
{
    (string Token, DateTimeOffset ExpiresAt) GenerateToken(AppUser user);
}

public sealed class TokenService : ITokenService
{
    private readonly IConfiguration _configuration;

    public TokenService(IConfiguration configuration)
    {
        _configuration = configuration;
    }

    public (string Token, DateTimeOffset ExpiresAt) GenerateToken(AppUser user)
    {
        var key = _configuration["Jwt__Key"] ?? _configuration["Jwt:Key"]
                  ?? throw new InvalidOperationException("JWT key not configured.");
        var issuer = _configuration["Jwt__Issuer"] ?? _configuration["Jwt:Issuer"];
        var audience = _configuration["Jwt__Audience"] ?? _configuration["Jwt:Audience"];
        var expiryMinutes = int.TryParse(
            _configuration["Jwt__ExpiryMinutes"] ?? _configuration["Jwt:ExpiryMinutes"],
            out var m) ? m : 60;

        var securityKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(key));
        var credentials = new SigningCredentials(securityKey, SecurityAlgorithms.HmacSha256);
        var expiresAt = DateTimeOffset.UtcNow.AddMinutes(expiryMinutes);

        var claims = new[]
        {
            new Claim(JwtRegisteredClaimNames.Sub, user.Id.ToString()),
            new Claim(JwtRegisteredClaimNames.UniqueName, user.Username),
            new Claim("displayName", user.DisplayName),
            new Claim(ClaimTypes.Role, user.Role),
            new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString()),
        };

        var token = new JwtSecurityToken(
            issuer,
            audience,
            claims,
            expires: expiresAt.UtcDateTime,
            signingCredentials: credentials);

        return (new JwtSecurityTokenHandler().WriteToken(token), expiresAt);
    }
}
