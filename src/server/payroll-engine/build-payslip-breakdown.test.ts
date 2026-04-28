import { describe, expect, it } from "vitest";
import { buildPayslipBreakdown } from "./build-payslip-breakdown";

describe("buildPayslipBreakdown", () => {
  it("mengelompokkan komponen addition dan deduction untuk tampilan slip", () => {
    const breakdown = buildPayslipBreakdown({
      baseSalaryPaid: 1_200_000,
      gradeAllowancePaid: 100_000,
      tenureAllowancePaid: 50_000,
      dailyAllowancePaid: 0,
      overtimeAmount: 0,
      bonusFulltimeAmount: 100_000,
      bonusDisciplineAmount: 75_000,
      bonusKinerjaAmount: 180_000,
      bonusPrestasiAmount: 0,
      bonusTeamAmount: 50_000,
      incidentDeductionAmount: 25_000,
      unpaidLeaveDeductionAmount: 60_000,
      manualAdjustmentAmount: -10_000,
      takeHomePay: 1_660_000,
    });

    expect(breakdown.additions.map((item) => item.key)).toEqual([
      "baseSalaryPaid",
      "gradeAllowancePaid",
      "tenureAllowancePaid",
      "bonusFulltimeAmount",
      "bonusDisciplineAmount",
      "bonusKinerjaAmount",
      "bonusTeamAmount",
    ]);
    expect(breakdown.deductions.map((item) => item.key)).toEqual([
      "incidentDeductionAmount",
      "unpaidLeaveDeductionAmount",
      "manualAdjustmentAmount",
    ]);
    expect(breakdown.totalAdditions).toBe(1_755_000);
    expect(breakdown.totalDeductions).toBe(95_000);
    expect(breakdown.takeHomePay).toBe(1_660_000);
  });

  it("memasukkan adjustment positif sebagai addition", () => {
    const breakdown = buildPayslipBreakdown({
      baseSalaryPaid: 1_000_000,
      gradeAllowancePaid: 0,
      tenureAllowancePaid: 0,
      dailyAllowancePaid: 0,
      overtimeAmount: 0,
      bonusFulltimeAmount: 0,
      bonusDisciplineAmount: 0,
      bonusKinerjaAmount: 0,
      bonusPrestasiAmount: 0,
      bonusTeamAmount: 0,
      incidentDeductionAmount: 0,
      unpaidLeaveDeductionAmount: 0,
      manualAdjustmentAmount: 25_000,
      takeHomePay: 1_025_000,
    });

    expect(breakdown.additions.at(-1)?.key).toBe("manualAdjustmentAmount");
    expect(breakdown.totalAdditions).toBe(1_025_000);
    expect(breakdown.totalDeductions).toBe(0);
  });
});
