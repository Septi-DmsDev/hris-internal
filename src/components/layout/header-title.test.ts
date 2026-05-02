import { describe, expect, it } from "vitest";
import { resolveHeaderMeta } from "./header-title";

describe("resolveHeaderMeta", () => {
  it("resolves personal routes", () => {
    expect(resolveHeaderMeta("/me").title).toBe("Saya");
    expect(resolveHeaderMeta("/me/profile").title).toBe("Profil Saya");
  });

  it("resolves payroll detail routes", () => {
    expect(resolveHeaderMeta("/payroll/period-1/employee-1").title).toBe("Detail Payroll");
  });

  it("falls back to dashboard for unknown route", () => {
    expect(resolveHeaderMeta("/unknown").title).toBe("Dashboard");
  });
});
