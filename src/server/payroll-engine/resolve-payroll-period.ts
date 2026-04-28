function toUtcDate(year: number, monthIndex: number, day: number) {
  return new Date(Date.UTC(year, monthIndex, day));
}

function formatDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

export function resolvePayrollPeriod(periodCode: string) {
  const match = /^(\d{4})-(\d{2})$/.exec(periodCode);
  if (!match) {
    throw new Error("Format periode payroll harus YYYY-MM.");
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  if (month < 1 || month > 12) {
    throw new Error("Bulan payroll harus antara 01 dan 12.");
  }

  const periodStartDate = toUtcDate(month === 1 ? year - 1 : year, month === 1 ? 11 : month - 2, 26);
  const periodEndDate = toUtcDate(year, month - 1, 25);

  return {
    periodCode,
    periodStartDate,
    periodEndDate,
    periodLabel: `${formatDate(periodStartDate)} s.d. ${formatDate(periodEndDate)}`,
  };
}
