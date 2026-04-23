using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Text.Json;
using TCG.FreightBroker.Application.DecisionEngine;
using TCG.FreightBroker.Contracts.Common;
using TCG.FreightBroker.Contracts.Simulate;
using TCG.FreightBroker.Infrastructure.Persistence;

namespace TCG.FreightBroker.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Policy = "ViewerUp")]
public class SimulateController : ControllerBase
{
    private const string SettingKey = "DecisionParameters";
    private readonly AppDbContext _db;

    public SimulateController(AppDbContext db) => _db = db;

    /// <summary>
    /// Evaluates a single hypothetical load through the decision engine and returns
    /// the full rule trace. Optionally accepts parameter overrides for what-if testing.
    /// </summary>
    [HttpPost("evaluate")]
    public async Task<ActionResult<ApiResult<SimulateEvaluateResponse>>> Evaluate(
        [FromBody] SimulateEvaluateRequest request,
        CancellationToken ct)
    {
        DecisionParameters p = await ResolveParametersAsync(request.Parameters, ct);

        var input = new LoadInput
        {
            Lane = request.Lane,
            CarrierCost = request.CarrierCost,
            CustomerRate = request.CustomerRate,
            Profit = request.CustomerRate - request.CarrierCost,
            Margin = request.CustomerRate > 0
                ? Math.Round((request.CustomerRate - request.CarrierCost) / request.CustomerRate * 100, 2)
                : 0m,
            SpotRate = request.SpotRate,
            ContractRate = request.ContractRate,
            ContractGP = request.ContractRate > 0
                ? Math.Round((request.ContractRate - request.CarrierCost) / request.ContractRate * 100, 2)
                : 0m,
            IsContract = request.IsContract,
            WeeklyMinimum = request.WeeklyMinimum,
            ClientCode = request.ClientCode,
            NeedsInsurance = request.NeedsInsurance,
        };

        var week = new WeekContext { DaysRemaining = request.DaysRemaining };

        var evaluator = new LoadEvaluator(p);
        var result = evaluator.Evaluate(input, request.CurrentWeekBookings, request.TotalUnmetContractLoads, week);

        var response = new SimulateEvaluateResponse(
            Pass: result.Pass,
            Recommendation: result.Recommendation.ToString(),
            Score: result.Score,
            ContractNeed: result.ContractNeed,
            GpBlocked: result.GpBlocked,
            ContractGP: result.ContractGP,
            GpFloor: result.GpFloor,
            Rules: result.Rules.Select(r => new SimulateRuleResult(r.RuleName, r.Status, r.Description, r.Weight)).ToList());

        return Ok(ApiResult<SimulateEvaluateResponse>.Ok(response));
    }

    // ── helpers ─────────────────────────────────────────────────────────────

    private async Task<DecisionParameters> ResolveParametersAsync(ParameterOverride? overrides, CancellationToken ct)
    {
        if (overrides is not null)
        {
            return new DecisionParameters
            {
                CtrGPFloor = overrides.CtrGPFloor,
                CtrMarginFloor = overrides.CtrMarginFloor,
                CtrMarginNormal = overrides.CtrMarginNormal,
                SpotMarginFloor = overrides.SpotMarginFloor,
                DatTolerance = overrides.DatTolerance,
                CtrOverrideProfit = overrides.CtrOverrideProfit,
                CtrOverrideMargin = overrides.CtrOverrideMargin,
                SpotBlockThreshold = overrides.SpotBlockThreshold,
                UrgencyDays = overrides.UrgencyDays,
                UrgencyLoads = overrides.UrgencyLoads,
            };
        }

        var setting = await _db.SystemSettings
            .AsNoTracking()
            .FirstOrDefaultAsync(s => s.Key == SettingKey, ct);

        return setting is null
            ? new DecisionParameters()
            : JsonSerializer.Deserialize<DecisionParameters>(setting.Value) ?? new DecisionParameters();
    }
}
