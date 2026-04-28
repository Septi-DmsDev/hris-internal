type PayslipBreakdownInput = {
  baseSalaryPaid: number;
  gradeAllowancePaid: number;
  tenureAllowancePaid: number;
  dailyAllowancePaid: number;
  overtimeAmount: number;
  bonusFulltimeAmount: number;
  bonusDisciplineAmount: number;
  bonusKinerjaAmount: number;
  bonusPrestasiAmount: number;
  bonusTeamAmount: number;
  incidentDeductionAmount: number;
  unpaidLeaveDeductionAmount: number;
  manualAdjustmentAmount: number;
  takeHomePay: number;
};

type PayslipItem = {
  key: string;
  label: string;
  amount: number;
};

function positiveItems(items: PayslipItem[]) {
  return items.filter((item) => item.amount > 0);
}

export function buildPayslipBreakdown(input: PayslipBreakdownInput) {
  const additions = positiveItems([
    { key: "baseSalaryPaid", label: "Gaji Pokok Dibayar", amount: input.baseSalaryPaid },
    { key: "gradeAllowancePaid", label: "Tunjangan Grade", amount: input.gradeAllowancePaid },
    { key: "tenureAllowancePaid", label: "Tunjangan Masa Kerja", amount: input.tenureAllowancePaid },
    { key: "dailyAllowancePaid", label: "Uang Harian", amount: input.dailyAllowancePaid },
    { key: "overtimeAmount", label: "Overtime", amount: input.overtimeAmount },
    { key: "bonusFulltimeAmount", label: "Bonus Fulltime", amount: input.bonusFulltimeAmount },
    { key: "bonusDisciplineAmount", label: "Bonus Disiplin", amount: input.bonusDisciplineAmount },
    { key: "bonusKinerjaAmount", label: "Bonus Kinerja", amount: input.bonusKinerjaAmount },
    { key: "bonusPrestasiAmount", label: "Bonus Prestasi", amount: input.bonusPrestasiAmount },
    { key: "bonusTeamAmount", label: "Bonus Team", amount: input.bonusTeamAmount },
    {
      key: "manualAdjustmentAmount",
      label: "Adjustment Manual (+)",
      amount: input.manualAdjustmentAmount > 0 ? input.manualAdjustmentAmount : 0,
    },
  ]);

  const deductions = positiveItems([
    { key: "incidentDeductionAmount", label: "Potongan Incident", amount: input.incidentDeductionAmount },
    { key: "unpaidLeaveDeductionAmount", label: "Potongan Unpaid Leave", amount: input.unpaidLeaveDeductionAmount },
    {
      key: "manualAdjustmentAmount",
      label: "Adjustment Manual (-)",
      amount: input.manualAdjustmentAmount < 0 ? Math.abs(input.manualAdjustmentAmount) : 0,
    },
  ]);

  return {
    additions,
    deductions,
    totalAdditions: additions.reduce((sum, item) => sum + item.amount, 0),
    totalDeductions: deductions.reduce((sum, item) => sum + item.amount, 0),
    takeHomePay: input.takeHomePay,
  };
}
