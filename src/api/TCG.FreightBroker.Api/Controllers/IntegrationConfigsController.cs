using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TCG.FreightBroker.Contracts.Common;
using TCG.FreightBroker.Domain.Entities;
using TCG.FreightBroker.Infrastructure.Persistence;

namespace TCG.FreightBroker.Api.Controllers;

[ApiController]
[Route("api/integration-configs")]
[Authorize(Policy = "AdminOnly")]
public class IntegrationConfigsController : ControllerBase
{
    private readonly AppDbContext _db;

    public IntegrationConfigsController(AppDbContext db) => _db = db;

    // GET /api/integration-configs
    [HttpGet]
    public async Task<ActionResult<ApiResult<List<IntegrationConfigDto>>>> GetAll(CancellationToken ct)
    {
        var items = await _db.IntegrationConfigs
            .AsNoTracking()
            .OrderBy(x => x.Name)
            .Select(x => new IntegrationConfigDto(
                x.Id, x.Name, x.Type, x.BaseUrl,
                x.ApiKey != null ? MaskKey(x.ApiKey) : null,
                x.Notes, x.IsActive, x.CreatedAt))
            .ToListAsync(ct);

        return Ok(ApiResult<List<IntegrationConfigDto>>.Ok(items));
    }

    // POST /api/integration-configs
    [HttpPost]
    public async Task<ActionResult<ApiResult<IntegrationConfigDto>>> Create(
        [FromBody] CreateIntegrationConfigRequest req, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(req.Name))
            return BadRequest(ApiResult<IntegrationConfigDto>.Fail("Name is required."));
        if (string.IsNullOrWhiteSpace(req.Type))
            return BadRequest(ApiResult<IntegrationConfigDto>.Fail("Type is required."));

        var config = new IntegrationConfig
        {
            Name     = req.Name.Trim(),
            Type     = req.Type.Trim(),
            BaseUrl  = req.BaseUrl?.Trim() ?? string.Empty,
            ApiKey   = string.IsNullOrWhiteSpace(req.ApiKey) ? null : req.ApiKey.Trim(),
            Notes    = string.IsNullOrWhiteSpace(req.Notes) ? null : req.Notes.Trim(),
            IsActive = true,
        };

        _db.IntegrationConfigs.Add(config);
        await _db.SaveChangesAsync(ct);

        var dto = new IntegrationConfigDto(
            config.Id, config.Name, config.Type, config.BaseUrl,
            config.ApiKey != null ? MaskKey(config.ApiKey) : null,
            config.Notes, config.IsActive, config.CreatedAt);

        return CreatedAtAction(nameof(GetAll), ApiResult<IntegrationConfigDto>.Ok(dto));
    }

    // PATCH /api/integration-configs/{id}/toggle
    [HttpPatch("{id:int}/toggle")]
    public async Task<ActionResult<ApiResult<IntegrationConfigDto>>> Toggle(int id, CancellationToken ct)
    {
        var config = await _db.IntegrationConfigs.FindAsync([id], ct);
        if (config is null) return NotFound(ApiResult<IntegrationConfigDto>.Fail("Not found."));

        config.IsActive = !config.IsActive;
        await _db.SaveChangesAsync(ct);

        var dto = new IntegrationConfigDto(
            config.Id, config.Name, config.Type, config.BaseUrl,
            config.ApiKey != null ? MaskKey(config.ApiKey) : null,
            config.Notes, config.IsActive, config.CreatedAt);

        return Ok(ApiResult<IntegrationConfigDto>.Ok(dto));
    }

    // DELETE /api/integration-configs/{id}
    [HttpDelete("{id:int}")]
    public async Task<ActionResult<ApiResult<object>>> Delete(int id, CancellationToken ct)
    {
        var config = await _db.IntegrationConfigs.FindAsync([id], ct);
        if (config is null) return NotFound(ApiResult<object>.Fail("Not found."));

        _db.IntegrationConfigs.Remove(config);
        await _db.SaveChangesAsync(ct);

        return Ok(ApiResult<object>.Ok(new { deleted = id }));
    }

    private static string MaskKey(string key) =>
        key.Length <= 8 ? new string('*', key.Length) : key[..4] + new string('*', key.Length - 8) + key[^4..];
}

public record IntegrationConfigDto(
    int Id, string Name, string Type, string BaseUrl,
    string? ApiKeyMasked, string? Notes, bool IsActive, DateTimeOffset CreatedAt);

public record CreateIntegrationConfigRequest(
    string Name, string Type, string? BaseUrl, string? ApiKey, string? Notes);
