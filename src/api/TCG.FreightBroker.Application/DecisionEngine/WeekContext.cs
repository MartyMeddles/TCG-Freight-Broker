namespace TCG.FreightBroker.Application.DecisionEngine;

/// <summary>Fiscal-week context fed into the evaluator for urgency calculations.</summary>
public record WeekContext
{
    /// <summary>Calendar days remaining in the current fiscal week (0 = Saturday).</summary>
    public int DaysRemaining { get; init; }
}
