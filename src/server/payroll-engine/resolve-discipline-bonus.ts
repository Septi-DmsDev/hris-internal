type ResolveDisciplineBonusInput = {
  ruleEnabled: boolean;
  lateDays: number;
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
  if (!input.ruleEnabled) {
    return {
      disciplineBonusAmount: 0,
      disciplineEligible: false,
      disciplinePercent: 0,
    };
  }

  const disciplinePercent =
    input.lateDays <= 0
      ? 100
      : input.lateDays <= 3
        ? 90
        : input.lateDays <= 7
          ? 80
          : 0;
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
