import { describe, expect, it } from "vitest";
import { calculateMonthlyPointPerformance } from "./calculate-monthly-point-performance";

describe("calculateMonthlyPointPerformance", () => {
  it("menggunakan target default untuk divisi umum", () => {
    const result = calculateMonthlyPointPerformance({
      divisionName: "Finishing",
      targetDays: 22,
      totalApprovedPoints: 257400,
      dailySubmissions: Array(22).fill({ totalPoints: 11700 }), // 11700/13000 = 90% tiap hari
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
      dailySubmissions: Array(22).fill({ totalPoints: 35100 }), // 35100/39000 = 90% tiap hari
    });

    expect(result.targetDailyPoints).toBe(39000);
    expect(result.totalTargetPoints).toBe(858000);
    expect(result.performancePercent).toBe(90);
  });

  it("performa adalah rata-rata persentase harian dari hari yang submit", () => {
    // Senin: 6500 poin = 50%, Selasa: 13000 poin = 100% → rata-rata 75%
    const result = calculateMonthlyPointPerformance({
      divisionName: "Finishing",
      targetDays: 5,
      totalApprovedPoints: 13000,
      dailySubmissions: [{ totalPoints: 6500 }, { totalPoints: 13000 }],
    });

    expect(result.performancePercent).toBe(75);
  });

  it("performa 0 jika tidak ada hari yang submit", () => {
    const result = calculateMonthlyPointPerformance({
      divisionName: "Finishing",
      targetDays: 22,
      totalApprovedPoints: 0,
    });

    expect(result.performancePercent).toBe(0);
  });
});
