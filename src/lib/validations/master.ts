import { z } from "zod";

export const branchSchema = z.object({
  name: z.string().min(1, "Nama cabang wajib diisi").max(100),
  address: z.string().optional(),
  isActive: z.boolean().default(true),
});

export const divisionSchema = z.object({
  name: z.string().min(1, "Nama divisi wajib diisi").max(100),
  code: z.string().min(1, "Kode wajib diisi").max(20).toUpperCase(),
  branchId: z.string().uuid("Branch tidak valid").optional(),
  trainingPassPercent: z.coerce.number().int().min(0).max(100).default(80),
  isActive: z.boolean().default(true),
});

export const positionSchema = z.object({
  name: z.string().min(1, "Nama jabatan wajib diisi").max(100),
  code: z.string().min(1, "Kode wajib diisi").max(20).toUpperCase(),
  employeeGroup: z.enum(["MANAGERIAL", "TEAMWORK"]),
  isActive: z.boolean().default(true),
});

export const gradeSchema = z.object({
  name: z.string().min(1, "Nama grade wajib diisi").max(50),
  code: z.string().min(1, "Kode wajib diisi").max(20).toUpperCase(),
  description: z.string().optional(),
  isActive: z.boolean().default(true),
});

export type BranchInput = z.infer<typeof branchSchema>;
export type DivisionInput = z.infer<typeof divisionSchema>;
export type PositionInput = z.infer<typeof positionSchema>;
export type GradeInput = z.infer<typeof gradeSchema>;
