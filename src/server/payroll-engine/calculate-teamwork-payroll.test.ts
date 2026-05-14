import { describe, expect, it } from "vitest";
import { calculateTeamworkPayroll } from "./calculate-teamwork-payroll";

describe("calculateTeamworkPayroll", () => {
  it("menghitung payroll reguler dengan bonus performa dan bonus kelayakan", () => {
    const result = calculateTeamworkPayroll({
      payrollStatus: "REGULER",
      baseSalaryAmount: 1_200_000,
      periodDayCount: 31,
      activeEmploymentDays: 31,
      scheduledWorkDays: 24,
      presentDays: 24,
      unpaidLeaveDays: 0,
      performancePercent: 95,
      performanceBonusBaseAmount: 200_000,
      achievementBonus140Amount: 350_000,
      achievementBonus165Amount: 500_000,
      fulltimeBonusAmount: 100_000,
      disciplineBonusAmount: 75_000,
      teamBonusAmount: 50_000,
      fulltimeEligible: true,
      disciplineEligible: true,
      spPenaltyMultiplier: 1,
      incidentDeductionAmount: 0,
      manualAdjustmentAmount: 0,
    });

    expect(result.baseSalaryPaid).toBe(1_200_000);
    expect(result.performanceBonusAmount).toBe(200_000);
    expect(result.achievementBonusAmount).toBe(0);
    expect(result.fulltimeBonusPaid).toBe(100_000);
    expect(result.disciplineBonusPaid).toBe(75_000);
    expect(result.teamBonusPaid).toBe(50_000);
    expect(result.unpaidLeaveDeductionAmount).toBe(0);
    expect(result.takeHomePay).toBe(1_625_000);
  });

  it("training memakai rasio kehadiran terhadap hari kerja target", () => {
    const result = calculateTeamworkPayroll({
      payrollStatus: "TRAINING",
      baseSalaryAmount: 1_000_000,
      periodDayCount: 31,
      activeEmploymentDays: 10,
      scheduledWorkDays: 8,
      presentDays: 6,
      unpaidLeaveDays: 0,
      performancePercent: 180,
      performanceBonusBaseAmount: 200_000,
      achievementBonus140Amount: 350_000,
      achievementBonus165Amount: 500_000,
      fulltimeBonusAmount: 100_000,
      disciplineBonusAmount: 75_000,
      teamBonusAmount: 50_000,
      fulltimeEligible: true,
      disciplineEligible: true,
      spPenaltyMultiplier: 1,
      incidentDeductionAmount: 0,
      manualAdjustmentAmount: 0,
    });

    expect(result.baseSalaryPaid).toBe(750_000);
    expect(result.performanceBonusAmount).toBe(0);
    expect(result.achievementBonusAmount).toBe(0);
    expect(result.fulltimeBonusPaid).toBe(0);
    expect(result.disciplineBonusPaid).toBe(0);
    expect(result.teamBonusPaid).toBe(0);
    expect(result.takeHomePay).toBe(750_000);
  });

  it("tidak mengalikan bonus dengan multiplier SP dan tetap mengurangkan unpaid leave, incident, dan adjustment", () => {
    const result = calculateTeamworkPayroll({
      payrollStatus: "REGULER",
      baseSalaryAmount: 1_200_000,
      periodDayCount: 30,
      activeEmploymentDays: 30,
      scheduledWorkDays: 20,
      presentDays: 18,
      unpaidLeaveDays: 2,
      performancePercent: 150,
      performanceBonusBaseAmount: 200_000,
      achievementBonus140Amount: 350_000,
      achievementBonus165Amount: 500_000,
      fulltimeBonusAmount: 0,
      disciplineBonusAmount: 0,
      teamBonusAmount: 0,
      fulltimeEligible: false,
      disciplineEligible: false,
      spPenaltyMultiplier: 0.9,
      incidentDeductionAmount: 50_000,
      manualAdjustmentAmount: -25_000,
    });

    expect(result.performanceBonusAmount).toBe(200_000);
    expect(result.achievementBonusAmount).toBe(350_000);
    expect(result.unpaidLeaveDeductionAmount).toBe(120_000);
    expect(result.incidentDeductionAmount).toBe(50_000);
    expect(result.manualAdjustmentAmount).toBe(-25_000);
    expect(result.takeHomePay).toBe(1_555_000);
  });

  it("tidak membayar bonus kinerja jika performa di bawah 80 persen meski nominal tier tersedia", () => {
    const result = calculateTeamworkPayroll({
      payrollStatus: "REGULER",
      baseSalaryAmount: 1_200_000,
      periodDayCount: 30,
      activeEmploymentDays: 30,
      scheduledWorkDays: 25,
      presentDays: 25,
      unpaidLeaveDays: 0,
      performancePercent: 79.99,
      performanceBonusBaseAmount: 300_000,
      achievementBonus140Amount: 350_000,
      achievementBonus165Amount: 500_000,
      fulltimeBonusAmount: 0,
      disciplineBonusAmount: 0,
      teamBonusAmount: 0,
      fulltimeEligible: false,
      disciplineEligible: false,
      spPenaltyMultiplier: 1,
      incidentDeductionAmount: 0,
      manualAdjustmentAmount: 0,
    });

    expect(result.performanceBonusAmount).toBe(0);
    expect(result.takeHomePay).toBe(1_200_000);
  });
});
