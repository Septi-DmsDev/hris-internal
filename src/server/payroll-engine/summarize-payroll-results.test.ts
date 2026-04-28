import { describe, expect, it } from "vitest";
import { summarizePayrollResults } from "./summarize-payroll-results";

describe("summarizePayrollResults", () => {
  it("menghitung finance summary global dan per divisi", () => {
    const summary = summarizePayrollResults([
      {
        employeeId: "1",
        divisionName: "Finishing",
        takeHomePay: 1_500_000,
        totalAdditionAmount: 1_700_000,
        totalDeductionAmount: 200_000,
        performancePercent: 100,
      },
      {
        employeeId: "2",
        divisionName: "Finishing",
        takeHomePay: 1_200_000,
        totalAdditionAmount: 1_400_000,
        totalDeductionAmount: 200_000,
        performancePercent: 80,
      },
      {
        employeeId: "3",
        divisionName: "Offset",
        takeHomePay: 2_000_000,
        totalAdditionAmount: 2_250_000,
        totalDeductionAmount: 250_000,
        performancePercent: 150,
      },
    ]);

    expect(summary.employeeCount).toBe(3);
    expect(summary.totalTakeHomePay).toBe(4_700_000);
    expect(summary.totalAdditions).toBe(5_350_000);
    expect(summary.totalDeductions).toBe(650_000);
    expect(summary.averagePerformancePercent).toBe(110);
    expect(summary.divisionSummaries[0]).toEqual({
      divisionName: "Finishing",
      employeeCount: 2,
      totalTakeHomePay: 2_700_000,
      totalAdditions: 3_100_000,
      totalDeductions: 400_000,
      averagePerformancePercent: 90,
    });
  });
});
