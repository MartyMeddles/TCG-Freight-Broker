using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Text.Json;
using TCG.FreightBroker.Application.DecisionEngine;
using TCG.FreightBroker.Contracts.Common;
using TCG.FreightBroker.Contracts.Parameters;
using TCG.FreightBroker.Domain.Entities;
using TCG.FreightBroker.Infrastructure.Persistence;

namespace TCG.FreightBroker.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Policy = "ViewerUp")]
public class ParametersController : ControllerBase
{
    private const string SettingKey = "DecisionParameters";
    private readonly AppDbContext _db;

    public ParametersController(AppDbContext db) => _db = db;

    /// <summary>Returns the current decision-engine parameters (defaults if never saved).</summary>
    [HttpGet]
    public async Task<ActionResult<ApiResult<ParametersDto>>> Get(CancellationToken ct)
    {
        var dto = await LoadOrDefaultAsync(ct);
        return Ok(ApiResult<ParametersDto>.Ok(dto));
    }

    /// <summary>Persists updated decision-engine parameters. Admin only.</summary>
    [HttpPut]
    [Authorize(Policy = "AdminOnly")]
    public async Task<ActionResult<ApiResult<ParametersDto>>> Update(
        [FromBody] UpdateParametersRequest request,
        CancellationToken ct)
    {
        var p = new DecisionParameters
        {
            CtrGPFloor = request.CtrGPFloor,
            CtrMarginFloor = request.CtrMarginFloor,
            CtrMarginNormal = request.CtrMarginNormal,
            SpotMarginFloor = request.SpotMarginFloor,
            DatTolerance = request.DatTolerance,
            CtrOverrideProfit = request.CtrOverrideProfit,
            CtrOverrideMargin = request.CtrOverrideMargin,
            SpotBlockThreshold = request.SpotBlockThreshold,
            UrgencyDays = request.UrgencyDays,
            UrgencyLoads = request.UrgencyLoads,
        };

        var json = JsonSerializer.Serialize(p);
        var existing = await _db.SystemSettings.FirstOrDefaultAsync(s => s.Key == SettingKey, ct);
        if (existing is null)
        {
            _db.SystemSettings.Add(new SystemSetting { Key = SettingKey, Value = json, UpdatedAt = DateTimeOffset.UtcNow });
        }
        else
        {
            existing.Value = json;
            existing.UpdatedAt = DateTimeOffset.UtcNow;
        }

        await _db.SaveChangesAsync(ct);

        return Ok(ApiResult<ParametersDto>.Ok(ToDto(p)));
    }

    // ── helpers ─────────────────────────────────────────────────────────────

    private async Task<ParametersDto> LoadOrDefaultAsync(CancellationToken ct)
    {
        var setting = await _db.SystemSettings
            .AsNoTracking()
            .FirstOrDefaultAsync(s => s.Key == SettingKey, ct);

        DecisionParameters p = setting is null
            ? new DecisionParameters()
            : JsonSerializer.Deserialize<DecisionParameters>(setting.Value) ?? new DecisionParameters();

        return ToDto(p);
    }

    private static ParametersDto ToDto(DecisionParameters p) => new(
        p.CtrGPFloor, p.CtrMarginFloor, p.CtrMarginNormal,
        p.SpotMarginFloor, p.DatTolerance,
        p.CtrOverrideProfit, p.CtrOverrideMargin,
        p.SpotBlockThreshold, p.UrgencyDays, p.UrgencyLoads);
}
