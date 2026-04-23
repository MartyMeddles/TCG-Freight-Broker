namespace TCG.FreightBroker.Contracts.Clients;

public record ClientDto(int Id, string Name, bool IsActive, DateTimeOffset CreatedAt);

public record CreateClientRequest(string Name);

public record UpdateClientRequest(string Name, bool IsActive);
