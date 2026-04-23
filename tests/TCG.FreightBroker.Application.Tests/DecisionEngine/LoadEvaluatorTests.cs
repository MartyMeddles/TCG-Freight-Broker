namespace TCG.FreightBroker.Application.Tests.DecisionEngine;

/// <summary>
/// Golden-file style tests for LoadEvaluator.
/// Each test pins a specific scenario from the business rules described in the prototype.
/// Parameters use the defaults from DecisionParameters unless overridden.
/// </summary>
public class LoadEvaluatorTests
{
    private static readonly WeekContext MidWeek = new() { DaysRemaining = 4 };
    private static readonly WeekContext EndOfWeek = new() { DaysRemaining = 1 };

    // ── Helpers ───────────────────────────────────────────────────────────────

    /// <summary>
    /// Builds a contract load that meets all financial thresholds by default.
    /// Caller can use `with` to override individual fields.
    /// </summary>
    private static LoadInput GoodContractLoad() => new()
    {
        Lane = "Chicago-Dallas",
        CarrierCost = 2_000m,
        CustomerRate = 2_500m,
        ContractRate = 2_500m,
        Profit = 500m,           // 500 / 2500 = 20 %
        Margin = 20m,
        SpotRate = 2_100m,       // carrier is well within +5 % of spot
        ContractGP = 20m,        // (2500 - 2000) / 2500 = 20 % >= 10 % floor
        IsContract = true,
        WeeklyMinimum = 5
    };

    /// <summary>Spot load that passes all rules.</summary>
    private static LoadInput GoodSpotLoad() => new()
    {
        Lane = "Memphis-Atlanta",
        CarrierCost = 1_800m,
        CustomerRate = 2_300m,
        ContractRate = 0m,
        Profit = 500m,
        Margin = 21.7m,          // > 14 % spot floor
        SpotRate = 1_900m,       // 1800 <= 1900 * 1.05 = 1995 ✓
        ContractGP = 0m,
        IsContract = false,
        WeeklyMinimum = null
    };

    // ═════════════════════════════════════════════════════════════════════════
    // 1 — AUTO-ACCEPT: contract load, obligation met, all rules pass
    // ═════════════════════════════════════════════════════════════════════════
    [Fact]
    public void AutoAccept_ContractLoad_AllRulesPass()
    {
        var sut = new LoadEvaluator();
        var load = GoodContractLoad();

        var result = sut.Evaluate(load,
            currentWeekBookings: 5,       // obligation met (5/5)
            totalUnmetContractLoads: 0,
            week: MidWeek);

        result.Recommendation.Should().Be(Recommendation.AutoAccept);
        result.Pass.Should().BeTrue();
        result.GpBlocked.Should().BeFalse();
        result.ContractNeed.Should().BeFalse();
        RuleNamed(result, "CONTRACT MIN").Status.Should().Be("pass");
        RuleNamed(result, "CTR RATE GP").Status.Should().Be("pass");
        RuleNamed(result, "Margin").Status.Should().Be("pass");
        RuleNamed(result, "Profit").Status.Should().Be("pass");
    }

    // ═════════════════════════════════════════════════════════════════════════
    // 2 — CONTRACT-BOOK: obligation deficit, all financials OK
    // ═════════════════════════════════════════════════════════════════════════
    [Fact]
    public void ContractBook_WhenObligationDeficit()
    {
        var sut = new LoadEvaluator();
        var load = GoodContractLoad();

        var result = sut.Evaluate(load,
            currentWeekBookings: 2,       // 2/5 — deficit of 3
            totalUnmetContractLoads: 3,
            week: MidWeek);

        result.Recommendation.Should().Be(Recommendation.ContractBook);
        result.ContractNeed.Should().BeTrue();
        result.Pass.Should().BeTrue();
        RuleNamed(result, "CONTRACT MIN").Status.Should().Be("fail");
        RuleNamed(result, "CONTRACT MIN").Weight.Should().Be(100);
    }

    // ═════════════════════════════════════════════════════════════════════════
    // 3 — AUTO-ACCEPT: spot load, no unmet contracts
    // ═════════════════════════════════════════════════════════════════════════
    [Fact]
    public void AutoAccept_SpotLoad_NoContractPressure()
    {
        var sut = new LoadEvaluator();

        var result = sut.Evaluate(GoodSpotLoad(),
            currentWeekBookings: 0,
            totalUnmetContractLoads: 0,
            week: MidWeek);

        result.Recommendation.Should().Be(Recommendation.AutoAccept);
        result.Pass.Should().BeTrue();
        RuleNamed(result, "CONTRACTS OK").Status.Should().Be("pass");
    }

