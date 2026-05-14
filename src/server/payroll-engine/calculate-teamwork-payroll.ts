import type { PayrollStatus } from "@/types";
import { resolveBonusLevel } from "./resolve-bonus-level";

type CalculateTeamworkPayrollInput = {
  payrollStatus: PayrollStatus;
  baseSalaryAmount: number;
  periodDayCount: number;
  activeEmploymentDays: number;
  scheduledWorkDays: number;
  presentDays: number;
  unpaidLeaveDays: number;
  performancePercent: number;
  performanceBonusBaseAmount: number;
  achievementBonus140Amount: number;
  achievementBonus165Amount: number;
  fulltimeBonusAmount: number;
  disciplineBonusAmount: number;
  teamBonusAmount: number;
  fulltimeEligible: boolean;
  disciplineEligible: boolean;
  spPenaltyMultiplier: number;
  incidentDeductionAmount: number;
  manualAdjustmentAmount: number;
};

type TeamworkPayrollResult = {
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

export function calculateTeamworkPayroll(
  input: CalculateTeamworkPayrollInput
): TeamworkPayrollResult {
  const isTraining = input.payrollStatus === "TRAINING";
  const baseSalaryPaid = roundCurrency(
    isTraining
      ? (
          input.scheduledWorkDays > 0
            ? input.baseSalaryAmount * (input.presentDays / input.scheduledWorkDays)
            : 0
        )
      : input.baseSalaryAmount * (input.activeEmploymentDays / Math.max(input.periodDayCount, 1))
  );
  const bonusLevel = isTraining
    ? { bonusKinerjaPercent: 0, bonusPrestasiLevel: 0 }
    : resolveBonusLevel(input.performancePercent);

  const achievementBonusBase =
    bonusLevel.bonusPrestasiLevel >= 165
      ? input.achievementBonus165Amount
      : bonusLevel.bonusPrestasiLevel >= 140
        ? input.achievementBonus140Amount
        : 0;

  const performanceBonusAmount = roundCurrency(
    bonusLevel.bonusKinerjaPercent > 0
      ? input.performanceBonusBaseAmount
      : 0
  );
  const achievementBonusAmount = roundCurrency(
    achievementBonusBase
  );
  const fulltimeBonusPaid = roundCurrency(
    isTraining || !input.fulltimeEligible ? 0 : input.fulltimeBonusAmount
  );
  const disciplineBonusPaid = roundCurrency(
    isTraining || !input.disciplineEligible ? 0 : input.disciplineBonusAmount
  );
  const teamBonusPaid = roundCurrency(
    isTraining ? 0 : input.teamBonusAmount
  );

  const unpaidLeaveDeductionAmount = roundCurrency(
    !isTraining && input.scheduledWorkDays > 0
      ? (baseSalaryPaid / input.scheduledWorkDays) * input.unpaidLeaveDays
      : 0
  );

  const takeHomePay = roundCurrency(
    baseSalaryPaid +
      performanceBonusAmount +
      achievementBonusAmount +
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
    achievementBonusAmount,
    fulltimeBonusPaid,
    disciplineBonusPaid,
    teamBonusPaid,
    unpaidLeaveDeductionAmount,
    incidentDeductionAmount: roundCurrency(input.incidentDeductionAmount),
    manualAdjustmentAmount: roundCurrency(input.manualAdjustmentAmount),
    takeHomePay,
  };
}
