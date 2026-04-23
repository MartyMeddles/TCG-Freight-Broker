using FluentValidation;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TCG.FreightBroker.Contracts.Common;
using TCG.FreightBroker.Contracts.Users;
using TCG.FreightBroker.Domain.Entities;
using TCG.FreightBroker.Infrastructure.Auth;
using TCG.FreightBroker.Infrastructure.Persistence;

namespace TCG.FreightBroker.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Policy = "AdminOnly")]
public class UsersController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly IPinHasher _pinHasher;
    private readonly IValidator<CreateUserRequest> _createValidator;
    private readonly IValidator<UpdateUserRequest> _updateValidator;
    private readonly IValidator<ChangeUserPinRequest> _pinValidator;

    public UsersController(AppDbContext db, IPinHasher pinHasher,
        IValidator<CreateUserRequest> createValidator,
        IValidator<UpdateUserRequest> updateValidator,
        IValidator<ChangeUserPinRequest> pinValidator)
    {
        _db = db; _pinHasher = pinHasher;
        _createValidator = createValidator; _updateValidator = updateValidator; _pinValidator = pinValidator;
    }

    [HttpGet]
    public async Task<ActionResult<ApiResult<PagedResult<UserDto>>>> GetAll(
        [FromQuery] int page = 1, [FromQuery] int pageSize = 25, CancellationToken cancellationToken = default)
    {
        page = Math.Max(1, page); pageSize = Math.Clamp(pageSize, 1, 100);
        var total = await _db.AppUsers.CountAsync(cancellationToken);
        var items = await _db.AppUsers.AsNoTracking().OrderBy(u => u.Username)
            .Skip((page - 1) * pageSize).Take(pageSize)
            .Select(u => new UserDto(u.Id, u.Username, u.DisplayName, u.Role, u.IsActive, u.CreatedAt, u.LastLoginAt))
            .ToListAsync(cancellationToken);
        return Ok(ApiResult<PagedResult<UserDto>>.Ok(new PagedResult<UserDto> { Items = items, Page = page, PageSize = pageSize, TotalCount = total }));
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<ApiResult<UserDto>>> GetById(Guid id, CancellationToken cancellationToken)
    {
        var user = await _db.AppUsers.AsNoTracking().FirstOrDefaultAsync(u => u.Id == id, cancellationToken);
        if (user is null) return NotFound(ApiResult<UserDto>.Fail("User not found."));
        return Ok(ApiResult<UserDto>.Ok(new UserDto(user.Id, user.Username, user.DisplayName,
            user.Role, user.IsActive, user.CreatedAt, user.LastLoginAt)));
    }

    [HttpPost]
    public async Task<ActionResult<ApiResult<UserDto>>> Create([FromBody] CreateUserRequest request, CancellationToken cancellationToken)
    {
        var v = await _createValidator.ValidateAsync(request, cancellationToken);
        if (!v.IsValid) return BadRequest(ApiResult<UserDto>.Fail(string.Join("; ", v.Errors.Select(e => e.ErrorMessage))));
        var username = request.Username.Trim().ToLowerInvariant();
        if (await _db.AppUsers.AnyAsync(u => u.Username == username, cancellationToken))
            return Conflict(ApiResult<UserDto>.Fail("Username already exists."));
        var user = new AppUser
        {
            Id = Guid.NewGuid(), Username = username, PinHash = _pinHasher.Hash(request.Pin),
            DisplayName = request.DisplayName.Trim(), Role = request.Role
        };
        _db.AppUsers.Add(user);
        await _db.SaveChangesAsync(cancellationToken);
        var dto = new UserDto(user.Id, user.Username, user.DisplayName, user.Role, user.IsActive, user.CreatedAt, user.LastLoginAt);
        return CreatedAtAction(nameof(GetById), new { id = user.Id }, ApiResult<UserDto>.Ok(dto));
    }

    [HttpPut("{id:guid}")]
    public async Task<ActionResult<ApiResult<UserDto>>> Update(Guid id, [FromBody] UpdateUserRequest request, CancellationToken cancellationToken)
    {
        var v = await _updateValidator.ValidateAsync(request, cancellationToken);
        if (!v.IsValid) return BadRequest(ApiResult<UserDto>.Fail(string.Join("; ", v.Errors.Select(e => e.ErrorMessage))));
        var user = await _db.AppUsers.FindAsync([id], cancellationToken);
        if (user is null) return NotFound(ApiResult<UserDto>.Fail("User not found."));
        user.DisplayName = request.DisplayName.Trim(); user.Role = request.Role; user.IsActive = request.IsActive;
        await _db.SaveChangesAsync(cancellationToken);
        return Ok(ApiResult<UserDto>.Ok(new UserDto(user.Id, user.Username, user.DisplayName,
            user.Role, user.IsActive, user.CreatedAt, user.LastLoginAt)));
    }

    [HttpPatch("{id:guid}/pin")]
    public async Task<IActionResult> ChangePin(Guid id, [FromBody] ChangeUserPinRequest request, CancellationToken cancellationToken)
    {
        var v = await _pinValidator.ValidateAsync(request, cancellationToken);
        if (!v.IsValid) return BadRequest(new { success = false, error = string.Join("; ", v.Errors.Select(e => e.ErrorMessage)) });
        var rows = await _db.AppUsers.Where(u => u.Id == id)
            .ExecuteUpdateAsync(s => s.SetProperty(u => u.PinHash, _pinHasher.Hash(request.NewPin)), cancellationToken);
        if (rows == 0) return NotFound(new { success = false, error = "User not found." });
        return Ok(new { success = true });
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken cancellationToken)
    {
        var rows = await _db.AppUsers.Where(u => u.Id == id)
            .ExecuteUpdateAsync(s => s.SetProperty(u => u.IsActive, false), cancellationToken);
        if (rows == 0) return NotFound(new { success = false, error = "User not found." });
        return Ok(new { success = true });
    }
}
