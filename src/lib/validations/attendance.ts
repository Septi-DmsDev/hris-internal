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

export type AttendanceRecordInput = z.infer<typeof attendanceRecordSchema>;
