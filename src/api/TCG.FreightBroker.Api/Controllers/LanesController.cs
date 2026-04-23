using FluentValidation;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TCG.FreightBroker.Contracts.Common;
using TCG.FreightBroker.Contracts.Lanes;
using TCG.FreightBroker.Domain.Entities;
using TCG.FreightBroker.Infrastructure.Persistence;

namespace TCG.FreightBroker.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Policy = "ViewerUp")]
public class LanesController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly IValidator<CreateLaneRequest> _createValidator;
    private readonly IValidator<UpdateLaneRequest> _updateValidator;

    public LanesController(AppDbContext db,
        IValidator<CreateLaneRequest> createValidator,
        IValidator<UpdateLaneRequest> updateValidator)
    {
        _db = db; _createValidator = createValidator; _updateValidator = updateValidator;
    }

    [HttpGet]
    public async Task<ActionResult<ApiResult<PagedResult<LaneDto>>>> GetAll(
        [FromQuery] int page = 1, [FromQuery] int pageSize = 25,
        [FromQuery] int? clientId = null, [FromQuery] bool? isActive = null,
        CancellationToken cancellationToken = default)
    {
        page = Math.Max(1, page); pageSize = Math.Clamp(pageSize, 1, 100);
        var query = _db.Lanes.Include(l => l.Client).AsNoTracking();
        if (clientId.HasValue) query = query.Where(l => l.ClientId == clientId.Value);
        if (isActive.HasValue) query = query.Where(l => l.IsActive == isActive.Value);
        var total = await query.CountAsync(cancellationToken);
        var items = await query
            .OrderBy(l => l.Client.Name).ThenBy(l => l.OriginState).ThenBy(l => l.DestinationState)
            .Skip((page - 1) * pageSize).Take(pageSize)
            .Select(l => new LaneDto(l.Id, l.ClientId, l.Client.Name, l.OriginCity, l.OriginState,
                l.DestinationCity, l.DestinationState, l.Mode, l.IsActive, l.CreatedAt))
            .ToListAsync(cancellationToken);
        return Ok(ApiResult<PagedResult<LaneDto>>.Ok(new PagedResult<LaneDto> { Items = items, Page = page, PageSize = pageSize, TotalCount = total }));
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<ApiResult<LaneDto>>> GetById(int id, CancellationToken cancellationToken)
    {
        var lane = await _db.Lanes.Include(l => l.Client).AsNoTracking()
            .FirstOrDefaultAsync(l => l.Id == id, cancellationToken);
        if (lane is null) return NotFound(ApiResult<LaneDto>.Fail("Lane not found."));
        return Ok(ApiResult<LaneDto>.Ok(new LaneDto(lane.Id, lane.ClientId, lane.Client.Name,
            lane.OriginCity, lane.OriginState, lane.DestinationCity, lane.DestinationState,
            lane.Mode, lane.IsActive, lane.CreatedAt)));
    }

    [HttpPost]
    [Authorize(Policy = "ManagerUp")]
    public async Task<ActionResult<ApiResult<LaneDto>>> Create([FromBody] CreateLaneRequest request, CancellationToken cancellationToken)
    {
        var v = await _createValidator.ValidateAsync(request, cancellationToken);
        if (!v.IsValid) return BadRequest(ApiResult<LaneDto>.Fail(string.Join("; ", v.Errors.Select(e => e.ErrorMessage))));
        var clientExists = await _db.Clients.AnyAsync(c => c.Id == request.ClientId && c.IsActive, cancellationToken);
        if (!clientExists) return BadRequest(ApiResult<LaneDto>.Fail("Client not found or inactive."));
        var lane = new Lane
        {
            ClientId = request.ClientId,
            OriginCity = request.OriginCity.Trim(),
            OriginState = request.OriginState.Trim().ToUpperInvariant(),
            DestinationCity = request.DestinationCity.Trim(),
            DestinationState = request.DestinationState.Trim().ToUpperInvariant(),
            Mode = request.Mode
        };
        _db.Lanes.Add(lane);
        await _db.SaveChangesAsync(cancellationToken);
        var clientName = (await _db.Clients.FindAsync([request.ClientId], cancellationToken))!.Name;
        var dto = new LaneDto(lane.Id, lane.ClientId, clientName, lane.OriginCity, lane.OriginState,
            lane.DestinationCity, lane.DestinationState, lane.Mode, lane.IsActive, lane.CreatedAt);
        return CreatedAtAction(nameof(GetById), new { id = lane.Id }, ApiResult<LaneDto>.Ok(dto));
    }

    [HttpPut("{id:int}")]
    [Authorize(Policy = "ManagerUp")]
    public async Task<ActionResult<ApiResult<LaneDto>>> Update(int id, [FromBody] UpdateLaneRequest request, CancellationToken cancellationToken)
    {
        var v = await _updateValidator.ValidateAsync(request, cancellationToken);
        if (!v.IsValid) return BadRequest(ApiResult<LaneDto>.Fail(string.Join("; ", v.Errors.Select(e => e.ErrorMessage))));
        var lane = await _db.Lanes.Include(l => l.Client).FirstOrDefaultAsync(l => l.Id == id, cancellationToken);
        if (lane is null) return NotFound(ApiResult<LaneDto>.Fail("Lane not found."));
        lane.OriginCity = request.OriginCity.Trim();
        lane.OriginState = request.OriginState.Trim().ToUpperInvariant();
        lane.DestinationCity = request.DestinationCity.Trim();
        lane.DestinationState = request.DestinationState.Trim().ToUpperInvariant();
        lane.Mode = request.Mode; lane.IsActive = request.IsActive;
        await _db.SaveChangesAsync(cancellationToken);
        return Ok(ApiResult<LaneDto>.Ok(new LaneDto(lane.Id, lane.ClientId, lane.Client.Name,
            lane.OriginCity, lane.OriginState, lane.DestinationCity, lane.DestinationState,
            lane.Mode, lane.IsActive, lane.CreatedAt)));
    }

    [HttpDelete("{id:int}")]
    [Authorize(Policy = "AdminOnly")]
    public async Task<IActionResult> Delete(int id, CancellationToken cancellationToken)
    {
        var rows = await _db.Lanes.Where(l => l.Id == id)
            .ExecuteUpdateAsync(s => s.SetProperty(l => l.IsActive, false), cancellationToken);
        if (rows == 0) return NotFound(new { success = false, error = "Lane not found." });
        return Ok(new { success = true });
    }
}