    // ═════════════════════════════════════════════════════════════════════════
    // 4 — REVIEW: GP block — contract-rate GP below floor
    // ═════════════════════════════════════════════════════════════════════════
    [Fact]
    public void Review_WhenGpBelowFloor()
    {
        var sut = new LoadEvaluator();
        // ctrGP = (2500 - 2400) / 2500 = 4 % < 10 % floor
        var load = GoodContractLoad() with
        {
            CarrierCost = 2_400m,
            Profit = 100m,
            Margin = 4m
        };

        var result = sut.Evaluate(load,
            currentWeekBookings: 5,
            totalUnmetContractLoads: 0,
            week: MidWeek);

        result.Recommendation.Should().Be(Recommendation.Review);
        result.GpBlocked.Should().BeTrue();
        result.Pass.Should().BeFalse();
        RuleNamed(result, "CTR RATE GP").Status.Should().Be("fail");
        RuleNamed(result, "CTR RATE GP").Weight.Should().Be(-25);
    }

    // ═════════════════════════════════════════════════════════════════════════
    // 5 — REVIEW: client hold — autoAccept disabled
    // ═════════════════════════════════════════════════════════════════════════
    [Fact]
    public void Review_WhenClientAutoAcceptDisabled()
    {
        var sut = new LoadEvaluator();
        var client = new ClientConfig
        {
            Code = "PFG",
            Name = "Performance Food Group",
            GpTarget = 10m,
            AutoAccept = false
        };

        var result = sut.Evaluate(GoodContractLoad() with { ClientCode = "PFG" },
            currentWeekBookings: 5,
            totalUnmetContractLoads: 0,
            week: MidWeek,
            client: client);

        result.Recommendation.Should().Be(Recommendation.Review);
        result.Pass.Should().BeFalse();
        RuleNamed(result, "CLIENT HOLD").Status.Should().Be("warn");
        RuleNamed(result, "CLIENT HOLD").Weight.Should().Be(-100);
    }

    // ═════════════════════════════════════════════════════════════════════════
    // 6 — REVIEW: spot load, margin below 14 % floor
    // ═════════════════════════════════════════════════════════════════════════
    [Fact]
    public void Review_SpotLoad_MarginBelowFloor()
    {
        var sut = new LoadEvaluator();
        var load = GoodSpotLoad() with
        {
            Margin = 10m    // < 14 % spot floor
        };

        var result = sut.Evaluate(load,
            currentWeekBookings: 0,
            totalUnmetContractLoads: 0,
            week: MidWeek);

        result.Recommendation.Should().Be(Recommendation.Review);
        result.Pass.Should().BeFalse();
        RuleNamed(result, "Margin").Status.Should().Be("fail");
        RuleNamed(result, "Margin").Weight.Should().Be(-20);
    }

    // ═════════════════════════════════════════════════════════════════════════
    // 7 — REVIEW: negative profit, no contract override (spot)
    // ═════════════════════════════════════════════════════════════════════════
    [Fact]
    public void Review_NegativeProfit_SpotLoad()
    {
        var sut = new LoadEvaluator();
        var load = GoodSpotLoad() with
        {
            CarrierCost = 2_400m,
            Profit = -100m,
            Margin = -4.3m
        };

        var result = sut.Evaluate(load,
            currentWeekBookings: 0,
            totalUnmetContractLoads: 0,
            week: MidWeek);

        result.Recommendation.Should().Be(Recommendation.Review);
        result.Pass.Should().BeFalse();
        RuleNamed(result, "Profit").Status.Should().Be("fail");
        RuleNamed(result, "Profit").Weight.Should().Be(-20);
    }

    // ═════════════════════════════════════════════════════════════════════════
    // 8 — CONTRACT-BOOK with margin override (ctrNeed, margin low but overridden)
    // ═════════════════════════════════════════════════════════════════════════
    [Fact]
    public void ContractBook_LowMargin_OverriddenWhenCtrNeed()
    {
        var sut = new LoadEvaluator(); // CtrOverrideMargin = true
        var load = GoodContractLoad() with
        {
            Margin = 3m    // < CtrMarginFloor (5 %) but override is active
        };

        var result = sut.Evaluate(load,
            currentWeekBookings: 1,   // deficit
            totalUnmetContractLoads: 4,
            week: MidWeek);

        result.Recommendation.Should().Be(Recommendation.ContractBook);
        result.ContractNeed.Should().BeTrue();
        RuleNamed(result, "Margin").Status.Should().Be("warn");
        RuleNamed(result, "Margin").Weight.Should().Be(5);
    }

