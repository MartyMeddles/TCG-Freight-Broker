namespace TCG.FreightBroker.Contracts.Auth;

public sealed record AuthResponse(
    string Token,
    DateTimeOffset ExpiresAt,
    string UserId,
    string Username,
    string DisplayName,
    string Role,
    bool MustChangePin);
