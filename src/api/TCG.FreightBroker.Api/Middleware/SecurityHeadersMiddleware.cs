namespace TCG.FreightBroker.Api.Middleware;

/// <summary>
/// Adds security-related HTTP response headers to every response.
/// </summary>
public sealed class SecurityHeadersMiddleware(RequestDelegate next)
{
    public async Task InvokeAsync(HttpContext context)
    {
        var headers = context.Response.Headers;

        // Prevent MIME-type sniffing
        headers["X-Content-Type-Options"] = "nosniff";

        // Block the page from being embedded in an iframe
        headers["X-Frame-Options"] = "DENY";

        // Control the Referer header sent with requests
        headers["Referrer-Policy"] = "strict-origin-when-cross-origin";

        // Disable the browser's built-in XSS filter (modern recommendation)
        headers["X-XSS-Protection"] = "0";

        // Remove server identification
        headers.Remove("Server");
        headers.Remove("X-Powered-By");

        await next(context);
    }
}

public static class SecurityHeadersMiddlewareExtensions
{
    public static IApplicationBuilder UseSecurityHeaders(this IApplicationBuilder app)
        => app.UseMiddleware<SecurityHeadersMiddleware>();
}
