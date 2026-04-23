using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Text.Json;
using TCG.FreightBroker.Application.DecisionEngine;
using TCG.FreightBroker.Contracts.Common;
using TCG.FreightBroker.Domain.Entities;
using TCG.FreightBroker.Infrastructure.Persistence;

namespace TCG.FreightBroker.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Policy = "ManagerUp")]
public class ConfigController : ControllerBase
{
    private const string SettingKey = "DecisionParameters";
    private static readonly JsonSerializerOptions IndentedOptions = new() { WriteIndented = true };
    private readonly AppDbContext _db;

    public ConfigController(AppDbContext db) => _db = db;

    /// <summary>
    /// Exports the full system configuration as a JSON download.
    /// Includes decision-engine parameters, all clients, and all lanes.
    /// </summary>
    [HttpGet("export")]
    public async Task<IActionResult> Export(CancellationToken ct)
    {
        var paramSetting = await _db.SystemSettings
            .AsNoTracking()
            .FirstOrDefaultAsync(s => s.Key == SettingKey, ct);

        var parameters = paramSetting is null
            ? new DecisionParameters()
            : JsonSerializer.Deserialize<DecisionParameters>(paramSetting.Value) ?? new DecisionParameters();

        var clients = await _db.Clients.AsNoTracking()
            .OrderBy(c => c.Id)
            .Select(c => new { c.Id, c.Name, c.IsActive })
            .ToListAsync(ct);

        var lanes = await _db.Lanes.AsNoTracking()
            .OrderBy(l => l.Id)
            .Select(l => new
            {
                l.Id,
                l.ClientId,
                l.OriginCity, l.OriginState,
                l.DestinationCity, l.DestinationState,
                l.Mode, l.IsActive
            })
            .ToListAsync(ct);

        var export = new
        {
            ExportedAt = DateTimeOffset.UtcNow,
            Version = "1.0",
            Parameters = parameters,
            Clients = clients,
            Lanes = lanes,
        };

        string json = JsonSerializer.Serialize(export, IndentedOptions);
        string filename = $"tcg-freight-config-{DateTimeOffset.UtcNow:yyyyMMdd-HHmmss}.json";
        return File(System.Text.Encoding.UTF8.GetBytes(json), "application/json", filename);
    }

    /// <summary>
    /// Imports a configuration file previously exported by this endpoint.
    /// Upserts clients and lanes; overwrites decision-engine parameters.
    /// Admin only.
    /// </summary>
    [HttpPost("import")]
    [Authorize(Policy = "AdminOnly")]
    public async Task<ActionResult<ApiResult<ConfigImportResult>>> Import(
        [FromBody] JsonElement payload,
        CancellationToken ct)
    {
        // ── Parse parameters ────────────────────────────────────────────────
        DecisionParameters? parameters = null;
        if (payload.TryGetProperty("Parameters", out var paramEl))
        {
            parameters = JsonSerializer.Deserialize<DecisionParameters>(paramEl.GetRawText());
        }

        int clientsUpserted = 0;
        int lanesUpserted = 0;

        // ── Upsert clients ──────────────────────────────────────────────────
        if (payload.TryGetProperty("Clients", out var clientsEl) && clientsEl.ValueKind == JsonValueKind.Array)
        {
            foreach (var item in clientsEl.EnumerateArray())
            {
                if (!item.TryGetProperty("Name", out var nameProp)) continue;
                string name = nameProp.GetString() ?? string.Empty;
                if (string.IsNullOrWhiteSpace(name)) continue;
                bool isActive = item.TryGetProperty("IsActive", out var activeProp) && activeProp.GetBoolean();

                var existing = await _db.Clients.FirstOrDefaultAsync(c => c.Name == name, ct);
                if (existing is null)
                {
                    _db.Clients.Add(new Client { Name = name, IsActive = isActive });
                }
                else
                {
                    existing.IsActive = isActive;
                }
                clientsUpserted++;
            }
        }

        await _db.SaveChangesAsync(ct); // Commit clients before lanes (FK dependency)

        // ── Upsert lanes ────────────────────────────────────────────────────
        if (payload.TryGetProperty("Lanes", out var lanesEl) && lanesEl.ValueKind == JsonValueKind.Array)
        {
            foreach (var item in lanesEl.EnumerateArray())
            {
                string originCity = item.TryGetProperty("OriginCity", out var v) ? v.GetString() ?? "" : "";
                string originState = item.TryGetProperty("OriginState", out v) ? v.GetString() ?? "" : "";
                string destCity = item.TryGetProperty("DestinationCity", out v) ? v.GetString() ?? "" : "";
                string destState = item.TryGetProperty("DestinationState", out v) ? v.GetString() ?? "" : "";
                string mode = item.TryGetProperty("Mode", out v) ? v.GetString() ?? "TL" : "TL";
                bool isActive = item.TryGetProperty("IsActive", out v) && v.GetBoolean();

                int? clientId = null;
                if (item.TryGetProperty("ClientId", out var cidProp) && cidProp.TryGetInt32(out int cid) && cid > 0)
                {
                    bool exists = await _db.Clients.AnyAsync(c => c.Id == cid, ct);
                    if (exists) clientId = cid;
                }

                if (string.IsNullOrWhiteSpace(originCity) || string.IsNullOrWhiteSpace(destCity)) continue;

                // Match by origin+destination+mode — treat as upsert key
                var existing = await _db.Lanes.FirstOrDefaultAsync(l =>
                    l.OriginCity == originCity && l.OriginState == originState &&
                    l.DestinationCity == destCity && l.DestinationState == destState &&
                    l.Mode == mode, ct);

                if (existing is null)
                {
                    _db.Lanes.Add(new Lane
                    {
                        ClientId = clientId ?? 1,
                        OriginCity = originCity, OriginState = originState,
                        DestinationCity = destCity, DestinationState = destState,
                        Mode = mode, IsActive = isActive,
                    });
                }
                else
                {
                    existing.IsActive = isActive;
                    if (clientId.HasValue) existing.ClientId = clientId.Value;
                }

                lanesUpserted++;
            }
        }

        await _db.SaveChangesAsync(ct);

        // ── Save parameters ─────────────────────────────────────────────────
        if (parameters is not null)
        {
            string paramJson = JsonSerializer.Serialize(parameters);
            var paramSetting = await _db.SystemSettings.FirstOrDefaultAsync(s => s.Key == SettingKey, ct);
            if (paramSetting is null)
                _db.SystemSettings.Add(new SystemSetting { Key = SettingKey, Value = paramJson, UpdatedAt = DateTimeOffset.UtcNow });
            else
            {
                paramSetting.Value = paramJson;
                paramSetting.UpdatedAt = DateTimeOffset.UtcNow;
            }
            await _db.SaveChangesAsync(ct);
        }

        var result = new ConfigImportResult(
            ClientsUpserted: clientsUpserted,
            LanesUpserted: lanesUpserted,
            ParametersApplied: parameters is not null,
            ImportedAt: DateTimeOffset.UtcNow);

        return Ok(ApiResult<ConfigImportResult>.Ok(result));
    }
}

/// <summary>Summary of what the config import changed.</summary>
public record ConfigImportResult(
    int ClientsUpserted,
    int LanesUpserted,
    bool ParametersApplied,
    DateTimeOffset ImportedAt);
