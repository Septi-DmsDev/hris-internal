import { describe, expect, it } from "vitest";
import { resolveHeaderMeta } from "./header-title";

describe("resolveHeaderMeta", () => {
  it("resolves payroll detail routes", () => {
    expect(resolveHeaderMeta("/payroll/period-1/employee-1").title).toBe("Detail Payroll");
  });

  it("resolves attendance routes", () => {
    expect(resolveHeaderMeta("/absensi").title).toBe("Absensi");
  });

  it("falls back to dashboard for unknown route", () => {
    expect(resolveHeaderMeta("/unknown").title).toBe("Dashboard");
  });
});
