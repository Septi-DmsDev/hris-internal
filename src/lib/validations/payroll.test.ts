import { describe, expect, it } from "vitest";
import { managerialKpiSummarySchema, salaryConfigSchema } from "./payroll";

describe("salaryConfigSchema", () => {
  it("menerima nominal payroll valid dan mengubah string angka menjadi number", () => {
    const result = salaryConfigSchema.safeParse({
      employeeId: "123e4567-e89b-12d3-a456-426614174000",
      baseSalaryAmount: "1200000",
      gradeAllowanceAmount: "100000",
      tenureAllowanceAmount: "50000",
      performanceBonusBaseAmount: "200000",
      achievementBonus140Amount: "350000",
      achievementBonus165Amount: "500000",
      fulltimeBonusAmount: "100000",
      disciplineBonusAmount: "75000",
      teamBonusAmount: "50000",
      notes: "Payroll teamwork reguler",
    });

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.baseSalaryAmount).toBe(1_200_000);
    expect(result.data.achievementBonus165Amount).toBe(500_000);
  });

  it("menolak nominal negatif", () => {
    const result = salaryConfigSchema.safeParse({
      employeeId: "123e4567-e89b-12d3-a456-426614174000",
      baseSalaryAmount: "-1",
    });

    expect(result.success).toBe(false);
  });
});

describe("managerialKpiSummarySchema", () => {
  it("menerima KPI managerial valid dan mengubah persen string menjadi number", () => {
    const result = managerialKpiSummarySchema.safeParse({
      periodId: "123e4567-e89b-12d3-a456-426614174001",
      employeeId: "123e4567-e89b-12d3-a456-426614174000",
      performancePercent: "92.5",
      notes: "KPI final April",
    });

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.performancePercent).toBe(92.5);
  });

  it("menolak KPI di luar rentang wajar", () => {
    const result = managerialKpiSummarySchema.safeParse({
      periodId: "123e4567-e89b-12d3-a456-426614174001",
      employeeId: "123e4567-e89b-12d3-a456-426614174000",
      performancePercent: "250",
    });

    expect(result.success).toBe(false);
  });
});
