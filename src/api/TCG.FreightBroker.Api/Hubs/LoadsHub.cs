using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;

namespace TCG.FreightBroker.Api.Hubs;

/// <summary>
/// Real-time hub that pushes load and decision events to all connected clients.
/// Authentication is required; anonymous callers are rejected.
/// </summary>
[Authorize(Policy = "ViewerUp")]
public sealed class LoadsHub : Hub
{
    // Server → client methods are invoked by AutoBookingHostedService via IHubContext<LoadsHub>.
    // The hub itself does not need server-callable methods for this phase.
}

/// <summary>
/// Strongly-typed method names used when broadcasting from the server.
/// Sharing these constants avoids magic strings in both server and (generated) client code.
/// </summary>
public static class LoadsHubEvents
{
    /// <summary>
    /// Raised when a new load has been evaluated and saved.
    /// Payload: <see cref="LoadEvent"/>.
    /// </summary>
    public const string LoadEvaluated = "LoadEvaluated";

    /// <summary>Raised when the auto-booking mode is toggled by an admin.</summary>
    public const string AutoModeChanged = "AutoModeChanged";
}

/// <summary>Payload broadcast for every evaluated load.</summary>
public sealed record LoadEvent(
    int LoadId,
    string ReferenceNumber,
    string Lane,
    decimal TargetRate,
    decimal? BookedRate,
    string Status,
    bool IsAutoBooked,
    string Recommendation,
    string DecisionReason,
    DateTimeOffset EvaluatedAt);