    // ═════════════════════════════════════════════════════════════════════════
    // 9 — CONTRACT-BOOK with profit override (ctrNeed, negative profit)
    // ═════════════════════════════════════════════════════════════════════════
    [Fact]
    public void ContractBook_NegativeProfit_OverriddenWhenCtrNeed()
    {
        var sut = new LoadEvaluator(); // CtrOverrideProfit = true
        var load = GoodContractLoad() with
        {
            Profit = -50m,
            Margin = 6m     // >= CtrMarginFloor so margin passes
        };

        var result = sut.Evaluate(load,
            currentWeekBookings: 0,
            totalUnmetContractLoads: 5,
            week: MidWeek);

        result.Recommendation.Should().Be(Recommendation.ContractBook);
        RuleNamed(result, "Profit").Status.Should().Be("warn");
        RuleNamed(result, "Profit").Weight.Should().Be(5);
    }

    // ═════════════════════════════════════════════════════════════════════════
    // 10 — CRITICAL urgency rule fires
    // ═════════════════════════════════════════════════════════════════════════
    [Fact]
    public void ContractBook_CriticalRuleFires_WhenUrgentAndBehind()
    {
        var sut = new LoadEvaluator();
        var load = GoodContractLoad() with { WeeklyMinimum = 20 };

        // EndOfWeek = 1 day remaining; need 15 more — triggers CRITICAL (>5)
        var result = sut.Evaluate(load,
            currentWeekBookings: 5,   // 15 short
            totalUnmetContractLoads: 15,
            week: EndOfWeek);

        result.ContractNeed.Should().BeTrue();
        result.Rules.Should().Contain(r => r.RuleName == "⚠ CRITICAL");
        RuleNamed(result, "⚠ CRITICAL").Weight.Should().Be(50);
    }

    // ═════════════════════════════════════════════════════════════════════════
    // 11 — CRITICAL rule does NOT fire when deficit <= urgencyLoads
    // ═════════════════════════════════════════════════════════════════════════
    [Fact]
    public void NoUrgency_WhenRemainingLoadsWithinThreshold()
    {
        var sut = new LoadEvaluator();
        var load = GoodContractLoad() with { WeeklyMinimum = 8 };

        // 1 day left, need 3 more — not > UrgencyLoads (5)
        var result = sut.Evaluate(load,
            currentWeekBookings: 5,
            totalUnmetContractLoads: 3,
            week: EndOfWeek);

        result.Rules.Should().NotContain(r => r.RuleName == "⚠ CRITICAL");
    }

    // ═════════════════════════════════════════════════════════════════════════
    // 12 — SPOT HOLD: too many unmet contract loads
    // ═════════════════════════════════════════════════════════════════════════
    [Fact]
    public void Review_SpotLoad_HeldWhenContractPressureExceedsThreshold()
    {
        var sut = new LoadEvaluator();

        var result = sut.Evaluate(GoodSpotLoad(),
            currentWeekBookings: 0,
            totalUnmetContractLoads: 25,   // > SpotBlockThreshold (20)
            week: MidWeek);

        RuleNamed(result, "SPOT HOLD").Status.Should().Be("warn");
        RuleNamed(result, "SPOT HOLD").Weight.Should().Be(-50);
    }

    // ═════════════════════════════════════════════════════════════════════════
    // 13 — Client GP floor overrides global floor
    // ═════════════════════════════════════════════════════════════════════════
    [Fact]
    public void GpFloor_UsesClientTarget_NotGlobal()
    {
        var sut = new LoadEvaluator(new DecisionParameters { CtrGPFloor = 10m });

        // ctrGP = (2500 - 2125) / 2500 = 15 % — passes global (10 %) but fails client (18 %)
        var load = GoodContractLoad() with { CarrierCost = 2_125m, Profit = 375m, Margin = 15m };
        var client = new ClientConfig { Code = "ACME", Name = "Acme Co", GpTarget = 18m, AutoAccept = true };

        var result = sut.Evaluate(load,
            currentWeekBookings: 5,
            totalUnmetContractLoads: 0,
            week: MidWeek,
            client: client);

        result.GpFloor.Should().Be(18m);
        result.GpBlocked.Should().BeTrue();
        result.Recommendation.Should().Be(Recommendation.Review);
    }

