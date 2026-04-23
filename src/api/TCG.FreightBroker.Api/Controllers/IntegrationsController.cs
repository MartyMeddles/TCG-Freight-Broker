using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TCG.FreightBroker.Application.Integrations;
using TCG.FreightBroker.Contracts.Common;

namespace TCG.FreightBroker.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Policy = "ViewerUp")]
public class IntegrationsController : ControllerBase
{
    private readonly IDatRateService _dat;
    private readonly IE2openService _e2open;
    private readonly IImapLoadSourceService _imap;

    public IntegrationsController(
        IDatRateService dat,
        IE2openService e2open,
        IImapLoadSourceService imap)
    {
        _dat = dat;
        _e2open = e2open;
        _imap = imap;
    }

    /// <summary>
    /// Returns the health/status of all configured integrations.
    /// </summary>
    [HttpGet("status")]
    public ActionResult<ApiResult<IReadOnlyList<IntegrationHealth>>> GetStatus()
    {
        var now = DateTimeOffset.UtcNow;
        var results = new List<IntegrationHealth>
        {
            new("DAT",    IsStub: true, IsHealthy: true,
                StatusMessage: "Running in stub mode — returns simulated spot rates.", now),
            new("e2open", IsStub: true, IsHealthy: true,
                StatusMessage: "Running in stub mode — simulates load tendering (95 % success rate).", now),
            new("IMAP",   IsStub: true, IsHealthy: true,
                StatusMessage: "Running in stub mode — generates synthetic load-notification emails.", now),
        };

        return Ok(ApiResult<IReadOnlyList<IntegrationHealth>>.Ok(results));
    }

    /// <summary>
    /// Probes the DAT service with a sample lane to verify connectivity.
    /// </summary>
    [HttpPost("dat/probe")]
    public async Task<ActionResult<ApiResult<DatSpotRate>>> ProbeDat(
        [FromBody] DatProbeRequest request,
        CancellationToken ct)
    {
        var quote = await _dat.GetSpotRateAsync(request.Origin, request.Destination, ct);
        return Ok(ApiResult<DatSpotRate>.Ok(quote));
    }

    /// <summary>
    /// Probes the e2open service with a synthetic test load to verify connectivity.
    /// </summary>
    [HttpPost("e2open/probe")]
    public async Task<ActionResult<ApiResult<E2openPushResult>>> ProbeE2open(CancellationToken ct)
    {
        var result = await _e2open.PushLoadAsync(
            loadId: 0,
            referenceNumber: "PROBE-0000",
            origin: "Chicago, IL",
            destination: "Dallas, TX",
            bookedRate: 2_500m,
            pickupDate: DateTimeOffset.UtcNow.AddDays(3),
            ct);

        return Ok(ApiResult<E2openPushResult>.Ok(result));
    }

    /// <summary>
    /// Probes the IMAP service by fetching any pending load-notification messages.
    /// </summary>
    [HttpPost("imap/probe")]
    public async Task<ActionResult<ApiResult<IReadOnlyList<ImapLoadMessage>>>> ProbeImap(CancellationToken ct)
    {
        var messages = await _imap.FetchPendingAsync(ct);
        return Ok(ApiResult<IReadOnlyList<ImapLoadMessage>>.Ok(messages));
    }
}

/// <summary>Request body for the DAT probe endpoint.</summary>
public record DatProbeRequest(string Origin, string Destination);
