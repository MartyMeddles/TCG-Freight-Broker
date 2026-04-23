namespace TCG.FreightBroker.Application.DecisionEngine;

public enum Recommendation
{
    /// <summary>All rules pass — book automatically.</summary>
    AutoAccept,

    /// <summary>Contract obligation is behind — book to meet commitment.</summary>
    ContractBook,

    /// <summary>One or more critical rules failed — requires manual review.</summary>
    Review
}
