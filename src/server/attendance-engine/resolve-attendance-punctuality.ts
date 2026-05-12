export type AttendancePunctualityStatus = "TEPAT_WAKTU" | "TELAT";

export type AttendanceScheduleDay = {
  isWorkingDay: boolean;
  dayStatus: string;
  startTime: string | null;
  endTime: string | null;
  breakStart: string | null;
  breakEnd: string | null;
  breakToleranceMinutes: number;
  checkInToleranceMinutes: number;
};

export type ResolveAttendancePunctualityInput = {
  checkInTime?: string | null;
  checkOutTime?: string | null;
  breakOutTime?: string | null;
  breakInTime?: string | null;
  scheduleDay: AttendanceScheduleDay | null;
};

function parseMinutes(value?: string | null) {
  if (!value) return null;
  const [hours, minutes] = value.split(":").map((part) => Number.parseInt(part, 10));
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return null;
  return hours * 60 + minutes;
}

function isLate(actual: string | null | undefined, expected: string | null, toleranceMinutes: number) {
  if (!actual || !expected) return false;
  const actualMinutes = parseMinutes(actual);
  const expectedMinutes = parseMinutes(expected);
  if (actualMinutes == null || expectedMinutes == null) return false;
  return actualMinutes > expectedMinutes + toleranceMinutes;
}

export function resolveAttendancePunctuality(
  input: ResolveAttendancePunctualityInput
): AttendancePunctualityStatus | null {
  const scheduleDay = input.scheduleDay;
  if (!scheduleDay || !scheduleDay.isWorkingDay || scheduleDay.dayStatus !== "KERJA") {
    return null;
  }

  const hasAnyScan =
    Boolean(input.checkInTime) ||
    Boolean(input.checkOutTime) ||
    Boolean(input.breakOutTime) ||
    Boolean(input.breakInTime);
  if (!hasAnyScan) return null;

  if (isLate(input.checkInTime, scheduleDay.startTime, scheduleDay.checkInToleranceMinutes)) {
    return "TELAT";
  }

  if (!input.checkOutTime) {
    return "TELAT";
  }

  // breakToleranceMinutes covers both break return and checkout per spec ("toleransi istirahat/pulang")
  if (isLate(input.checkOutTime, scheduleDay.endTime, scheduleDay.breakToleranceMinutes)) {
    return "TELAT";
  }

  if (scheduleDay.breakStart && scheduleDay.breakEnd) {
    if (isLate(input.breakOutTime, scheduleDay.breakStart, scheduleDay.breakToleranceMinutes)) {
      return "TELAT";
    }

    if (isLate(input.breakInTime, scheduleDay.breakEnd, scheduleDay.breakToleranceMinutes)) {
      return "TELAT";
    }
  }

  return "TEPAT_WAKTU";
}
