import { describe, expect, it } from "vitest";
import { resolveAttendancePayrollEligibility } from "./resolve-attendance-payroll-eligibility";

describe("resolveAttendancePayrollEligibility", () => {
  it("tidak memberi fulltime dan disiplin jika belum ada data absensi", () => {
    expect(resolveAttendancePayrollEligibility({ scheduledWorkDays: 25, records: [] })).toEqual({
      hasAttendanceData: false,
      recordedWorkDays: 0,
      presentDays: 0,
      absenceDays: 0,
      lateDays: 0,
      fulltimeEligible: false,
      disciplineEligible: false,
    });
  });

  it("memberi fulltime dan disiplin jika semua hari kerja hadir tepat waktu", () => {
    const records = Array.from({ length: 25 }, (_, day) => ({
      attendanceStatus: "HADIR" as const,
      punctualityStatus: "TEPAT_WAKTU" as const,
      attendanceDate: `2026-05-${String(day + 1).padStart(2, "0")}`,
    }));

    expect(resolveAttendancePayrollEligibility({ scheduledWorkDays: 25, records })).toMatchObject({
      hasAttendanceData: true,
      recordedWorkDays: 25,
      presentDays: 25,
      absenceDays: 0,
      lateDays: 0,
      fulltimeEligible: true,
      disciplineEligible: true,
    });
  });

  it("menggugurkan fulltime dan disiplin jika ada alpa", () => {
    const records = [
      { attendanceStatus: "HADIR" as const, punctualityStatus: "TEPAT_WAKTU" as const, attendanceDate: "2026-05-01" },
      { attendanceStatus: "ALPA" as const, punctualityStatus: null, attendanceDate: "2026-05-02" },
    ];

    expect(resolveAttendancePayrollEligibility({ scheduledWorkDays: 2, records })).toMatchObject({
      absenceDays: 1,
      fulltimeEligible: false,
      disciplineEligible: false,
    });
  });

  it("menggugurkan disiplin jika ada telat tanpa menggugurkan fulltime", () => {
    const records = [
      { attendanceStatus: "HADIR" as const, punctualityStatus: "TEPAT_WAKTU" as const, attendanceDate: "2026-05-01" },
      { attendanceStatus: "HADIR" as const, punctualityStatus: "TELAT" as const, attendanceDate: "2026-05-02" },
    ];

    expect(resolveAttendancePayrollEligibility({ scheduledWorkDays: 2, records })).toMatchObject({
      lateDays: 1,
      fulltimeEligible: true,
      disciplineEligible: false,
    });
  });
});
