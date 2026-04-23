using System.Diagnostics.CodeAnalysis;

namespace TCG.FreightBroker.Contracts.Common;

/// <summary>Standard JSON envelope returned by every API endpoint.</summary>
public class ApiResult<T>
{
    public bool Success { get; init; }
    public T? Data { get; init; }
    public string? Error { get; init; }

    [SuppressMessage("Design", "CA1000:Do not declare static members on generic types",
        Justification = "Factory pattern on generic type is intentional and idiomatic here.")]
    public static ApiResult<T> Ok(T data) => new() { Success = true, Data = data };

    [SuppressMessage("Design", "CA1000:Do not declare static members on generic types",
        Justification = "Factory pattern on generic type is intentional and idiomatic here.")]
    public static ApiResult<T> Fail(string error) => new() { Success = false, Error = error };
}
