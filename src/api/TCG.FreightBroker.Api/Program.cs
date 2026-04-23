using FluentValidation;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.AspNetCore.SignalR;
using Microsoft.Extensions.Diagnostics.HealthChecks;
using Microsoft.IdentityModel.Tokens;
using Scalar.AspNetCore;
using Serilog;
using System.Globalization;
using System.Text;
using System.Threading.RateLimiting;
using TCG.FreightBroker.Api.Filters;
using TCG.FreightBroker.Api.HealthChecks;
using TCG.FreightBroker.Api.Hubs;
using TCG.FreightBroker.Api.Middleware;
using TCG.FreightBroker.Api.Services;
using TCG.FreightBroker.Infrastructure;

Log.Logger = new LoggerConfiguration()
    .WriteTo.Console(formatProvider: CultureInfo.InvariantCulture)
    .CreateBootstrapLogger();

try
{
    var builder = WebApplication.CreateBuilder(args);

    builder.Host.UseSerilog((ctx, cfg) =>
        cfg.ReadFrom.Configuration(ctx.Configuration)
           .WriteTo.Console(formatProvider: CultureInfo.InvariantCulture));

    // Infrastructure (EF Core + SQL Server)
    builder.Services.AddInfrastructure(builder.Configuration);

    // FluentValidation — register all validators from this assembly
    builder.Services.AddValidatorsFromAssemblyContaining<Program>();

    // Controllers + audit filter
    builder.Services.AddScoped<AuditFilter>();
    builder.Services.AddControllers(options =>
        options.Filters.AddService<AuditFilter>());

    // OpenAPI (built-in .NET 10)
    builder.Services.AddOpenApi();

    // JWT Authentication
    var jwtKey = builder.Configuration["Jwt__Key"]
                 ?? builder.Configuration["Jwt:Key"]
                 ?? throw new InvalidOperationException("JWT key not configured.");
    builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
        .AddJwtBearer(options =>
        {
            options.TokenValidationParameters = new TokenValidationParameters
            {
                ValidateIssuer = true,
                ValidateAudience = true,
                ValidateLifetime = true,
                ValidateIssuerSigningKey = true,
                ValidIssuer = builder.Configuration["Jwt__Issuer"] ?? builder.Configuration["Jwt:Issuer"],
                ValidAudience = builder.Configuration["Jwt__Audience"] ?? builder.Configuration["Jwt:Audience"],
                IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey))
            };
            // SignalR WebSocket / SSE connections pass the token in the query string
            options.Events = new Microsoft.AspNetCore.Authentication.JwtBearer.JwtBearerEvents
            {
                OnMessageReceived = ctx =>
                {
                    var token = ctx.Request.Query["access_token"];
                    if (!string.IsNullOrEmpty(token) &&
                        ctx.HttpContext.Request.Path.StartsWithSegments("/hubs"))
                    {
                        ctx.Token = token;
                    }
                    return Task.CompletedTask;
                }
            };
        });

    // Authorization with role policies
    builder.Services.AddAuthorization(options =>
    {
        options.AddPolicy("AdminOnly",   p => p.RequireRole("Admin"));
        options.AddPolicy("ManagerUp",   p => p.RequireRole("Admin", "Manager"));
        options.AddPolicy("ViewerUp",    p => p.RequireRole("Admin", "Manager", "Viewer"));
    });

    // Rate limiting — 5 login attempts per IP per minute
    builder.Services.AddRateLimiter(options =>
    {
        options.AddFixedWindowLimiter("login", limiter =>
        {
            limiter.PermitLimit = 5;
            limiter.Window = TimeSpan.FromMinutes(1);
            limiter.QueueProcessingOrder = QueueProcessingOrder.OldestFirst;
            limiter.QueueLimit = 0;
        });
        options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
    });

    // SignalR
    builder.Services.AddSignalR();

    // Auto-booking hosted service (orchestrates LoadGenerator + LoadEvaluator + LoadsHub)
    builder.Services.AddHostedService<AutoBookingHostedService>();

    // Health checks — SQL Server probe via EF Core
    builder.Services.AddHealthChecks()
        .AddCheck<SqlHealthCheck>("sql", failureStatus: HealthStatus.Unhealthy, tags: ["db"]);

    // CORS — origins come from config (dev: appsettings.Development.json, prod: env vars)
    var allowedOrigins = builder.Configuration
        .GetSection("Cors:AllowedOrigins")
        .Get<string[]>() ?? [];

    builder.Services.AddCors(options =>
        options.AddDefaultPolicy(p =>
            p.WithOrigins(allowedOrigins)
             .AllowAnyHeader()
             .AllowAnyMethod()
             .AllowCredentials()));

    var app = builder.Build();

    if (app.Environment.IsDevelopment())
    {
        app.MapOpenApi();
        app.MapScalarApiReference(); // available at /scalar/v1
    }

    app.UseSecurityHeaders();
    app.UseCorrelationId();
    app.UseSerilogRequestLogging();
    app.UseHttpsRedirection();
    app.UseCors();
    app.UseRateLimiter();
    app.UseAuthentication();
    app.UseAuthorization();
    app.MapControllers();
    app.MapHub<LoadsHub>("/hubs/loads");
    app.MapHealthChecks("/health");

    app.Run();
}
catch (Exception ex)
{
    Log.Fatal(ex, "Application terminated unexpectedly.");
}
finally
{
    Log.CloseAndFlush();
}


