import { resolvePointTargetForDivision } from "@/config/constants";

type CalculateMonthlyPointPerformanceInput = {
  divisionName?: string | null;
  targetDays: number;
  totalApprovedPoints: number;
  /** Satu entry per hari kerja yang sudah submit — untuk menghitung rata-rata persentase harian */
  dailySubmissions?: { totalPoints: number }[];
};

export function calculateMonthlyPointPerformance({
  divisionName,
  targetDays,
  totalApprovedPoints,
  dailySubmissions,
}: CalculateMonthlyPointPerformanceInput) {
  const targetDailyPoints = resolvePointTargetForDivision(divisionName);
  const totalTargetPoints = targetDailyPoints * targetDays;

  let performancePercent: number;
  if (dailySubmissions && dailySubmissions.length > 0) {
    const dailyPercents = dailySubmissions.map((d) =>
      targetDailyPoints > 0 ? (d.totalPoints / targetDailyPoints) * 100 : 0
    );
    performancePercent = Number(
      (dailyPercents.reduce((a, b) => a + b, 0) / dailyPercents.length).toFixed(2)
    );
  } else {
    performancePercent = 0;
  }

  return {
    targetDailyPoints,
    targetDays,
    totalTargetPoints,
    totalApprovedPoints,
    performancePercent,
  };
}
