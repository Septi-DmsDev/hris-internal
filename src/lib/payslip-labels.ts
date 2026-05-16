import type { EmployeeGroup } from "@/lib/employee-groups";

type PayslipLabelSet = {
  baseSalaryPaid: string;
  gradeAllowancePaid: string;
  tenureAllowancePaid: string;
  dailyAllowancePaid: string;
  overtimeAmount: string;
  bonusFulltimeAmount: string;
  bonusDisciplineAmount: string;
  bonusKinerjaAmount: string;
  bonusPrestasiAmount: string;
  bonusTeamAmount: string;
  manualAddition: string;
  incidentDeductionAmount: string;
  unpaidLeaveDeductionAmount: string;
  manualDeduction: string;
  totalAdditions: string;
  takeHomePay: string;
};

const MITRA_LABELS: PayslipLabelSet = {
  baseSalaryPaid: "Komisi/Fee",
  gradeAllowancePaid: "",
  tenureAllowancePaid: "Insentif Grade 1 Tahun",
  dailyAllowancePaid: "Uang Harian",
  overtimeAmount: "Komisi Ovt/Lembur",
  bonusFulltimeAmount: "Insentif Kehadiran",
  bonusDisciplineAmount: "Insentif Disiplin",
  bonusKinerjaAmount: "Bonus Kinerja",
  bonusPrestasiAmount: "Bonus Prestasi",
  bonusTeamAmount: "Insentif Divisi",
  manualAddition: "Tambahan Lain",
  incidentDeductionAmount: "Ganti Rugi",
  unpaidLeaveDeductionAmount: "Potongan Tidak Masuk",
  manualDeduction: "Kasbon / Potongan Lain",
  totalAdditions: "Total Komisi/Fee",
  takeHomePay: "Total Komisi/Fee",
};

const MANAGERIAL_LABELS: PayslipLabelSet = {
  baseSalaryPaid: "Gaji Pokok",
  gradeAllowancePaid: "Tunjangan Grade",
  tenureAllowancePaid: "Tunjangan Masa Kerja 1 Tahun",
  dailyAllowancePaid: "Uang Harian",
  overtimeAmount: "Konsumsi/Lembur",
  bonusFulltimeAmount: "Bonus Full Time",
  bonusDisciplineAmount: "Bonus Disiplin",
  bonusKinerjaAmount: "Bonus Kinerja Personal",
  bonusPrestasiAmount: "Bonus Prestasi",
  bonusTeamAmount: "Bonus Kinerja Team",
  manualAddition: "Tambahan Lain",
  incidentDeductionAmount: "Ganti Rugi",
  unpaidLeaveDeductionAmount: "Potongan Tidak Masuk",
  manualDeduction: "Kasbon / Potongan Lain",
  totalAdditions: "Total Salary",
  takeHomePay: "Total Salary",
};

export function getPayslipLabels(employeeGroup: EmployeeGroup): PayslipLabelSet {
  if (employeeGroup === "MANAGERIAL" || employeeGroup === "KARYAWAN_TETAP") {
    return MANAGERIAL_LABELS;
  }
  return MITRA_LABELS;
}