    // ═════════════════════════════════════════════════════════════════════════
    // 14 — DAT Spot warn rule fires when carrier is over tolerance
    // ═════════════════════════════════════════════════════════════════════════
    [Fact]
    public void DatSpotWarn_WhenCarrierExceedsTolerance()
    {
        var sut = new LoadEvaluator();
        // spot = 2000, tolerance = 5 %, ceiling = 2100; carrier = 2200 — over
        var load = GoodContractLoad() with
        {
            CarrierCost = 2_200m,
            SpotRate = 2_000m,
            CustomerRate = 2_800m,
            ContractRate = 2_800m,
            Profit = 600m,
            Margin = 21.4m,
            ContractGP = 21.4m
        };

        var result = sut.Evaluate(load,
            currentWeekBookings: 5,
            totalUnmetContractLoads: 0,
            week: MidWeek);

        RuleNamed(result, "DAT Spot").Status.Should().Be("warn");
        RuleNamed(result, "DAT Spot").Weight.Should().Be(-5);
    }

    // ═════════════════════════════════════════════════════════════════════════
    // 15 — Insurance block on non-critical lane → Review
    // ═════════════════════════════════════════════════════════════════════════
    [Fact]
    public void Review_InsuranceBlock_NonCriticalLane()
    {
        var sut = new LoadEvaluator();
        var load = GoodContractLoad() with
        {
            Lane = "Laredo-Houston",
            NeedsInsurance = true
        };

        var result = sut.Evaluate(load,
            currentWeekBookings: 5,       // obligation met — NOT ctrNeed
            totalUnmetContractLoads: 0,
            week: MidWeek);

        result.Recommendation.Should().Be(Recommendation.Review);
        result.Pass.Should().BeFalse();
        RuleNamed(result, "Insurance").Status.Should().Be("fail");
        RuleNamed(result, "Insurance").Weight.Should().Be(-30);
    }

    // ═════════════════════════════════════════════════════════════════════════
    // 16 — Insurance warning on critical lane does NOT block
    // ═════════════════════════════════════════════════════════════════════════
    [Fact]
    public void ContractBook_InsuranceDoesNotBlock_WhenCtrNeed()
    {
        var sut = new LoadEvaluator();
        var load = GoodContractLoad() with
        {
            Lane = "Laredo-Houston",
            NeedsInsurance = true
        };

        var result = sut.Evaluate(load,
            currentWeekBookings: 1,       // deficit — ctrNeed=true
            totalUnmetContractLoads: 4,
            week: MidWeek);

        result.ContractNeed.Should().BeTrue();
        result.Recommendation.Should().Be(Recommendation.ContractBook);
        // pass can still be true because insurance block is suppressed for ctrNeed
        result.Rules.Should().Contain(r => r.RuleName == "Insurance" && r.Status == "fail");
    }

    // ═════════════════════════════════════════════════════════════════════════
    // 17 — Score is sum of all rule weights
    // ═════════════════════════════════════════════════════════════════════════
    [Fact]
    public void Score_IsSum_OfAllRuleWeights()
    {
        var sut = new LoadEvaluator();

        var result = sut.Evaluate(GoodContractLoad(),
            currentWeekBookings: 5,
            totalUnmetContractLoads: 0,
            week: MidWeek);

        var expected = result.Rules.Sum(r => r.Weight);
        result.Score.Should().Be(expected);
    }

    // ═════════════════════════════════════════════════════════════════════════
    // 18 — Custom parameters are respected
    // ═════════════════════════════════════════════════════════════════════════
    [Fact]
    public void CustomParameters_AreUsed_InsteadOfDefaults()
    {
        var p = new DecisionParameters
        {
            SpotMarginFloor = 25m  // raised from default 14 %
        };
        var sut = new LoadEvaluator(p);

        // Spot load with 21 % margin — passes default (14 %) but fails custom (25 %)
        var load = GoodSpotLoad() with { Margin = 21m };

        var result = sut.Evaluate(load,
            currentWeekBookings: 0,
            totalUnmetContractLoads: 0,
            week: MidWeek);

        result.Recommendation.Should().Be(Recommendation.Review);
        RuleNamed(result, "Margin").Status.Should().Be("fail");
    }

    // ─── Utility ──────────────────────────────────────────────────────────────

    private static RuleResult RuleNamed(EvaluationResult result, string name) =>
        result.Rules.Single(r => r.RuleName == name);
}
