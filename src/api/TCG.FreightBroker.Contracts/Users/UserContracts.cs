namespace TCG.FreightBroker.Contracts.Users;

public record UserDto(
    Guid Id,
    string Username,
    string DisplayName,
    string Role,
    bool IsActive,
    DateTimeOffset CreatedAt,
    DateTimeOffset? LastLoginAt);

public record CreateUserRequest(
    string Username,
    string Pin,
    string DisplayName,
    string Role);

public record UpdateUserRequest(
    string DisplayName,
    string Role,
    bool IsActive);

public record ChangeUserPinRequest(string NewPin);
