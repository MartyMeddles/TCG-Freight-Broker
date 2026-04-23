using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using TCG.FreightBroker.Domain.Entities;
using TCG.FreightBroker.Infrastructure.Auth;
using TCG.FreightBroker.Infrastructure.Persistence;

namespace TCG.FreightBroker.Infrastructure.Seeding;

/// <summary>
/// Seeds known users on startup.
/// • martymeddles  – Admin  – created only if no users exist at all.
/// • maxdieterle   – Manager – upserted every startup; MustChangePin until they set a new one.
/// • holdenhendley – Viewer  – upserted every startup; MustChangePin until they set a new one.
/// </summary>
public sealed class DbSeeder : IHostedService
{
    private readonly IServiceProvider _services;
    private readonly ILogger<DbSeeder> _logger;

    private static readonly Action<ILogger, Exception?> _logSeeded =
        LoggerMessage.Define(LogLevel.Warning, new EventId(1, "AdminSeeded"),
            "Seeded default admin user (username=martymeddles, pin=1234). " +
            "Change the PIN immediately via the Users API.");

    private static readonly Action<ILogger, string, Exception?> _logUserEnsured =
        LoggerMessage.Define<string>(LogLevel.Information, new EventId(2, "UserEnsured"),
            "Ensured seed user exists: {Username}");

    public DbSeeder(IServiceProvider services, ILogger<DbSeeder> logger)
    {
        _services = services;
        _logger = logger;
    }

    public async Task StartAsync(CancellationToken cancellationToken)
    {
        await using var scope = _services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var hasher = scope.ServiceProvider.GetRequiredService<IPinHasher>();

        // ── Seed admin only when the table is empty ──────────────────────────
        if (!await db.AppUsers.AnyAsync(cancellationToken))
        {
            db.AppUsers.Add(new AppUser
            {
                Id = Guid.NewGuid(),
                Username = "martymeddles",
                DisplayName = "Marty Meddles",
                Role = "Admin",
                PinHash = hasher.Hash("1234"),
                MustChangePin = false,
                IsActive = true,
            });
            await db.SaveChangesAsync(cancellationToken);
            _logSeeded(_logger, null);
        }

        // ── Always ensure these named users exist (upsert by username) ───────
        await EnsureUserAsync(db, hasher,
            username: "maxdieterle",
            displayName: "Max Dieterle",
            role: "Manager",
            temporaryPin: "1234",
            ct: cancellationToken);

        await EnsureUserAsync(db, hasher,
            username: "holdenhendley",
            displayName: "Holden Hendley",
            role: "Viewer",
            temporaryPin: "1234",
            ct: cancellationToken);
    }

    public Task StopAsync(CancellationToken cancellationToken) => Task.CompletedTask;

    private async Task EnsureUserAsync(
        AppDbContext db,
        IPinHasher hasher,
        string username,
        string displayName,
        string role,
        string temporaryPin,
        CancellationToken ct)
    {
        var exists = await db.AppUsers.AnyAsync(u => u.Username == username, ct);
        if (!exists)
        {
            db.AppUsers.Add(new AppUser
            {
                Id = Guid.NewGuid(),
                Username = username,
                DisplayName = displayName,
                Role = role,
                PinHash = hasher.Hash(temporaryPin),
                MustChangePin = true,
                IsActive = true,
            });
            await db.SaveChangesAsync(ct);
            _logUserEnsured(_logger, username, null);
        }
    }
}

