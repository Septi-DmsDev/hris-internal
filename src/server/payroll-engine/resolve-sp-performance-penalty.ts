import { SP_PERFORMANCE_PENALTY_PERCENT } from "@/config/constants";

type SpPenaltyType = keyof typeof SP_PERFORMANCE_PENALTY_PERCENT;

type ResolvedSpPerformancePenalty = {
  penaltyType: SpPenaltyType;
  penaltyPercent: number;
  adjustedPerformancePercent: number;
};

function roundPercent(value: number) {
  return Number(value.toFixed(2));
}

export function resolveSpPerformancePenalty(
  performancePercent: number,
  incidentTypes: string[]
): ResolvedSpPerformancePenalty {
  const penaltyType: SpPenaltyType = incidentTypes.includes("SP2")
    ? "SP2"
    : incidentTypes.includes("SP1")
      ? "SP1"
      : "NONE";
  const penaltyPercent = SP_PERFORMANCE_PENALTY_PERCENT[penaltyType];

  return {
    penaltyType,
    penaltyPercent,
    adjustedPerformancePercent: roundPercent(Math.max(performancePercent - penaltyPercent, 0)),
  };
}
