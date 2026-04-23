using FluentValidation;
using TCG.FreightBroker.Contracts.Users;

namespace TCG.FreightBroker.Api.Validation;

public class CreateUserValidator : AbstractValidator<CreateUserRequest>
{
    private static readonly string[] ValidRoles = ["Admin", "Manager", "Viewer"];

    public CreateUserValidator()
    {
        RuleFor(x => x.Username).NotEmpty().MaximumLength(100)
            .Matches(@"^[a-zA-Z0-9._\-]+$")
            .WithMessage("Username may only contain letters, numbers, dots, dashes, or underscores.");
        RuleFor(x => x.Pin).NotEmpty().Length(4, 10)
            .Matches(@"^\d+$").WithMessage("PIN must be numeric.");
        RuleFor(x => x.DisplayName).NotEmpty().MaximumLength(200);
        RuleFor(x => x.Role).Must(r => ValidRoles.Contains(r))
            .WithMessage("Role must be Admin, Manager, or Viewer.");
    }
}

public class UpdateUserValidator : AbstractValidator<UpdateUserRequest>
{
    private static readonly string[] ValidRoles = ["Admin", "Manager", "Viewer"];

    public UpdateUserValidator()
    {
        RuleFor(x => x.DisplayName).NotEmpty().MaximumLength(200);
        RuleFor(x => x.Role).Must(r => ValidRoles.Contains(r))
            .WithMessage("Role must be Admin, Manager, or Viewer.");
    }
}

public class ChangeUserPinValidator : AbstractValidator<ChangeUserPinRequest>
{
    public ChangeUserPinValidator()
    {
        RuleFor(x => x.NewPin).NotEmpty().Length(4, 10)
            .Matches(@"^\d+$").WithMessage("PIN must be numeric.");
    }
}
