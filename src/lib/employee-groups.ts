export const ALL_EMPLOYEE_GROUPS = [
  "MANAGERIAL",
  "TEAMWORK",
  "KARYAWAN_TETAP",
  "MITRA_KERJA",
  "BORONGAN",
  "TRAINING",
] as const;

export const NEW_EMPLOYEE_GROUPS = ["KARYAWAN_TETAP", "MITRA_KERJA", "BORONGAN", "TRAINING"] as const;
export const LEGACY_EMPLOYEE_GROUPS = ["MANAGERIAL", "TEAMWORK"] as const;
export const KPI_EMPLOYEE_GROUPS = ["MANAGERIAL", "KARYAWAN_TETAP"] as const;
export const POINT_EMPLOYEE_GROUPS = ["TEAMWORK", "MITRA_KERJA", "BORONGAN", "TRAINING"] as const;
export const TRAINING_EMPLOYEE_GROUPS = ["TRAINING"] as const;

export type EmployeeGroup = (typeof ALL_EMPLOYEE_GROUPS)[number];

const EMPLOYEE_GROUP_LABELS: Record<EmployeeGroup, string> = {
  MANAGERIAL: "Karyawan Tetap",
  TEAMWORK: "Mitra Kerja",
  KARYAWAN_TETAP: "Karyawan Tetap",
  MITRA_KERJA: "Mitra Kerja",
  BORONGAN: "Borongan",
  TRAINING: "Training",
};

export function resolveEmployeeGroupLabel(group: EmployeeGroup) {
  return EMPLOYEE_GROUP_LABELS[group];
}

export function normalizeEmployeeGroup(group: EmployeeGroup) {
  if (group === "MANAGERIAL") return "KARYAWAN_TETAP";
  if (group === "TEAMWORK") return "MITRA_KERJA";
  return group;
}

export function resolveEmployeeGroupFromTrainingDate(trainingGraduationDate: Date | string | null | undefined): EmployeeGroup {
  return trainingGraduationDate ? "MITRA_KERJA" : "TRAINING";
}

export function resolveEmployeeGroupSearchText(group: EmployeeGroup) {
  const label = resolveEmployeeGroupLabel(group);
  const normalized = normalizeEmployeeGroup(group);
  return `${label} ${group} ${normalized}`;
}

export function isKpiEmployeeGroup(group: EmployeeGroup) {
  return group === "MANAGERIAL" || group === "KARYAWAN_TETAP";
}

export function isPointBasedEmployeeGroup(group: EmployeeGroup) {
  return group === "TEAMWORK" || group === "MITRA_KERJA" || group === "BORONGAN" || group === "TRAINING";
}

export function isTrainingEmployeeGroup(group: EmployeeGroup) {
  return group === "TRAINING";
}
