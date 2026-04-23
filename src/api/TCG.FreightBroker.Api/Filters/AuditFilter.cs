using Microsoft.AspNetCore.Mvc.Filters;
using System.Security.Claims;

namespace TCG.FreightBroker.Api.Filters;

/// <summary>
/// Logs mutating requests (POST/PUT/PATCH/DELETE) with the acting user's ID.
/// Uses structured logging — entries are captured by Serilog.
/// </summary>
public sealed class AuditFilter : IAsyncActionFilter
{
    private static readonly HashSet<string> MutatingMethods =
        new(StringComparer.OrdinalIgnoreCase) { "POST", "PUT", "PATCH", "DELETE" };

    private static readonly Action<ILogger, string, string, string, int, Exception?> _logAuditSuccess =
        LoggerMessage.Define<string, string, string, int>(LogLevel.Information, new EventId(100, "AuditSuccess"),
            "AUDIT {Method} {Path} by user {UserId} -> {StatusCode}");

    private static readonly Action<ILogger, string, string, string, int, string, Exception?> _logAuditFailure =
        LoggerMessage.Define<string, string, string, int, string>(LogLevel.Warning, new EventId(101, "AuditFailure"),
            "AUDIT {Method} {Path} by user {UserId} -> {StatusCode} | Error: {Error}");

    private readonly ILogger<AuditFilter> _logger;

    public AuditFilter(ILogger<AuditFilter> logger) => _logger = logger;

    public async Task OnActionExecutionAsync(ActionExecutingContext context, ActionExecutionDelegate next)
    {
        var result = await next();

        if (!MutatingMethods.Contains(context.HttpContext.Request.Method)) return;

        var userId = context.HttpContext.User.FindFirstValue(ClaimTypes.NameIdentifier)
                     ?? context.HttpContext.User.FindFirstValue("sub")
                     ?? "anonymous";

        var statusCode = context.HttpContext.Response.StatusCode;
        var method = context.HttpContext.Request.Method;
        var path = context.HttpContext.Request.Path.Value ?? string.Empty;
        var success = statusCode is >= 200 and < 300;

        if (success)
        {
            _logAuditSuccess(_logger, method, path, userId, statusCode, null);
        }
        else
        {
            var errorMsg = result.Exception?.Message ?? "none";
            _logAuditFailure(_logger, method, path, userId, statusCode, errorMsg, null);
        }
    }
}
