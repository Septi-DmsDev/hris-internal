export const TENURE_ALLOWANCE_PER_YEAR = 100_000;

function resolveAnchorMonth(graduationMonth: number) {
  if (graduationMonth >= 2 && graduationMonth <= 4) return 4;
  if (graduationMonth >= 5 && graduationMonth <= 7) return 7;
  if (graduationMonth >= 8 && graduationMonth <= 10) return 10;
  return 1;
}

function toMonthIndex(date: Date) {
  return date.getFullYear() * 12 + (date.getMonth() + 1);
}

export function resolveTenureYears(trainingGraduationDate: Date | null | undefined, referenceDate: Date) {
  if (!trainingGraduationDate) return 0;

  const graduationYear = trainingGraduationDate.getFullYear();
  const graduationMonth = trainingGraduationDate.getMonth() + 1;
  const anchorMonth = resolveAnchorMonth(graduationMonth);

  // Tahun pertama selalu efektif di bucket month pada tahun berikutnya.
  const firstEffective = new Date(graduationYear + 1, anchorMonth - 1, 1);
  if (referenceDate < firstEffective) return 0;

  const monthsDiff = toMonthIndex(referenceDate) - toMonthIndex(firstEffective);
  return Math.floor(monthsDiff / 12) + 1;
}

export function resolveTenureAllowanceAmount(trainingGraduationDate: Date | null | undefined, referenceDate: Date) {
  const years = resolveTenureYears(trainingGraduationDate, referenceDate);
  return years * TENURE_ALLOWANCE_PER_YEAR;
}
