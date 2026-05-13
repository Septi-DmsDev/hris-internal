type ResolveDisciplineBonusInput = {
  ruleEnabled: boolean;
  presentDays: number;
  scheduledWorkDays: number;
  bonusTier80Amount: number;
  bonusTier90Amount: number;
  bonusTier100Amount: number;
};

type ResolvedDisciplineBonus = {
  disciplineBonusAmount: number;
  disciplineEligible: boolean;
  disciplinePercent: number;
};

export function resolveDisciplineBonus(
  input: ResolveDisciplineBonusInput
): ResolvedDisciplineBonus {
  if (!input.ruleEnabled || input.scheduledWorkDays <= 0) {
    return {
      disciplineBonusAmount: 0,
      disciplineEligible: false,
      disciplinePercent: 0,
    };
  }

  const disciplinePercent = (input.presentDays / input.scheduledWorkDays) * 100;
  const disciplineBonusAmount =
    disciplinePercent >= 100
      ? input.bonusTier100Amount
      : disciplinePercent >= 90
        ? input.bonusTier90Amount
        : disciplinePercent >= 80
          ? input.bonusTier80Amount
          : 0;

  return {
    disciplineBonusAmount,
    disciplineEligible: disciplineBonusAmount > 0,
    disciplinePercent,
  };
}
