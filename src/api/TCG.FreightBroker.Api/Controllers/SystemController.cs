using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using TCG.FreightBroker.Api.Hubs;
using TCG.FreightBroker.Application.LoadPipeline;
using TCG.FreightBroker.Contracts.Common;

namespace TCG.FreightBroker.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Policy = "ManagerUp")]
public class SystemController : ControllerBase
{
    private readonly AutoBookingState _state;
    private readonly IHubContext<LoadsHub> _hub;

    public SystemController(AutoBookingState state, IHubContext<LoadsHub> hub)
    {
        _state = state;
        _hub = hub;
    }

    /// <summary>Returns the current auto-booking mode status.</summary>
    [HttpGet("auto-booking")]
    public ActionResult<ApiResult<object>> GetAutoBookingStatus()
        => Ok(ApiResult<object>.Ok(new { isEnabled = _state.IsEnabled }));

    /// <summary>Toggles the auto-booking engine on/off. Admin-only.</summary>
    [HttpPost("auto-booking/toggle")]
    [Authorize(Policy = "AdminOnly")]
    public async Task<ActionResult<ApiResult<object>>> ToggleAutoBooking(CancellationToken ct)
    {
        bool newValue = _state.Toggle();
        await _hub.Clients.All.SendAsync(LoadsHubEvents.AutoModeChanged, new { isEnabled = newValue }, ct);

        return Ok(ApiResult<object>.Ok(new
        {
            isEnabled = newValue,
            message = newValue ? "Auto-booking ENABLED" : "Auto-booking PAUSED",
        }));
    }
}
