import { describe, expect, it } from "vitest";
import { calculateMonthlyPointPerformance } from "./calculate-monthly-point-performance";

describe("calculateMonthlyPointPerformance", () => {
  it("menggunakan target default untuk divisi umum", () => {
    const result = calculateMonthlyPointPerformance({
      divisionName: "Finishing",
      targetDays: 22,
      totalApprovedPoints: 257400,
    });

    expect(result.targetDailyPoints).toBe(13000);
    expect(result.totalTargetPoints).toBe(286000);
    expect(result.performancePercent).toBe(90);
  });

  it("menggunakan target override untuk Offset", () => {
    const result = calculateMonthlyPointPerformance({
      divisionName: "OFFSET",
      targetDays: 22,
      totalApprovedPoints: 772200,
    });

    expect(result.targetDailyPoints).toBe(39000);
    expect(result.totalTargetPoints).toBe(858000);
    expect(result.performancePercent).toBe(90);
  });
});
