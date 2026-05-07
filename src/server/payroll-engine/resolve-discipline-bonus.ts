type ResolveDisciplineBonusInput = {
  ruleEnabled: boolean;
  configuredAmount: number;
  fulltimeEligible: boolean;
  hasLateIncident: boolean;
};

type ResolvedDisciplineBonus = {
  disciplineBonusAmount: number;
  disciplineEligible: boolean;
};

export function resolveDisciplineBonus(
  input: ResolveDisciplineBonusInput
): ResolvedDisciplineBonus {
  if (!input.ruleEnabled) {
    return {
      disciplineBonusAmount: 0,
      disciplineEligible: false,
    };
  }

  return {
    disciplineBonusAmount: input.configuredAmount,
    disciplineEligible: input.fulltimeEligible && !input.hasLateIncident,
  };
}
