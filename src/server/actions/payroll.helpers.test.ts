import { describe, expect, it } from "vitest";
import * as payrollHelpers from "./payroll.helpers";
import { canReadPayrollEmployeeDetail } from "./payroll.helpers";

describe("canReadPayrollEmployeeDetail", () => {
  it("allows payroll roles to read any employee detail", () => {
    expect(
      canReadPayrollEmployeeDetail("HRD", null, "emp-1")
    ).toBe(true);
  });

  it("allows self access for non-payroll role when employee is linked", () => {
    expect(
      canReadPayrollEmployeeDetail("TEAMWORK", "emp-1", "emp-1")
    ).toBe(true);
  });

  it("denies non-payroll role reading another employee detail", () => {
    expect(
      canReadPayrollEmployeeDetail("TEAMWORK", "emp-1", "emp-2")
    ).toBe(false);
  });
});

describe("payroll adjustment helpers", () => {
  it("menandai BPJS dan uang transport sebagai adjustment recurring", () => {
    expect(payrollHelpers.isRecurringAdjustmentCategory("BPJS")).toBe(true);
    expect(payrollHelpers.isRecurringAdjustmentCategory("TRANSPORT")).toBe(true);
    expect(payrollHelpers.isRecurringAdjustmentCategory("KASBON")).toBe(false);
  });

  it("menentukan tipe adjustment dari kategori", () => {
    expect(payrollHelpers.resolveAdjustmentTypeForCategory("TRANSPORT")).toBe("ADDITION");
    expect(payrollHelpers.resolveAdjustmentTypeForCategory("MANUAL_ADDITION")).toBe("ADDITION");
    expect(payrollHelpers.resolveAdjustmentTypeForCategory("BPJS")).toBe("DEDUCTION");
  });

  it("mengenali reason legacy BPJS/transport sebagai recurring", () => {
    expect(payrollHelpers.isRecurringAdjustmentReason("BPJS::catatan")).toBe(true);
    expect(payrollHelpers.isRecurringAdjustmentReason("TRANSPORT")).toBe(true);
    expect(payrollHelpers.isRecurringAdjustmentReason("CICILAN::12::Laptop")).toBe(false);
  });

  it("mengizinkan auto preview hanya untuk periode yang masih bisa dihitung ulang", () => {
    expect(payrollHelpers.shouldAutoGeneratePayrollPreview(true, "OPEN")).toBe(true);
    expect(payrollHelpers.shouldAutoGeneratePayrollPreview(true, "DRAFT")).toBe(true);
    expect(payrollHelpers.shouldAutoGeneratePayrollPreview(true, "FINALIZED")).toBe(false);
    expect(payrollHelpers.shouldAutoGeneratePayrollPreview(true, "PAID")).toBe(false);
    expect(payrollHelpers.shouldAutoGeneratePayrollPreview(false, "DRAFT")).toBe(false);
  });
});
