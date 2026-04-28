import { describe, expect, it } from "vitest";
import { resolvePayrollPeriod } from "./resolve-payroll-period";

describe("resolvePayrollPeriod", () => {
  it("membangun periode payroll 26-25 dari bulan anchor", () => {
    const result = resolvePayrollPeriod("2026-04");

    expect(result.periodCode).toBe("2026-04");
    expect(result.periodLabel).toBe("2026-03-26 s.d. 2026-04-25");
    expect(result.periodStartDate.toISOString().slice(0, 10)).toBe("2026-03-26");
    expect(result.periodEndDate.toISOString().slice(0, 10)).toBe("2026-04-25");
  });
});
