using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TCG.FreightBroker.Contracts.Common;
using TCG.FreightBroker.Infrastructure.Persistence;

namespace TCG.FreightBroker.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Policy = "AdminOnly")]
public class AuditLogsController : ControllerBase
{
    private readonly AppDbContext _db;

    public AuditLogsController(AppDbContext db) => _db = db;

    [HttpGet]
    public async Task<ActionResult<ApiResult<PagedResult<AuditLogDto>>>> GetAll(
        int page = 1,
        int pageSize = 50,
        string? action = null,
        string? username = null,
        CancellationToken cancellationToken = default)
    {
        var q = _db.AuditLogs.AsQueryable();
        if (!string.IsNullOrEmpty(action)) q = q.Where(a => a.Action == action);
        if (!string.IsNullOrEmpty(username)) q = q.Where(a => a.Username == username);

        var total = await q.CountAsync(cancellationToken);
        var items = await q
            .OrderByDescending(a => a.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(a => new AuditLogDto(a.Id, a.Action, a.EntityId, a.EntityType, a.Username, a.Details, a.CreatedAt))
            .ToListAsync(cancellationToken);

        return Ok(ApiResult<PagedResult<AuditLogDto>>.Ok(
            new PagedResult<AuditLogDto> { Items = items, Page = page, PageSize = pageSize, TotalCount = total }));
    }
}
