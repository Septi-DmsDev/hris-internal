import type { PayrollPeriodStatus } from "@/types";

type TransitionAction = "mark_paid" | "lock";

type TransitionResult = {
  nextStatus: PayrollPeriodStatus;
  allowed: boolean;
  reason?: string;
};

export function resolvePayrollStatusTransition(
  currentStatus: PayrollPeriodStatus,
  action: TransitionAction
): TransitionResult {
  if (currentStatus === "LOCKED") {
    return {
      nextStatus: "LOCKED",
      allowed: false,
      reason: "Periode payroll yang sudah LOCKED tidak bisa diubah lagi.",
    };
  }

  if (action === "mark_paid") {
    if (currentStatus !== "FINALIZED") {
      return {
        nextStatus: currentStatus,
        allowed: false,
        reason: "Periode payroll harus berstatus FINALIZED sebelum ditandai PAID.",
      };
    }

    return {
      nextStatus: "PAID",
      allowed: true,
    };
  }

  if (currentStatus !== "PAID") {
    return {
      nextStatus: currentStatus,
      allowed: false,
      reason: "Periode payroll harus berstatus PAID sebelum dikunci.",
    };
  }

  return {
    nextStatus: "LOCKED",
    allowed: true,
  };
}
