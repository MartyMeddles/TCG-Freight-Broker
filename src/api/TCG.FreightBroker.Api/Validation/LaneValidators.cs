using FluentValidation;
using TCG.FreightBroker.Contracts.Lanes;

namespace TCG.FreightBroker.Api.Validation;

public class CreateLaneValidator : AbstractValidator<CreateLaneRequest>
{
    private static readonly string[] ValidModes = ["TL", "LTL", "Dray"];

    public CreateLaneValidator()
    {
        RuleFor(x => x.ClientId).GreaterThan(0);
        RuleFor(x => x.OriginCity).NotEmpty().MaximumLength(100);
        RuleFor(x => x.OriginState).NotEmpty().Length(2);
        RuleFor(x => x.DestinationCity).NotEmpty().MaximumLength(100);
        RuleFor(x => x.DestinationState).NotEmpty().Length(2);
        RuleFor(x => x.Mode).Must(m => ValidModes.Contains(m))
            .WithMessage("Mode must be TL, LTL, or Dray.");
    }
}

public class UpdateLaneValidator : AbstractValidator<UpdateLaneRequest>
{
    private static readonly string[] ValidModes = ["TL", "LTL", "Dray"];

    public UpdateLaneValidator()
    {
        RuleFor(x => x.OriginCity).NotEmpty().MaximumLength(100);
        RuleFor(x => x.OriginState).NotEmpty().Length(2);
        RuleFor(x => x.DestinationCity).NotEmpty().MaximumLength(100);
        RuleFor(x => x.DestinationState).NotEmpty().Length(2);
        RuleFor(x => x.Mode).Must(m => ValidModes.Contains(m))
            .WithMessage("Mode must be TL, LTL, or Dray.");
    }
}
