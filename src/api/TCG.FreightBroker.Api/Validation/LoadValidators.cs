using FluentValidation;
using TCG.FreightBroker.Contracts.Loads;

namespace TCG.FreightBroker.Api.Validation;

public class CreateLoadValidator : AbstractValidator<CreateLoadRequest>
{
    public CreateLoadValidator()
    {
        RuleFor(x => x.LaneId).GreaterThan(0);
        RuleFor(x => x.ReferenceNumber).NotEmpty().MaximumLength(50);
        RuleFor(x => x.PickupDate).NotEmpty();
        RuleFor(x => x.DeliveryDate).GreaterThan(x => x.PickupDate)
            .WithMessage("Delivery date must be after pickup date.");
        RuleFor(x => x.TargetRate).GreaterThan(0);
    }
}

public class UpdateLoadStatusValidator : AbstractValidator<UpdateLoadStatusRequest>
{
    private static readonly string[] ValidStatuses = ["Pending", "Accepted", "Rejected", "Booked"];

    public UpdateLoadStatusValidator()
    {
        RuleFor(x => x.Status).Must(s => ValidStatuses.Contains(s))
            .WithMessage("Status must be Pending, Accepted, Rejected, or Booked.");
        RuleFor(x => x.BookedRate).GreaterThan(0).When(x => x.BookedRate.HasValue);
    }
}
