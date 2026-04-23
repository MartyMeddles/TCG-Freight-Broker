namespace TCG.FreightBroker.Application.LoadPipeline;

/// <summary>Thread-safe singleton that holds the auto-booking mode toggle.</summary>
public sealed class AutoBookingState
{
    private volatile bool _enabled = true;

    /// <summary>Whether the auto-booking engine is currently running.</summary>
    public bool IsEnabled => _enabled;

    /// <summary>Flip the toggle and return the new value.</summary>
    public bool Toggle()
    {
        _enabled = !_enabled;
        return _enabled;
    }

    public void SetEnabled(bool value) => _enabled = value;
}
