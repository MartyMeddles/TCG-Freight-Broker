using FluentValidation;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TCG.FreightBroker.Application.Integrations;
using TCG.FreightBroker.Contracts.Common;
using TCG.FreightBroker.Contracts.Loads;
using TCG.FreightBroker.Domain.Entities;
using TCG.FreightBroker.Infrastructure.Persistence;

namespace TCG.FreightBroker.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Policy = "ViewerUp")]
public partial class LoadsController : ControllerBase
{
    [LoggerMessage(Level = LogLevel.Warning, Message = "[E2OPEN] Manual push failed for {Ref}: {Message}")]
    private static partial void LogE2openFailed(ILogger logger, string @ref, string message);

    [LoggerMessage(Level = LogLevel.Warning, Message = "[E2OPEN] Exception pushing {Ref}")]
    private static partial void LogE2openException(ILogger logger, string @ref, Exception ex);
    private readonly AppDbContext _db;
    private readonly IValidator<CreateLoadRequest> _createValidator;
    private readonly IValidator<UpdateLoadStatusRequest> _statusValidator;
    private readonly IE2openService _e2open;
    private readonly ILogger<LoadsController> _logger;

    public LoadsController(AppDbContext db,
        IValidator<CreateLoadRequest> createValidator,
        IValidator<UpdateLoadStatusRequest> statusValidator,
        IE2openService e2open,
        ILogger<LoadsController> logger)
    {
        _db = db; _createValidator = createValidator; _statusValidator = statusValidator;
        _e2open = e2open; _logger = logger;
    }

