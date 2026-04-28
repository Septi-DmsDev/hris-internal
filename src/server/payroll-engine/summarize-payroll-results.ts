type PayrollSummaryRow = {
  employeeId: string;
  divisionName: string;
  takeHomePay: number;
  totalAdditionAmount: number;
  totalDeductionAmount: number;
  performancePercent: number;
};

type DivisionSummary = {
  divisionName: string;
  employeeCount: number;
  totalTakeHomePay: number;
  totalAdditions: number;
  totalDeductions: number;
  averagePerformancePercent: number;
};

function round(value: number) {
  return Number(value.toFixed(2));
}

export function summarizePayrollResults(rows: PayrollSummaryRow[]) {
  const employeeCount = rows.length;
  const totalTakeHomePay = round(rows.reduce((sum, row) => sum + row.takeHomePay, 0));
  const totalAdditions = round(rows.reduce((sum, row) => sum + row.totalAdditionAmount, 0));
  const totalDeductions = round(rows.reduce((sum, row) => sum + row.totalDeductionAmount, 0));
  const averagePerformancePercent = employeeCount === 0
    ? 0
    : round(rows.reduce((sum, row) => sum + row.performancePercent, 0) / employeeCount);

  const divisionMap = new Map<string, PayrollSummaryRow[]>();
  for (const row of rows) {
    const current = divisionMap.get(row.divisionName) ?? [];
    current.push(row);
    divisionMap.set(row.divisionName, current);
  }

  const divisionSummaries: DivisionSummary[] = [...divisionMap.entries()]
    .map(([divisionName, divisionRows]) => ({
      divisionName,
      employeeCount: divisionRows.length,
      totalTakeHomePay: round(divisionRows.reduce((sum, row) => sum + row.takeHomePay, 0)),
      totalAdditions: round(divisionRows.reduce((sum, row) => sum + row.totalAdditionAmount, 0)),
      totalDeductions: round(divisionRows.reduce((sum, row) => sum + row.totalDeductionAmount, 0)),
      averagePerformancePercent: round(
        divisionRows.reduce((sum, row) => sum + row.performancePercent, 0) / divisionRows.length
      ),
    }))
    .sort((a, b) => b.totalTakeHomePay - a.totalTakeHomePay);

  return {
    employeeCount,
    totalTakeHomePay,
    totalAdditions,
    totalDeductions,
    averagePerformancePercent,
    divisionSummaries,
  };
}
