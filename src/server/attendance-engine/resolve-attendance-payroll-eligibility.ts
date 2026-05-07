export type AttendancePayrollRecord = {
  attendanceStatus: "HADIR" | "ALPA" | "IZIN" | "SAKIT" | "CUTI" | "OFF";
  punctualityStatus: "TEPAT_WAKTU" | "TELAT" | null;
  attendanceDate: string | Date;
};

type ResolveAttendancePayrollEligibilityInput = {
  scheduledWorkDays: number;
  records: AttendancePayrollRecord[];
};

type AttendancePayrollEligibility = {
  hasAttendanceData: boolean;
  recordedWorkDays: number;
  presentDays: number;
  absenceDays: number;
  lateDays: number;
  fulltimeEligible: boolean;
  disciplineEligible: boolean;
};

const ABSENCE_STATUSES = new Set<AttendancePayrollRecord["attendanceStatus"]>([
  "ALPA",
  "IZIN",
  "SAKIT",
  "CUTI",
]);

export function resolveAttendancePayrollEligibility(
  input: ResolveAttendancePayrollEligibilityInput
): AttendancePayrollEligibility {
  const workdayRecords = input.records.filter((record) => record.attendanceStatus !== "OFF");
  const recordedWorkDays = workdayRecords.length;
  const presentDays = workdayRecords.filter((record) => record.attendanceStatus === "HADIR").length;
  const absenceDays = workdayRecords.filter((record) => ABSENCE_STATUSES.has(record.attendanceStatus)).length;
  const lateDays = workdayRecords.filter((record) => record.punctualityStatus === "TELAT").length;
  const hasAttendanceData = input.records.length > 0;
  const hasCompleteAttendance = hasAttendanceData
    && input.scheduledWorkDays > 0
    && recordedWorkDays >= input.scheduledWorkDays;
  const fulltimeEligible = hasCompleteAttendance
    && presentDays >= input.scheduledWorkDays
    && absenceDays === 0;

  return {
    hasAttendanceData,
    recordedWorkDays,
    presentDays,
    absenceDays,
    lateDays,
    fulltimeEligible,
    disciplineEligible: fulltimeEligible && lateDays === 0,
  };
}
