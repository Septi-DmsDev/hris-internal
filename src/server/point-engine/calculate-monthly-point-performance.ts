import { resolvePointTargetForDivision } from "@/config/constants";

type CalculateMonthlyPointPerformanceInput = {
  divisionName?: string | null;
  targetDays: number;
  totalApprovedPoints: number;
};

export function calculateMonthlyPointPerformance({
  divisionName,
  targetDays,
  totalApprovedPoints,
}: CalculateMonthlyPointPerformanceInput) {
  const targetDailyPoints = resolvePointTargetForDivision(divisionName);
  const totalTargetPoints = targetDailyPoints * targetDays;
  const performancePercent =
    totalTargetPoints === 0
      ? 0
      : Number(((totalApprovedPoints / totalTargetPoints) * 100).toFixed(2));

  return {
    targetDailyPoints,
    targetDays,
    totalTargetPoints,
    totalApprovedPoints,
    performancePercent,
  };
}
