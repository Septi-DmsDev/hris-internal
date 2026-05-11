import { z } from "zod";

export const ATTENDANCE_STATUSES = ["HADIR", "ALPA", "IZIN", "SAKIT", "CUTI", "OFF"] as const;
export const ATTENDANCE_PUNCTUALITY_STATUSES = ["TEPAT_WAKTU", "TELAT"] as const;

const optionalTime = z
  .union([
    z.string().regex(/^\d{2}:\d{2}$/, "Format jam harus HH:mm."),
    z.literal(""),
    z.null(),
    z.undefined(),
  ])
  .transform((value) => value || undefined);

export const attendanceRecordSchema = z.object({
  employeeId: z.string().uuid("Karyawan tidak valid."),
  attendanceDate: z.coerce.date({ message: "Tanggal absensi wajib diisi." }),
  attendanceStatus: z.enum(ATTENDANCE_STATUSES),
  checkInTime: optionalTime,
  checkOutTime: optionalTime,
  punctualityStatus: z
    .union([z.enum(ATTENDANCE_PUNCTUALITY_STATUSES), z.literal(""), z.null(), z.undefined()])
    .transform((value) => value || undefined),
  notes: z.string().trim().max(300).optional().transform((value) => value || undefined),
}).superRefine((value, ctx) => {
  if (value.attendanceStatus === "HADIR" && !value.punctualityStatus) {
    ctx.addIssue({
      code: "custom",
      path: ["punctualityStatus"],
      message: "Status tepat waktu wajib diisi untuk kehadiran.",
    });
  }
});

export const attendanceFallbackRequestSchema = z.object({
  attendanceDate: z.coerce.date({ message: "Tanggal absensi wajib diisi." }),
  photoUrl: z.string().trim().url("URL foto bukti tidak valid."),
  latitude: z.coerce.number().min(-90).max(90),
  longitude: z.coerce.number().min(-180).max(180),
  fingerprintFailureReason: z.string().trim().min(5, "Alasan gagal sidik jari minimal 5 karakter.").max(500),
  developerModeDisabledConfirmed: z.boolean().refine((v) => v === true, {
    message: "Konfirmasi nonaktifkan opsi pengembang wajib dicentang.",
  }),
});

export const attendanceFallbackDecisionSchema = z.object({
  requestId: z.string().uuid("Request absensi fallback tidak valid."),
  reviewNotes: z.string().trim().max(300).optional().transform((value) => value || undefined),
});

const admsTime = z
  .string()
  .trim()
  .regex(/^\d{2}:\d{2}(:\d{2})?$/, "Format jam ADMS harus HH:mm atau HH:mm:ss.")
  .transform((value) => value.slice(0, 5));

export const admsAttendanceRecordSchema = z.object({
  employeeCode: z.string().trim().min(1, "employeeCode wajib diisi."),
  attendanceDate: z.coerce.date({ message: "attendanceDate wajib diisi." }),
  attendanceStatus: z.enum(ATTENDANCE_STATUSES).default("HADIR"),
  checkInTime: admsTime.optional(),
  checkOutTime: admsTime.optional(),
  breakOutTime: admsTime.optional(),
  breakInTime: admsTime.optional(),
  notes: z.string().trim().max(300).optional(),
  externalUserCode: z.string().trim().max(120).optional(),
  externalEventId: z.string().trim().max(120).optional(),
  rawPayload: z.record(z.string(), z.unknown()).optional(),
});

export const admsAttendanceIngestSchema = z.object({
  deviceId: z.string().trim().min(1, "deviceId wajib diisi.").max(120),
  records: z.array(admsAttendanceRecordSchema).min(1, "records minimal 1 data."),
});

export type AttendanceRecordInput = z.infer<typeof attendanceRecordSchema>;
export type AttendanceFallbackRequestInput = z.infer<typeof attendanceFallbackRequestSchema>;
export type AttendanceFallbackDecisionInput = z.infer<typeof attendanceFallbackDecisionSchema>;
export type AdmsAttendanceRecordInput = z.infer<typeof admsAttendanceRecordSchema>;
export type AdmsAttendanceIngestInput = z.infer<typeof admsAttendanceIngestSchema>;
