using FluentValidation;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TCG.FreightBroker.Contracts.Clients;
using TCG.FreightBroker.Contracts.Common;
using TCG.FreightBroker.Domain.Entities;
using TCG.FreightBroker.Infrastructure.Persistence;

namespace TCG.FreightBroker.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Policy = "ViewerUp")]
public class ClientsController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly IValidator<CreateClientRequest> _createValidator;
    private readonly IValidator<UpdateClientRequest> _updateValidator;

    public ClientsController(AppDbContext db,
        IValidator<CreateClientRequest> createValidator,
        IValidator<UpdateClientRequest> updateValidator)
    {
        _db = db; _createValidator = createValidator; _updateValidator = updateValidator;
    }

    [HttpGet]
    public async Task<ActionResult<ApiResult<PagedResult<ClientDto>>>> GetAll(
        [FromQuery] int page = 1, [FromQuery] int pageSize = 25,
        [FromQuery] bool? isActive = null, CancellationToken cancellationToken = default)
    {
        page = Math.Max(1, page); pageSize = Math.Clamp(pageSize, 1, 100);
        var query = _db.Clients.AsNoTracking();
        if (isActive.HasValue) query = query.Where(c => c.IsActive == isActive.Value);
        var total = await query.CountAsync(cancellationToken);
        var items = await query.OrderBy(c => c.Name).Skip((page - 1) * pageSize).Take(pageSize)
            .Select(c => new ClientDto(c.Id, c.Name, c.IsActive, c.CreatedAt)).ToListAsync(cancellationToken);
        return Ok(ApiResult<PagedResult<ClientDto>>.Ok(new PagedResult<ClientDto> { Items = items, Page = page, PageSize = pageSize, TotalCount = total }));
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<ApiResult<ClientDto>>> GetById(int id, CancellationToken cancellationToken)
    {
        var c = await _db.Clients.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id, cancellationToken);
        if (c is null) return NotFound(ApiResult<ClientDto>.Fail("Client not found."));
        return Ok(ApiResult<ClientDto>.Ok(new ClientDto(c.Id, c.Name, c.IsActive, c.CreatedAt)));
    }

    [HttpPost]
    [Authorize(Policy = "ManagerUp")]
    public async Task<ActionResult<ApiResult<ClientDto>>> Create([FromBody] CreateClientRequest request, CancellationToken cancellationToken)
    {
        var v = await _createValidator.ValidateAsync(request, cancellationToken);
        if (!v.IsValid) return BadRequest(ApiResult<ClientDto>.Fail(string.Join("; ", v.Errors.Select(e => e.ErrorMessage))));
        var client = new Client { Name = request.Name.Trim() };
        _db.Clients.Add(client);
        await _db.SaveChangesAsync(cancellationToken);
        var dto = new ClientDto(client.Id, client.Name, client.IsActive, client.CreatedAt);
        return CreatedAtAction(nameof(GetById), new { id = client.Id }, ApiResult<ClientDto>.Ok(dto));
    }

    [HttpPut("{id:int}")]
    [Authorize(Policy = "ManagerUp")]
    public async Task<ActionResult<ApiResult<ClientDto>>> Update(int id, [FromBody] UpdateClientRequest request, CancellationToken cancellationToken)
    {
        var v = await _updateValidator.ValidateAsync(request, cancellationToken);
        if (!v.IsValid) return BadRequest(ApiResult<ClientDto>.Fail(string.Join("; ", v.Errors.Select(e => e.ErrorMessage))));
        var client = await _db.Clients.FindAsync([id], cancellationToken);
        if (client is null) return NotFound(ApiResult<ClientDto>.Fail("Client not found."));
        client.Name = request.Name.Trim(); client.IsActive = request.IsActive;
        await _db.SaveChangesAsync(cancellationToken);
        return Ok(ApiResult<ClientDto>.Ok(new ClientDto(client.Id, client.Name, client.IsActive, client.CreatedAt)));
    }

    [HttpDelete("{id:int}")]
    [Authorize(Policy = "AdminOnly")]
    public async Task<IActionResult> Delete(int id, CancellationToken cancellationToken)
    {
        var rows = await _db.Clients.Where(c => c.Id == id)
            .ExecuteUpdateAsync(s => s.SetProperty(c => c.IsActive, false), cancellationToken);
        if (rows == 0) return NotFound(new { success = false, error = "Client not found." });
        return Ok(new { success = true });
    }
}