    [HttpGet]
    public async Task<ActionResult<ApiResult<PagedResult<LoadDto>>>> GetAll(
        [FromQuery] int page = 1, [FromQuery] int pageSize = 25,
        [FromQuery] int? laneId = null, [FromQuery] string? status = null,
        CancellationToken cancellationToken = default)
    {
        page = Math.Max(1, page); pageSize = Math.Clamp(pageSize, 1, 100);
        var query = _db.Loads.AsNoTracking();
        if (laneId.HasValue) query = query.Where(l => l.LaneId == laneId.Value);
        if (!string.IsNullOrWhiteSpace(status)) query = query.Where(l => l.Status == status);
        var total = await query.CountAsync(cancellationToken);
        var items = await query.OrderByDescending(l => l.PickupDate).Skip((page - 1) * pageSize).Take(pageSize)
            .Select(l => new LoadDto(l.Id, l.LaneId, l.ReferenceNumber, l.PickupDate, l.DeliveryDate,
                l.TargetRate, l.BookedRate, l.Status, l.IsAutoBooked, l.CreatedAt))
            .ToListAsync(cancellationToken);
        return Ok(ApiResult<PagedResult<LoadDto>>.Ok(new PagedResult<LoadDto> { Items = items, Page = page, PageSize = pageSize, TotalCount = total }));
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<ApiResult<LoadDto>>> GetById(int id, CancellationToken cancellationToken)
    {
        var load = await _db.Loads.AsNoTracking().FirstOrDefaultAsync(l => l.Id == id, cancellationToken);
        if (load is null) return NotFound(ApiResult<LoadDto>.Fail("Load not found."));
        return Ok(ApiResult<LoadDto>.Ok(new LoadDto(load.Id, load.LaneId, load.ReferenceNumber,
            load.PickupDate, load.DeliveryDate, load.TargetRate, load.BookedRate,
            load.Status, load.IsAutoBooked, load.CreatedAt)));
    }

    [HttpPost]
    [Authorize(Policy = "ManagerUp")]
    public async Task<ActionResult<ApiResult<LoadDto>>> Create([FromBody] CreateLoadRequest request, CancellationToken cancellationToken)
    {
        var v = await _createValidator.ValidateAsync(request, cancellationToken);
        if (!v.IsValid) return BadRequest(ApiResult<LoadDto>.Fail(string.Join("; ", v.Errors.Select(e => e.ErrorMessage))));
        var laneExists = await _db.Lanes.AnyAsync(l => l.Id == request.LaneId && l.IsActive, cancellationToken);
        if (!laneExists) return BadRequest(ApiResult<LoadDto>.Fail("Lane not found or inactive."));
        var load = new Load
        {
            LaneId = request.LaneId, ReferenceNumber = request.ReferenceNumber.Trim(),
            PickupDate = request.PickupDate, DeliveryDate = request.DeliveryDate,
            TargetRate = request.TargetRate, Status = "Pending"
        };
        _db.Loads.Add(load);
        await _db.SaveChangesAsync(cancellationToken);
        var dto = new LoadDto(load.Id, load.LaneId, load.ReferenceNumber, load.PickupDate, load.DeliveryDate,
            load.TargetRate, load.BookedRate, load.Status, load.IsAutoBooked, load.CreatedAt);
        return CreatedAtAction(nameof(GetById), new { id = load.Id }, ApiResult<LoadDto>.Ok(dto));
    }

    [HttpGet("stats")]
    public async Task<ActionResult<ApiResult<object>>> GetStats(CancellationToken cancellationToken)
    {
        var todayUtc = DateTimeOffset.UtcNow.Date;
        var tomorrowUtc = todayUtc.AddDays(1);

        var statusCounts = await _db.Loads.AsNoTracking()
            .GroupBy(l => l.Status)
            .Select(g => new { Status = g.Key, Count = g.Count() })
            .ToListAsync(cancellationToken);

        int Count(string s) => statusCounts.FirstOrDefault(x => x.Status == s)?.Count ?? 0;

        var autoBookedToday = await _db.Loads.AsNoTracking()
            .CountAsync(l => l.IsAutoBooked && l.CreatedAt >= todayUtc && l.CreatedAt < tomorrowUtc, cancellationToken);

        return Ok(ApiResult<object>.Ok(new
        {
            total = statusCounts.Sum(x => x.Count),
            pending = Count("Pending"),
            accepted = Count("Accepted"),
            rejected = Count("Rejected"),
            booked = Count("Booked"),
            autoBookedToday,
        }));
    }

    [HttpPatch("{id:int}/status")]
    [Authorize(Policy = "ManagerUp")]
    public async Task<ActionResult<ApiResult<LoadDto>>> UpdateStatus(int id, [FromBody] UpdateLoadStatusRequest request, CancellationToken cancellationToken)
    {
        var v = await _statusValidator.ValidateAsync(request, cancellationToken);
        if (!v.IsValid) return BadRequest(ApiResult<LoadDto>.Fail(string.Join("; ", v.Errors.Select(e => e.ErrorMessage))));

        var load = await _db.Loads.Include(l => l.Lane).FirstOrDefaultAsync(l => l.Id == id, cancellationToken);
        if (load is null) return NotFound(ApiResult<LoadDto>.Fail("Load not found."));

        load.Status = request.Status;
        if (request.BookedRate.HasValue) load.BookedRate = request.BookedRate;
        await _db.SaveChangesAsync(cancellationToken);

        // Push to e2open when a load is manually confirmed as Booked.
        if (request.Status == "Booked" && load.BookedRate.HasValue)
        {
            string origin = $"{load.Lane.OriginCity}, {load.Lane.OriginState}";
            string dest = $"{load.Lane.DestinationCity}, {load.Lane.DestinationState}";
            try
            {
                var pushResult = await _e2open.PushLoadAsync(
                    load.Id, load.ReferenceNumber,
                    origin, dest,
                    load.BookedRate.Value, load.PickupDate, cancellationToken);

                if (!pushResult.Success)
                    LogE2openFailed(_logger, load.ReferenceNumber, pushResult.Message);
            }
            catch (Exception ex)
            {
                LogE2openException(_logger, load.ReferenceNumber, ex);
            }
        }

        return Ok(ApiResult<LoadDto>.Ok(new LoadDto(load.Id, load.LaneId, load.ReferenceNumber,
            load.PickupDate, load.DeliveryDate, load.TargetRate, load.BookedRate,
            load.Status, load.IsAutoBooked, load.CreatedAt)));
    }
}
