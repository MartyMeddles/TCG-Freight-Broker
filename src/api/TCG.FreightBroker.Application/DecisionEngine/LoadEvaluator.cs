namespace TCG.FreightBroker.Application.DecisionEngine;

/// <summary>
/// Pure, stateless implementation of the TCG freight-broker AI decision engine.
/// Ported directly from the prototype JavaScript evaluate() function.
/// </summary>
public class LoadEvaluator
{
    private readonly DecisionParameters _p;

    public LoadEvaluator(DecisionParameters? parameters = null)
    {
        _p = parameters ?? new DecisionParameters();
    }

    /// <summary>
    /// Evaluate a single load and return a full decision result with rule audit trail.
    /// </summary>
    /// <param name="load">Financial and lane data for the load.</param>
    /// <param name="currentWeekBookings">How many loads on this lane have already been accepted this week.</param>
    /// <param name="totalUnmetContractLoads">Sum of all unmet minimums across all contract lanes (used for spot-hold check).</param>
    /// <param name="week">Fiscal-week context (days remaining).</param>
    /// <param name="client">Optional client config; when supplied, overrides the global GP floor.</param>
    public EvaluationResult Evaluate(
        LoadInput load,
        int currentWeekBookings,
        int totalUnmetContractLoads,
        WeekContext week,
        ClientConfig? client = null)
    {
        var rules = new List<RuleResult>();
        bool pass = true;
        bool ctrNeed = false;
        bool gpBlocked = false;
        bool clientHold = false;

        decimal gpFloor = client is not null ? client.GpTarget : _p.CtrGPFloor;

        // ── Rule: CLIENT ──────────────────────────────────────────────────────
        if (client is not null)
        {
            rules.Add(new RuleResult
            {
                RuleName = "CLIENT",
                Status = "pass",
                Description = $"{client.Code} — {client.Name} (GP target: {client.GpTarget}%)",
                Weight = 0
            });

            if (!client.AutoAccept)
            {
                clientHold = true;
                rules.Add(new RuleResult
                {
                    RuleName = "CLIENT HOLD",
                    Status = "warn",
                    Description = $"Auto-accept disabled for {client.Code}",
                    Weight = -100
                });
            }
        }

        // ── Rule: CONTRACT MIN / SPOT HOLD ────────────────────────────────────
        if (load.IsContract && load.WeeklyMinimum.HasValue)
        {
            int remaining = Math.Max(0, load.WeeklyMinimum.Value - currentWeekBookings);

            if (remaining > 0)
            {
                ctrNeed = true;
                string rpd = week.DaysRemaining > 0
                    ? ((decimal)remaining / week.DaysRemaining).ToString("F1", System.Globalization.CultureInfo.InvariantCulture)
                    : "∞";

                rules.Add(new RuleResult
                {
                    RuleName = "CONTRACT MIN",
                    Status = "fail",
                    Description = $"{currentWeekBookings}/{load.WeeklyMinimum}/wk — need {remaining} more ({rpd}/day)",
                    Weight = 100
                });

                if (week.DaysRemaining <= _p.UrgencyDays && remaining > _p.UrgencyLoads)
                {
                    rules.Add(new RuleResult
                    {
                        RuleName = "⚠ CRITICAL",
                        Status = "fail",
                        Description = $"{week.DaysRemaining}d left, {remaining} loads behind",
                        Weight = 50
                    });
                }
            }
            else
            {
                rules.Add(new RuleResult
                {
                    RuleName = "CONTRACT MIN",
                    Status = "pass",
                    Description = $"{currentWeekBookings}/{load.WeeklyMinimum}/wk — MET ✓",
                    Weight = 0
                });
            }
        }
        else if (!load.IsContract)
        {
            if (totalUnmetContractLoads > _p.SpotBlockThreshold)
            {
                rules.Add(new RuleResult
                {
                    RuleName = "SPOT HOLD",
                    Status = "warn",
                    Description = $"{totalUnmetContractLoads} contract loads needed",
                    Weight = -50
                });
            }
            else
            {
                rules.Add(new RuleResult
                {
                    RuleName = "CONTRACTS OK",
                    Status = "pass",
                    Description = "Obligations met, spot approved",
                    Weight = 0
                });
            }
        }

        // ── Rule: CTR RATE GP ─────────────────────────────────────────────────
        decimal ctrRate = load.ContractRate > 0 ? load.ContractRate : load.CustomerRate;
        decimal ctrGP = ctrRate > 0
            ? Math.Round((ctrRate - load.CarrierCost) / ctrRate * 100m, 1)
            : 0m;

        if (ctrGP >= gpFloor)
        {
            rules.Add(new RuleResult
            {
                RuleName = "CTR RATE GP",
                Status = "pass",
                Description = $"{ctrGP}% >= {gpFloor}%{(client is not null ? $" ({client.Code})" : "")} (ctr ${ctrRate} − carrier ${load.CarrierCost})",
                Weight = 15
            });
        }
        else
        {
            gpBlocked = true;
            rules.Add(new RuleResult
            {
                RuleName = "CTR RATE GP",
                Status = "fail",
                Description = $"{ctrGP}% < {gpFloor}%{(client is not null ? $" ({client.Code})" : " (global)")} — NO AUTO-ACCEPT",
                Weight = -25
            });
        }

        // ── Rule: Margin ──────────────────────────────────────────────────────
        decimal marginMin = ctrNeed ? _p.CtrMarginFloor
                          : load.IsContract ? _p.CtrMarginNormal
                          : _p.SpotMarginFloor;

        if (load.Margin >= marginMin)
        {
            rules.Add(new RuleResult
            {
                RuleName = "Margin",
                Status = "pass",
                Description = $"{load.Margin}% >= {marginMin}%",
                Weight = 10
            });
        }
        else if (ctrNeed && _p.CtrOverrideMargin)
        {
            rules.Add(new RuleResult
            {
                RuleName = "Margin",
                Status = "warn",
                Description = $"{load.Margin}% < {marginMin}% — OVERRIDE",
                Weight = 5
            });
        }
        else
        {
            rules.Add(new RuleResult
            {
                RuleName = "Margin",
                Status = "fail",
                Description = $"{load.Margin}% < {marginMin}%",
                Weight = -20
            });
            pass = false;
        }

        // ── Rule: Profit ──────────────────────────────────────────────────────
        if (load.Profit > 0)
        {
            rules.Add(new RuleResult
            {
                RuleName = "Profit",
                Status = "pass",
                Description = $"+${load.Profit:N0}",
                Weight = 10
            });
        }
        else if (ctrNeed && _p.CtrOverrideProfit)
        {
            rules.Add(new RuleResult
            {
                RuleName = "Profit",
                Status = "warn",
                Description = $"${load.Profit:N0} — OVERRIDE",
                Weight = 5
            });
        }
        else
        {
            rules.Add(new RuleResult
            {
                RuleName = "Profit",
                Status = "fail",
                Description = $"${load.Profit:N0}",
                Weight = -20
            });
            pass = false;
        }

        // ── Rule: DAT Spot ────────────────────────────────────────────────────
        decimal datCeiling = load.SpotRate * (1m + _p.DatTolerance / 100m);

        if (load.CarrierCost <= datCeiling)
        {
            rules.Add(new RuleResult
            {
                RuleName = "DAT Spot",
                Status = "pass",
                Description = $"${load.CarrierCost} <= ${load.SpotRate} (+{_p.DatTolerance}%)",
                Weight = 5
            });
        }
        else
        {
            rules.Add(new RuleResult
            {
                RuleName = "DAT Spot",
                Status = "warn",
                Description = $"${load.CarrierCost} > ${load.SpotRate} (+{_p.DatTolerance}%)",
                Weight = -5
            });
        }

        // ── Rule: Insurance (cross-border) ────────────────────────────────────
        if (load.NeedsInsurance)
        {
            rules.Add(new RuleResult
            {
                RuleName = "Insurance",
                Status = "fail",
                Description = "Required for cross-border",
                Weight = -30
            });

            if (!ctrNeed)
                pass = false;
        }

        // ── Final recommendation ──────────────────────────────────────────────
        Recommendation rec;
        if (gpBlocked || clientHold)
            rec = Recommendation.Review;
        else if (ctrNeed)
            rec = Recommendation.ContractBook;
        else if (pass)
            rec = Recommendation.AutoAccept;
        else
            rec = Recommendation.Review;

        return new EvaluationResult
        {
            Pass = pass && !gpBlocked && !clientHold,
            Rules = rules,
            Recommendation = rec,
            Score = rules.Sum(r => r.Weight),
            ContractNeed = ctrNeed,
            GpBlocked = gpBlocked,
            ContractGP = ctrGP,
            ClientCode = client?.Code,
            GpFloor = gpFloor
        };
    }
}
