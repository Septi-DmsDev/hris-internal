import { POINT_TARGET_HARIAN } from "@/config/constants";
import { z } from "zod";

const optionalText = z.string().trim().optional().transform((value) => value || undefined);
const optionalTime = z.preprocess(
  (value) => {
    if (typeof value !== "string") return value;
    const normalized = value.trim();
    return normalized === "" ? undefined : normalized;
  },
  z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Format jam harus HH:MM").optional()
);

export const employeeSchema = z
  .object({
    employeeCode: z.string().trim().min(1, "ID karyawan wajib diisi").max(30),
    fullName: z.string().trim().min(1, "Nama lengkap wajib diisi").max(150),
    nickname: z.string().trim().max(100).optional().transform((value) => value || undefined),
    photoUrl: optionalText,
    birthPlace: z.string().trim().max(100).optional().transform((value) => value || undefined),
    birthDate: z.union([z.coerce.date(), z.literal(""), z.undefined()]).transform((value) => (value === "" ? undefined : value)),
    gender: z.string().trim().max(20).optional().transform((value) => value || undefined),
    religion: z.string().trim().max(50).optional().transform((value) => value || undefined),
    maritalStatus: z.string().trim().max(50).optional().transform((value) => value || undefined),
    phoneNumber: z.string().trim().max(30).optional().transform((value) => value || undefined),
    address: optionalText,
    startDate: z.coerce.date({ message: "Tanggal masuk wajib diisi" }),
    branchId: z.string().uuid("Cabang tidak valid"),
    divisionId: z.string().uuid("Divisi tidak valid"),
    positionId: z.string().uuid("Jabatan tidak valid"),
    jobdesk: z.string().trim().max(100).optional().transform((value) => value || undefined),
    gradeId: z.string().uuid("Grade tidak valid"),
    scheduleId: z
      .string()
      .uuid("Jadwal kerja tidak valid")
      .optional()
      .or(z.literal(""))
      .transform((value) => value || undefined),
    employeeGroup: z.enum(["MANAGERIAL", "TEAMWORK"]),
    employmentStatus: z.enum([
      "TRAINING",
      "REGULER",
      "DIALIHKAN_TRAINING",
      "TIDAK_LOLOS",
      "NONAKTIF",
      "RESIGN",
    ]),
    payrollStatus: z.enum(["TRAINING", "REGULER", "FINAL_PAYROLL", "NONAKTIF"]),
    supervisorEmployeeId: z
      .string()
      .uuid("Supervisor tidak valid")
      .optional()
      .or(z.literal(""))
      .transform((value) => value || undefined),
    effectiveDate: z.union([z.coerce.date(), z.literal(""), z.undefined()]).transform((value) => (value === "" ? undefined : value)),
    trainingGraduationDate: z
      .union([z.coerce.date(), z.literal(""), z.undefined()])
      .transform((value) => (value === "" ? undefined : value)),
    isActive: z.boolean().default(true),
    notes: optionalText,
  })
  .superRefine((value, ctx) => {
    if (value.employeeGroup === "TEAMWORK" && !value.supervisorEmployeeId) {
      ctx.addIssue({
        code: "custom",
        path: ["supervisorEmployeeId"],
        message: "Supervisor wajib dipilih untuk karyawan TEAMWORK.",
      });
    }

    if (value.trainingGraduationDate && value.trainingGraduationDate < value.startDate) {
      ctx.addIssue({
        code: "custom",
        path: ["trainingGraduationDate"],
        message: "Tanggal lulus training tidak boleh lebih awal dari tanggal masuk.",
      });
    }
  });

export const workScheduleDaySchema = z
  .object({
    dayOfWeek: z.coerce.number().int().min(0).max(6),
    dayStatus: z.enum(["KERJA", "OFF", "CUTI", "SAKIT", "IZIN", "ALPA", "SETENGAH_HARI"]),
    isWorkingDay: z.boolean().default(true),
    startTime: optionalTime,
    endTime: optionalTime,
    targetPoints: z.coerce.number().int().min(0).default(POINT_TARGET_HARIAN),
  })
  .superRefine((value, ctx) => {
    if (!value.isWorkingDay) {
      return;
    }

    if (!value.startTime || !value.endTime) {
      ctx.addIssue({
        code: "custom",
        path: ["startTime"],
        message: "Jam masuk dan pulang wajib diisi untuk hari kerja.",
      });
      return;
    }

    if (value.startTime === value.endTime) {
      ctx.addIssue({
        code: "custom",
        path: ["endTime"],
        message: "Jam pulang tidak boleh sama dengan jam masuk.",
      });
    }
  });

export const workScheduleSchema = z
  .object({
    code: z.string().trim().min(1, "Kode jadwal wajib diisi").max(20).toUpperCase(),
    name: z.string().trim().min(1, "Nama jadwal wajib diisi").max(100),
    description: optionalText,
    isActive: z.boolean().default(true),
    days: z.array(workScheduleDaySchema).length(7, "Jadwal kerja harus terdiri dari 7 hari."),
  })
  .superRefine((value, ctx) => {
    const uniqueDays = new Set(value.days.map((day) => day.dayOfWeek));
    if (uniqueDays.size !== 7) {
      ctx.addIssue({
        code: "custom",
        path: ["days"],
        message: "Jadwal kerja harus berisi 7 hari unik dari Senin sampai Minggu.",
      });
    }
  });

export const workShiftMasterSchema = z
  .object({
    code: z.string().trim().min(1, "Kode shift wajib diisi").max(20).toUpperCase(),
    name: z.string().trim().min(1, "Nama shift wajib diisi").max(100),
    startTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Format jam mulai harus HH:MM"),
    endTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Format jam selesai harus HH:MM"),
    isOvernight: z.boolean().default(false),
    applicableDivisionCodes: z.array(z.string().trim().min(1).max(20)).default([]),
    notes: optionalText,
    sortOrder: z.coerce.number().int().min(0).max(999).default(0),
    isActive: z.boolean().default(true),
  })
  .superRefine((value, ctx) => {
    if (value.startTime === value.endTime) {
      ctx.addIssue({
        code: "custom",
        path: ["endTime"],
        message: "Jam selesai tidak boleh sama dengan jam mulai.",
      });
    }
  });

export type EmployeeInput = z.infer<typeof employeeSchema>;
export type WorkScheduleDayInput = z.infer<typeof workScheduleDaySchema>;
export type WorkScheduleInput = z.infer<typeof workScheduleSchema>;
export type WorkShiftMasterInput = z.infer<typeof workShiftMasterSchema>;
