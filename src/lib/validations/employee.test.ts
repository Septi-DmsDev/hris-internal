import { POINT_TARGET_HARIAN } from "@/config/constants";
import { describe, expect, it } from "vitest";
import { employeeSchema, workScheduleSchema } from "./employee";

const validEmployeeInput = {
  employeeCode: "EMP-001",
  fullName: "Budi Santoso",
  nickname: "Budi",
  phoneNumber: "08123456789",
  address: "Jl. Mawar No. 1",
  startDate: "2026-04-01",
  branchId: "11111111-1111-4111-8111-111111111111",
  divisionId: "22222222-2222-4222-8222-222222222222",
  positionId: "33333333-3333-4333-8333-333333333333",
  gradeId: "44444444-4444-4444-8444-444444444444",
  jobdesk: "Packing",
  employeeGroup: "TEAMWORK",
  employmentStatus: "TRAINING",
  payrollStatus: "TRAINING",
  supervisorEmployeeId: "55555555-5555-4555-8555-555555555555",
  isActive: true,
  notes: "Catatan onboarding",
  bpjsKetenagakerjaanActive: false,
  bpjsKesehatanActive: false,
};

describe("employeeSchema", () => {
  it("supervisor opsional untuk karyawan teamwork (auto-assign by division)", () => {
    const parsed = employeeSchema.safeParse({
      ...validEmployeeInput,
      supervisorEmployeeId: undefined,
    });

    expect(parsed.success).toBe(true);
  });

  it("supervisor opsional untuk karyawan training (auto-assign by division)", () => {
    const parsed = employeeSchema.safeParse({
      ...validEmployeeInput,
      employeeGroup: "TRAINING",
      supervisorEmployeeId: undefined,
    });

    expect(parsed.success).toBe(true);
  });

  it("mengubah string tanggal menjadi Date untuk input valid", () => {
    const parsed = employeeSchema.safeParse(validEmployeeInput);

    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.startDate).toBeInstanceOf(Date);
      expect(parsed.data.trainingGraduationDate).toBeUndefined();
    }
  });

  it("menolak BPJS KT aktif tanpa nomor", () => {
    const parsed = employeeSchema.safeParse({
      ...validEmployeeInput,
      bpjsKetenagakerjaanActive: true,
      bpjsKetenagakerjaanNumber: "",
    });

    expect(parsed.success).toBe(false);
  });
});

describe("workScheduleSchema", () => {
  const baseWorkingDay = {
    dayStatus: "KERJA" as const,
    isWorkingDay: true,
    startTime: "08:00",
    endTime: "17:00",
    breakStart: "12:00",
    breakEnd: "13:00",
    breakToleranceMinutes: 5,
    checkInToleranceMinutes: 0,
    targetPoints: POINT_TARGET_HARIAN,
  };

  it("menolak jadwal yang tidak memiliki 7 hari unik", () => {
    const parsed = workScheduleSchema.safeParse({
      code: "REG-A",
      name: "Reguler A",
      isActive: true,
      days: [
        { dayOfWeek: 0, dayStatus: "OFF", isWorkingDay: false, targetPoints: 0 },
        { dayOfWeek: 1, ...baseWorkingDay },
        { dayOfWeek: 2, ...baseWorkingDay },
        { dayOfWeek: 3, ...baseWorkingDay },
        { dayOfWeek: 4, ...baseWorkingDay },
        { dayOfWeek: 5, ...baseWorkingDay },
        { dayOfWeek: 5, ...baseWorkingDay },
      ],
    });

    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.error.issues[0]?.message).toContain("7 hari");
    }
  });

  it("menolak hari kerja tanpa jam kerja lengkap", () => {
    const parsed = workScheduleSchema.safeParse({
      code: "REG-B",
      name: "Reguler B",
      isActive: true,
      days: Array.from({ length: 7 }, (_, dayOfWeek) => ({
        dayOfWeek,
        dayStatus: dayOfWeek === 0 ? "OFF" : "KERJA",
        isWorkingDay: dayOfWeek !== 0,
        startTime: dayOfWeek === 1 ? "" : dayOfWeek === 0 ? undefined : "08:00",
        endTime: dayOfWeek === 1 ? "" : dayOfWeek === 0 ? undefined : "17:00",
        breakStart: dayOfWeek === 0 ? undefined : "12:00",
        breakEnd: dayOfWeek === 0 ? undefined : "13:00",
        breakToleranceMinutes: dayOfWeek === 0 ? 0 : 5,
        checkInToleranceMinutes: 0,
        targetPoints: dayOfWeek === 0 ? 0 : POINT_TARGET_HARIAN,
      })),
    });

    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.error.issues[0]?.message).toContain("Jam masuk");
    }
  });

  it("menolak break window yang tidak berpasangan", () => {
    const parsed = workScheduleSchema.safeParse({
      code: "REG-C",
      name: "Reguler C",
      isActive: true,
      days: Array.from({ length: 7 }, (_, dayOfWeek) => ({
        dayOfWeek,
        dayStatus: dayOfWeek === 0 ? "OFF" : "KERJA",
        isWorkingDay: dayOfWeek !== 0,
        startTime: dayOfWeek === 0 ? "" : "08:00",
        endTime: dayOfWeek === 0 ? "" : "17:00",
        breakStart: dayOfWeek === 0 ? "" : "12:00",
        breakEnd: dayOfWeek === 0 ? "" : "",
        breakToleranceMinutes: dayOfWeek === 0 ? 0 : 5,
        checkInToleranceMinutes: 0,
        targetPoints: dayOfWeek === 0 ? 0 : POINT_TARGET_HARIAN,
      })),
    });

    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.error.issues[0]?.message).toContain("istirahat");
    }
  });
});
