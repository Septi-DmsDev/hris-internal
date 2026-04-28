import { resolveBonusLevel } from "./resolve-bonus-level";

type CalculateManagerialPayrollInput = {
  baseSalaryAmount: number;
  periodDayCount: number;
  activeEmploymentDays: number;
  scheduledWorkDays: number;
  unpaidLeaveDays: number;
  performancePercent: number;
  performanceBonusBaseAmount: number;
  fulltimeBonusAmount: number;
  disciplineBonusAmount: number;
  teamBonusAmount: number;
  fulltimeEligible: boolean;
  disciplineEligible: boolean;
  spPenaltyMultiplier: number;
  incidentDeductionAmount: number;
  manualAdjustmentAmount: number;
};

type ManagerialPayrollResult = {
  baseSalaryPaid: number;
  performanceBonusAmount: number;
  achievementBonusAmount: number;
  fulltimeBonusPaid: number;
  disciplineBonusPaid: number;
  teamBonusPaid: number;
  unpaidLeaveDeductionAmount: number;
  incidentDeductionAmount: number;
  manualAdjustmentAmount: number;
  takeHomePay: number;
};

function roundCurrency(amount: number) {
  return Number(amount.toFixed(2));
}

export function calculateManagerialPayroll(
  input: CalculateManagerialPayrollInput
): ManagerialPayrollResult {
  const baseSalaryPaid = roundCurrency(
    input.baseSalaryAmount * (input.activeEmploymentDays / Math.max(input.periodDayCount, 1))
  );
  const bonusLevel = resolveBonusLevel(input.performancePercent);

  const performanceBonusAmount = roundCurrency(
    input.performanceBonusBaseAmount * (bonusLevel.bonusKinerjaPercent / 100) * input.spPenaltyMultiplier
  );
  const fulltimeBonusPaid = roundCurrency(
    input.fulltimeEligible ? input.fulltimeBonusAmount * input.spPenaltyMultiplier : 0
  );
  const disciplineBonusPaid = roundCurrency(
    input.disciplineEligible ? input.disciplineBonusAmount * input.spPenaltyMultiplier : 0
  );
  const teamBonusPaid = roundCurrency(input.teamBonusAmount * input.spPenaltyMultiplier);
  const unpaidLeaveDeductionAmount = roundCurrency(
    input.scheduledWorkDays > 0
      ? (baseSalaryPaid / input.scheduledWorkDays) * input.unpaidLeaveDays
      : 0
  );
  const takeHomePay = roundCurrency(
    baseSalaryPaid +
      performanceBonusAmount +
      fulltimeBonusPaid +
      disciplineBonusPaid +
      teamBonusPaid -
      unpaidLeaveDeductionAmount -
      input.incidentDeductionAmount +
      input.manualAdjustmentAmount
  );

  return {
    baseSalaryPaid,
    performanceBonusAmount,
    achievementBonusAmount: 0,
    fulltimeBonusPaid,
    disciplineBonusPaid,
    teamBonusPaid,
    unpaidLeaveDeductionAmount,
    incidentDeductionAmount: roundCurrency(input.incidentDeductionAmount),
    manualAdjustmentAmount: roundCurrency(input.manualAdjustmentAmount),
    takeHomePay,
  };
}
