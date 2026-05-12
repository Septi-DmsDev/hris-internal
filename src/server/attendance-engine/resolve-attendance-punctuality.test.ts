import { describe, expect, it } from "vitest";
import { resolveAttendancePunctuality } from "./resolve-attendance-punctuality";

describe("resolveAttendancePunctuality", () => {
  const scheduleDay = {
    isWorkingDay: true,
    dayStatus: "KERJA",
    startTime: "07:00",
    endTime: "16:00",
    breakStart: "12:00",
    breakEnd: "13:00",
    breakToleranceMinutes: 5,
    checkInToleranceMinutes: 0,
  } as const;

  it("menganggap check-in terlambat tanpa toleransi", () => {
    expect(resolveAttendancePunctuality({
      checkInTime: "07:01",
      checkOutTime: "16:00",
      scheduleDay,
    })).toBe("TELAT");
  });

  it("mengizinkan break masuk/keluar dalam toleransi 5 menit", () => {
    expect(resolveAttendancePunctuality({
      checkInTime: "07:00",
      checkOutTime: "16:00",
      breakOutTime: "12:05",
      breakInTime: "13:04",
      scheduleDay,
    })).toBe("TEPAT_WAKTU");
  });

  it("menandai telat jika break melewati toleransi", () => {
    expect(resolveAttendancePunctuality({
      checkInTime: "07:00",
      checkOutTime: "16:00",
      breakOutTime: "12:06",
      breakInTime: "13:05",
      scheduleDay,
    })).toBe("TELAT");
  });

  it("mengizinkan checkout dalam toleransi 5 menit (lebih lambat)", () => {
    expect(resolveAttendancePunctuality({
      checkInTime: "07:00",
      checkOutTime: "16:05",
      scheduleDay,
    })).toBe("TEPAT_WAKTU");
  });

  it("menandai telat jika checkout melebihi toleransi (terlalu lambat)", () => {
    expect(resolveAttendancePunctuality({
      checkInTime: "07:00",
      checkOutTime: "16:06",
      scheduleDay,
    })).toBe("TELAT");
  });

  it("mengizinkan checkout tepat waktu pada jam end", () => {
    expect(resolveAttendancePunctuality({
      checkInTime: "07:00",
      checkOutTime: "16:00",
      scheduleDay,
    })).toBe("TEPAT_WAKTU");
  });

  it("menganggap checkout yang hilang sebagai telat", () => {
    expect(resolveAttendancePunctuality({
      checkInTime: "07:00",
      scheduleDay,
    })).toBe("TELAT");
  });

  it("returns null for non-working day", () => {
    const result = resolveAttendancePunctuality({
      checkInTime: "07:00",
      checkOutTime: "16:00",
      scheduleDay: { ...scheduleDay, isWorkingDay: false, dayStatus: "OFF" },
    });
    expect(result).toBeNull();
  });

  it("returns null when no scan data is present", () => {
    const result = resolveAttendancePunctuality({
      checkInTime: null,
      checkOutTime: null,
      breakOutTime: null,
      breakInTime: null,
      scheduleDay,
    });
    expect(result).toBeNull();
  });
});
