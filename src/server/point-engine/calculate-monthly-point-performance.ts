import { resolvePointTargetForDivision } from "@/config/constants";

type CalculateMonthlyPointPerformanceInput = {
  divisionName?: string | null;
  targetDailyPoints?: number | null;
  targetDays: number;
  totalApprovedPoints: number;
  /** Satu entry per hari kerja yang sudah submit — untuk menghitung rata-rata persentase harian */
  dailySubmissions?: { totalPoints: number }[];
};

export function calculateMonthlyPointPerformance({
  divisionName,
  targetDailyPoints,
  targetDays,
  totalApprovedPoints,
  dailySubmissions,
}: CalculateMonthlyPointPerformanceInput) {
  const resolvedTargetDailyPoints = targetDailyPoints ?? resolvePointTargetForDivision(divisionName);
  const totalTargetPoints = resolvedTargetDailyPoints * targetDays;

  let performancePercent: number;
  if (dailySubmissions && dailySubmissions.length > 0) {
    const dailyPercents = dailySubmissions.map((d) =>
      resolvedTargetDailyPoints > 0 ? (d.totalPoints / resolvedTargetDailyPoints) * 100 : 0
    );
    performancePercent = Number(
      (dailyPercents.reduce((a, b) => a + b, 0) / dailyPercents.length).toFixed(2)
    );
  } else {
    performancePercent = 0;
  }

  return {
    targetDailyPoints: resolvedTargetDailyPoints,
    targetDays,
    totalTargetPoints,
    totalApprovedPoints,
    performancePercent,
  };
}
