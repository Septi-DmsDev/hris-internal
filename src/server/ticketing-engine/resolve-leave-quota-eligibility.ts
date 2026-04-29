type ResolveLeaveQuotaEligibilityInput = {
  startDate: Date;
  requestedYear: number;
  today?: Date;
};

function endOfQuarter(date: Date) {
  const month = date.getUTCMonth();
  const year = date.getUTCFullYear();

  if (month <= 2) return new Date(Date.UTC(year, 2, 31));
  if (month <= 5) return new Date(Date.UTC(year, 5, 30));
  if (month <= 8) return new Date(Date.UTC(year, 8, 30));
  return new Date(Date.UTC(year, 11, 31));
}

function addTwelveMonths(startDate: Date) {
  const year = startDate.getUTCFullYear() + 1;
  const month = startDate.getUTCMonth();
  const day = startDate.getUTCDate();
  return new Date(Date.UTC(year, month, day));
}

export function resolveLeaveQuotaEligibility({
  startDate,
  requestedYear,
  today = new Date(),
}: ResolveLeaveQuotaEligibilityInput) {
  const anniversaryDate = addTwelveMonths(startDate);
  const effectiveDate = endOfQuarter(anniversaryDate);
  const eligible =
    today.getTime() >= effectiveDate.getTime() &&
    requestedYear === effectiveDate.getUTCFullYear();

  return {
    anniversaryDate,
    effectiveDate,
    eligible,
  };
}
