namespace TCG.FreightBroker.Contracts.Auth;

public sealed record ChangePinRequest(string CurrentPin, string NewPin);
