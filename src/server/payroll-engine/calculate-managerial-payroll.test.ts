import { describe, expect, it } from "vitest";
import { calculateManagerialPayroll } from "./calculate-managerial-payroll";

describe("calculateManagerialPayroll", () => {
  it("menghitung payroll managerial dari KPI bulanan tanpa bonus prestasi", () => {
    const result = calculateManagerialPayroll({
      baseSalaryAmount: 2_500_000,
      periodDayCount: 30,
      activeEmploymentDays: 30,
      scheduledWorkDays: 22,
      unpaidLeaveDays: 1,
      performancePercent: 92,
      performanceBonusBaseAmount: 500_000,
      fulltimeBonusAmount: 150_000,
      disciplineBonusAmount: 100_000,
      teamBonusAmount: 250_000,
      fulltimeEligible: false,
      disciplineEligible: true,
      spPenaltyMultiplier: 0.9,
      incidentDeductionAmount: 50_000,
      manualAdjustmentAmount: 25_000,
    });

    expect(result.baseSalaryPaid).toBe(2_500_000);
    expect(result.performanceBonusAmount).toBe(405_000);
    expect(result.fulltimeBonusPaid).toBe(0);
    expect(result.disciplineBonusPaid).toBe(90_000);
    expect(result.teamBonusPaid).toBe(225_000);
    expect(result.unpaidLeaveDeductionAmount).toBe(113_636.36);
    expect(result.takeHomePay).toBe(3_081_363.64);
  });

  it("tetap memprorata gaji pokok jika karyawan managerial aktif di tengah periode", () => {
    const result = calculateManagerialPayroll({
      baseSalaryAmount: 3_000_000,
      periodDayCount: 31,
      activeEmploymentDays: 10,
      scheduledWorkDays: 8,
      unpaidLeaveDays: 0,
      performancePercent: 75,
      performanceBonusBaseAmount: 400_000,
      fulltimeBonusAmount: 100_000,
      disciplineBonusAmount: 80_000,
      teamBonusAmount: 200_000,
      fulltimeEligible: true,
      disciplineEligible: false,
      spPenaltyMultiplier: 1,
      incidentDeductionAmount: 0,
      manualAdjustmentAmount: 0,
    });

    expect(result.baseSalaryPaid).toBe(967_741.94);
    expect(result.performanceBonusAmount).toBe(0);
    expect(result.fulltimeBonusPaid).toBe(100_000);
    expect(result.disciplineBonusPaid).toBe(0);
    expect(result.teamBonusPaid).toBe(200_000);
    expect(result.takeHomePay).toBe(1_267_741.94);
  });
});
