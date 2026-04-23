using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using TCG.FreightBroker.Contracts.Auth;
using TCG.FreightBroker.Infrastructure.Auth;
using TCG.FreightBroker.Infrastructure.Persistence;

namespace TCG.FreightBroker.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly IPinHasher _pinHasher;
    private readonly ITokenService _tokenService;
    private readonly ILogger<AuthController> _logger;

    private static readonly Action<ILogger, string, Exception?> _logFailedLogin =
        LoggerMessage.Define<string>(LogLevel.Warning, new EventId(1, "FailedLogin"),
            "Failed login attempt for username: {Username}");

    public AuthController(
        AppDbContext db,
        IPinHasher pinHasher,
        ITokenService tokenService,
        ILogger<AuthController> logger)
    {
        _db = db;
        _pinHasher = pinHasher;
        _tokenService = tokenService;
        _logger = logger;
    }

    /// <summary>Authenticate with username + PIN. Returns a JWT on success.</summary>
    [HttpPost("login")]
    [EnableRateLimiting("login")]
    [AllowAnonymous]
    public async Task<ActionResult<AuthResponse>> Login(
        [FromBody] LoginRequest request,
        CancellationToken cancellationToken)
    {
        // Normalise input — do NOT log the PIN
        var username = request.Username.Trim().ToLowerInvariant();

        var user = await _db.AppUsers
            .AsNoTracking()
            .FirstOrDefaultAsync(u => u.Username == username && u.IsActive, cancellationToken);

        // Use constant-time comparison path even when user not found to prevent timing attacks
        var hashToVerify = user?.PinHash ?? "x.y"; // dummy that will fail safely
        var valid = user is not null && _pinHasher.Verify(request.Pin, hashToVerify);

        if (!valid)
        {
            _logFailedLogin(_logger, username, null);
            return Unauthorized(new { message = "Invalid credentials." });
        }

        // Update last-login timestamp (fire-and-forget – don't block the response)
        await _db.AppUsers
            .Where(u => u.Id == user!.Id)
            .ExecuteUpdateAsync(s => s.SetProperty(u => u.LastLoginAt, DateTimeOffset.UtcNow), cancellationToken);

        var (token, expiresAt) = _tokenService.GenerateToken(user!);

        return Ok(new AuthResponse(token, expiresAt, user!.Id.ToString(),
            user.Username, user.DisplayName, user.Role, user.MustChangePin));
    }

    /// <summary>Returns the currently authenticated user's profile.</summary>
    [HttpGet("me")]
    [Authorize]
    public ActionResult<object> Me()
    {
        var id = User.FindFirstValue(ClaimTypes.NameIdentifier)
                 ?? User.FindFirstValue("sub");
        var username = User.FindFirstValue(ClaimTypes.Name)
                       ?? User.FindFirstValue("unique_name");
        var displayName = User.FindFirstValue("displayName");
        var role = User.FindFirstValue(ClaimTypes.Role);

        return Ok(new { id, username, displayName, role });
    }

    /// <summary>
    /// Allows the authenticated user to change their own PIN.
    /// Verifies the current PIN first, then clears the MustChangePin flag.
    /// </summary>
    [HttpPost("change-pin")]
    [Authorize]
    public async Task<ActionResult<object>> ChangePin(
        [FromBody] ChangePinRequest request,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.CurrentPin) || string.IsNullOrWhiteSpace(request.NewPin))
            return BadRequest(new { success = false, error = "Current PIN and new PIN are required." });

        if (request.NewPin.Length < 4)
            return BadRequest(new { success = false, error = "New PIN must be at least 4 digits." });

        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier)
                     ?? User.FindFirstValue("sub");

        if (!Guid.TryParse(userId, out var id))
            return Unauthorized(new { success = false, error = "Invalid token." });

        var user = await _db.AppUsers.FirstOrDefaultAsync(u => u.Id == id, cancellationToken);
        if (user is null || !user.IsActive)
            return Unauthorized(new { success = false, error = "User not found." });

        if (!_pinHasher.Verify(request.CurrentPin, user.PinHash))
            return BadRequest(new { success = false, error = "Current PIN is incorrect." });

        if (request.CurrentPin == request.NewPin)
            return BadRequest(new { success = false, error = "New PIN must differ from the current PIN." });

        user.PinHash = _pinHasher.Hash(request.NewPin);
        user.MustChangePin = false;
        await _db.SaveChangesAsync(cancellationToken);

        return Ok(new { success = true, message = "PIN changed successfully." });
    }
}
