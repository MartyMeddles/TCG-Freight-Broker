using TCG.FreightBroker.Application.LoadPipeline;

namespace TCG.FreightBroker.Application.Tests.LoadPipeline;

public class AutoBookingStateTests
{
    [Fact]
    public void InitialState_IsEnabled()
    {
        var state = new AutoBookingState();
        state.IsEnabled.Should().BeTrue();
    }

    [Fact]
    public void Toggle_FromEnabled_DisablesEngine()
    {
        var state = new AutoBookingState();

        var result = state.Toggle();

        result.Should().BeFalse();
        state.IsEnabled.Should().BeFalse();
    }

    [Fact]
    public void Toggle_Twice_RestoresOriginalState()
    {
        var state = new AutoBookingState();

        state.Toggle();
        var result = state.Toggle();

        result.Should().BeTrue();
        state.IsEnabled.Should().BeTrue();
    }

    [Fact]
    public void SetEnabled_True_EnablesEngine()
    {
        var state = new AutoBookingState();
        state.Toggle(); // disable first

        state.SetEnabled(true);

        state.IsEnabled.Should().BeTrue();
    }

    [Fact]
    public void SetEnabled_False_DisablesEngine()
    {
        var state = new AutoBookingState();

        state.SetEnabled(false);

        state.IsEnabled.Should().BeFalse();
    }

    [Fact]
    public void Toggle_ReturnValue_MatchesIsEnabled()
    {
        var state = new AutoBookingState();

        var returned = state.Toggle();

        returned.Should().Be(state.IsEnabled);
    }
}
