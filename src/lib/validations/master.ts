import { z } from "zod";
import { ALL_EMPLOYEE_GROUPS } from "@/lib/employee-groups";

export const branchSchema = z.object({
  name: z.string().min(1, "Nama cabang wajib diisi").max(100),
  address: z.string().optional(),
  latitude: z.coerce.number().min(-90).max(90).optional(),
  longitude: z.coerce.number().min(-180).max(180).optional(),
  maxAttendanceRadiusMeters: z.coerce.number().int().min(20).max(5000).default(150),
  isActive: z.boolean().default(true),
}).superRefine((value, ctx) => {
  const hasLat = value.latitude !== undefined;
  const hasLon = value.longitude !== undefined;
  if (hasLat !== hasLon) {
    ctx.addIssue({
      code: "custom",
      path: ["latitude"],
      message: "Latitude dan longitude harus diisi berpasangan.",
    });
  }
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
  employeeGroup: z.enum([...ALL_EMPLOYEE_GROUPS]),
  isActive: z.boolean().default(true),
});

export const gradeSchema = z.object({
  name: z.string().min(1, "Nama grade wajib diisi").max(50),
  code: z.string().min(1, "Kode wajib diisi").max(20).toUpperCase(),
  description: z.string().optional(),
  isActive: z.boolean().default(true),
});

export const employeeGroupConfigSchema = z.object({
  employeeGroup: z.enum([...ALL_EMPLOYEE_GROUPS]),
  displayName: z.string().trim().min(1, "Nama tampilan wajib diisi").max(100),
  legacyAlias: z.string().trim().max(50).optional(),
  payrollMode: z.enum(["KPI", "POINT"]),
  description: z.string().trim().max(255).optional(),
  sortOrder: z.coerce.number().int().min(0).max(999).default(0),
  isActive: z.boolean().default(true),
});

export type BranchInput = z.infer<typeof branchSchema>;
export type DivisionInput = z.infer<typeof divisionSchema>;
export type PositionInput = z.infer<typeof positionSchema>;
export type GradeInput = z.infer<typeof gradeSchema>;
export type EmployeeGroupConfigInput = z.infer<typeof employeeGroupConfigSchema>;
