import { describe, expect, it } from "vitest";
import { admsAttendanceRecordSchema, admsAttendanceIngestSchema } from "./attendance";

describe("admsAttendanceRecordSchema", () => {
  it("menerima batch rekap tanpa punctualityStatus", () => {
    const parsed = admsAttendanceRecordSchema.safeParse({
      employeeCode: "EMP-001",
      attendanceDate: "2026-05-11",
      attendanceStatus: "HADIR",
      checkInTime: "07:01",
      checkOutTime: "16:00",
      breakOutTime: "12:05",
      breakInTime: "13:04",
      rawPayload: {
        source: "AT301",
      },
    });

    expect(parsed.success).toBe(true);
  });
});

describe("admsAttendanceIngestSchema", () => {
  it("menerima payload batch cloud", () => {
    const parsed = admsAttendanceIngestSchema.safeParse({
      deviceId: "AT301-01",
      records: [
        {
          employeeCode: "EMP-001",
          attendanceDate: "2026-05-11",
          attendanceStatus: "HADIR",
          checkInTime: "07:01",
          checkOutTime: "16:00",
          breakOutTime: "12:05",
          breakInTime: "13:04",
        },
      ],
    });

    expect(parsed.success).toBe(true);
  });
});
