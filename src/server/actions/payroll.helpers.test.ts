import { describe, expect, it } from "vitest";
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
