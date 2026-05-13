import { describe, expect, it } from "vitest";
import { classifyTaps } from "./classify-taps";
import type { TapScheduleWindow } from "./classify-taps";

const schedule: TapScheduleWindow = {
  isWorkingDay: true,
  startTime: "08:00",
  endTime: "17:00",
  breakStart: "12:00",
  breakEnd: "13:00",
  checkOutStart: "16:00",
};

const scheduleNoBreak: TapScheduleWindow = {
  isWorkingDay: true,
  startTime: "08:00",
  endTime: "17:00",
  breakStart: null,
  breakEnd: null,
  checkOutStart: "16:00",
};

describe("classifyTaps", () => {
  it("2 tap normal: masuk pagi, pulang sore", () => {
    const result = classifyTaps(["08:02", "17:05"], schedule);
    expect(result.checkInTime).toBe("08:02");
    expect(result.checkOutTime).toBe("17:05");
    expect(result.breakOutTime).toBeUndefined();
    expect(result.breakInTime).toBeUndefined();
  });

  it("4 tap lengkap: masuk, istirahat keluar, istirahat masuk, pulang", () => {
    const result = classifyTaps(["08:01", "12:05", "13:02", "17:03"], schedule);
    expect(result.checkInTime).toBe("08:01");
    expect(result.breakOutTime).toBe("12:05");
    expect(result.breakInTime).toBe("13:02");
    expect(result.checkOutTime).toBe("17:03");
  });

  it("1 tap: hanya check_in", () => {
    const result = classifyTaps(["08:00"], schedule);
    expect(result.checkInTime).toBe("08:00");
    expect(result.checkOutTime).toBeUndefined();
  });

  it("tap ganda di pagi hari: ambil yang pertama sebagai check_in", () => {
    const result = classifyTaps(["07:58", "08:05", "17:00"], schedule);
    expect(result.checkInTime).toBe("07:58");
    expect(result.checkOutTime).toBe("17:00");
  });

  it("tap ganda di sore hari: ambil yang terakhir sebagai check_out", () => {
    const result = classifyTaps(["08:00", "16:30", "17:10"], schedule);
    expect(result.checkInTime).toBe("08:00");
    expect(result.checkOutTime).toBe("17:10");
  });

  it("tap sebelum checkOutStart tidak masuk check_out zone", () => {
    // tap 15:50 < checkOutStart 16:00 → masuk break_in zone, bukan check_out
    const result = classifyTaps(["08:00", "15:50"], schedule);
    expect(result.checkInTime).toBe("08:00");
    expect(result.checkOutTime).toBeUndefined();
  });

  it("tanpa break: 2 tap dibagi oleh checkOutStart", () => {
    const result = classifyTaps(["08:00", "17:00"], scheduleNoBreak);
    expect(result.checkInTime).toBe("08:00");
    expect(result.checkOutTime).toBe("17:00");
    expect(result.breakOutTime).toBeUndefined();
  });

  it("tanpa jadwal: first=check_in, last=check_out", () => {
    const result = classifyTaps(["08:00", "12:00", "17:00"], null);
    expect(result.checkInTime).toBe("08:00");
    expect(result.checkOutTime).toBe("17:00");
  });

  it("tap kosong: return object kosong", () => {
    const result = classifyTaps([], schedule);
    expect(result).toEqual({});
  });
});
