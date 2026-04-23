using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using TCG.FreightBroker.Application.Integrations;
using TCG.FreightBroker.Application.LoadPipeline;
using TCG.FreightBroker.Infrastructure.Auth;
using TCG.FreightBroker.Infrastructure.Integrations;
using TCG.FreightBroker.Infrastructure.Persistence;
using TCG.FreightBroker.Infrastructure.Seeding;

namespace TCG.FreightBroker.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        services.AddDbContext<AppDbContext>(options =>
            options.UseSqlServer(
                configuration.GetConnectionString("Default"),
                sql => sql.MigrationsAssembly(typeof(AppDbContext).Assembly.FullName)));

        services.AddSingleton<IPinHasher, PinHasher>();
        services.AddScoped<ITokenService, TokenService>();
        services.AddHostedService<DbSeeder>();

        // Auto-booking state singleton (shared between hosted service and controller)
        services.AddSingleton<AutoBookingState>();

        // ── Integration stubs (swap for real implementations when credentials are available) ──
        services.AddScoped<IDatRateService, DatRateStub>();
        services.AddScoped<IE2openService, E2openStub>();
        services.AddScoped<IImapLoadSourceService, ImapLoadSourceStub>();

        return services;
    }
}
