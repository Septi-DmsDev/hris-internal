import { z } from "zod";

export const overtimeRequestSchema = z.object({
  requestDate: z.coerce.date({ message: "Tanggal overtime wajib diisi." }),
  overtimeType: z.enum([
    "OVERTIME_1H",
    "OVERTIME_2H",
    "OVERTIME_3H",
    "LEMBUR_FULLDAY",
    "PATCH_ABSENCE_3H",
  ]),
  reason: z.string().trim().min(3, "Alasan minimal 3 karakter.").max(500),
});

export const overtimeDecisionSchema = z.object({
  requestId: z.string().uuid("ID pengajuan overtime tidak valid."),
  action: z.enum(["APPROVE", "REJECT"]),
  reviewNotes: z.string().trim().max(500).optional(),
});

export type OvertimeRequestInput = z.infer<typeof overtimeRequestSchema>;
export type OvertimeDecisionInput = z.infer<typeof overtimeDecisionSchema>;

