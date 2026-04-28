import type { EmployeeGroup } from "@/types";

export type PayrollExportRowInput = {
  employeeCode: string;
  employeeName: string;
  employeeGroup: EmployeeGroup;
  divisionName: string;
  positionName: string;
  payrollStatus: string;
  performancePercent: number;
  baseSalaryPaid: number;
  gradeAllowancePaid: number;
  tenureAllowancePaid: number;
  overtimeAmount: number;
  bonusKinerjaAmount: number;
  bonusPrestasiAmount: number;
  bonusFulltimeAmount: number;
  bonusDisciplineAmount: number;
  bonusTeamAmount: number;
  totalAdditionAmount: number;
  totalDeductionAmount: number;
  takeHomePay: number;
};

type BuildPayrollExportRowsInput = {
  periodCode: string;
  results: PayrollExportRowInput[];
};

export function buildPayrollExportRows(input: BuildPayrollExportRowsInput) {
  return input.results.map((row) => ({
    periode: input.periodCode,
    nik: row.employeeCode,
    nama_karyawan: row.employeeName,
    kelompok_karyawan: row.employeeGroup,
    divisi: row.divisionName,
    jabatan: row.positionName,
    status_payroll: row.payrollStatus,
    performa_persen: Number(row.performancePercent.toFixed(2)),
    gaji_pokok_dibayar: row.baseSalaryPaid,
    tunjangan_grade: row.gradeAllowancePaid,
    tunjangan_masa_kerja: row.tenureAllowancePaid,
    overtime: row.overtimeAmount,
    bonus_kinerja_atau_kpi: row.bonusKinerjaAmount,
    bonus_prestasi: row.bonusPrestasiAmount,
    bonus_fulltime: row.bonusFulltimeAmount,
    bonus_disiplin: row.bonusDisciplineAmount,
    bonus_team: row.bonusTeamAmount,
    total_addition: row.totalAdditionAmount,
    total_deduction: row.totalDeductionAmount,
    total_thp: row.takeHomePay,
  }));
}
