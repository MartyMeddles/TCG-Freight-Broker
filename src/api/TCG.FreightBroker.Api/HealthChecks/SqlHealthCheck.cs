using Microsoft.Extensions.Diagnostics.HealthChecks;
using TCG.FreightBroker.Infrastructure.Persistence;

namespace TCG.FreightBroker.Api.HealthChecks;

/// <summary>
/// Verifies the SQL Server connection by attempting a lightweight connection
/// through the existing <see cref="AppDbContext"/>.
/// </summary>
public sealed class SqlHealthCheck(AppDbContext db) : IHealthCheck
{
    public async Task<HealthCheckResult> CheckHealthAsync(
        HealthCheckContext context,
        CancellationToken cancellationToken = default)
    {
        try
        {
            return await db.Database.CanConnectAsync(cancellationToken)
                ? HealthCheckResult.Healthy("SQL Server reachable.")
                : HealthCheckResult.Unhealthy("SQL Server unreachable.");
        }
        catch (Exception ex)
        {
            return HealthCheckResult.Unhealthy("SQL Server check failed.", ex);
        }
    }
}
