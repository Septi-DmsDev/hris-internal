import { z } from "zod";

export const createPayrollPeriodSchema = z.object({
  periodCode: z.string().regex(/^\d{4}-\d{2}$/, "Format periode harus YYYY-MM."),
  notes: z.string().trim().max(500).optional(),
});

export const payrollPeriodActionSchema = z.object({
  periodId: z.uuid(),
});

export const payrollAdjustmentSchema = z.object({
  periodId: z.uuid(),
  employeeId: z.uuid(),
  adjustmentType: z.enum(["ADDITION", "DEDUCTION"]),
  amount: z.coerce.number().positive(),
  reason: z.string().trim().min(3).max(500),
});

export const managerialKpiSummarySchema = z.object({
  periodId: z.uuid(),
  employeeId: z.uuid(),
  performancePercent: z.coerce.number().min(0).max(200),
  notes: z.string().trim().max(500).optional(),
});

const optionalMoney = z.union([z.coerce.number().min(0), z.literal("")]).transform((value) =>
  value === "" ? undefined : value
);

export const salaryConfigSchema = z.object({
  employeeId: z.uuid(),
  baseSalaryAmount: optionalMoney.optional(),
  gradeAllowanceAmount: optionalMoney.optional(),
  tenureAllowanceAmount: optionalMoney.optional(),
  dailyAllowanceAmount: optionalMoney.optional(),
  performanceBonusBaseAmount: optionalMoney.optional(),
  achievementBonus140Amount: optionalMoney.optional(),
  achievementBonus165Amount: optionalMoney.optional(),
  fulltimeBonusAmount: optionalMoney.optional(),
  disciplineBonusAmount: optionalMoney.optional(),
  teamBonusAmount: optionalMoney.optional(),
  overtimeRateAmount: optionalMoney.optional(),
  notes: z.string().trim().max(500).optional(),
});

export const gradeCompensationConfigSchema = z.object({
  gradeId: z.uuid(),
  allowanceAmount: optionalMoney.optional(),
  bonusKinerja80: optionalMoney.optional(),
  bonusKinerja90: optionalMoney.optional(),
  bonusKinerja100: optionalMoney.optional(),
  bonusKinerjaTeam80: optionalMoney.optional(),
  bonusKinerjaTeam90: optionalMoney.optional(),
  bonusKinerjaTeam100: optionalMoney.optional(),
  bonusDisiplin80: optionalMoney.optional(),
  bonusDisiplin90: optionalMoney.optional(),
  bonusDisiplin100: optionalMoney.optional(),
  bonusPrestasi140: optionalMoney.optional(),
  bonusPrestasi165: optionalMoney.optional(),
  isActive: z.boolean().optional(),
});

export type CreatePayrollPeriodInput = z.infer<typeof createPayrollPeriodSchema>;
export type PayrollPeriodActionInput = z.infer<typeof payrollPeriodActionSchema>;
export type PayrollAdjustmentInput = z.infer<typeof payrollAdjustmentSchema>;
export type ManagerialKpiSummaryInput = z.infer<typeof managerialKpiSummarySchema>;
export type SalaryConfigInput = z.infer<typeof salaryConfigSchema>;
export type GradeCompensationConfigInput = z.infer<typeof gradeCompensationConfigSchema>;
