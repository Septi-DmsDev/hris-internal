import { describe, expect, it } from "vitest";
import { resolveHeaderTitle } from "./header-title";

describe("resolveHeaderTitle", () => {
  it("resolves personal routes", () => {
    expect(resolveHeaderTitle("/me")).toBe("Saya");
    expect(resolveHeaderTitle("/me/profile")).toBe("Profil Saya");
  });

  it("resolves payroll detail routes", () => {
    expect(resolveHeaderTitle("/payroll/period-1/employee-1")).toBe("Detail Payroll");
  });

  it("falls back to dashboard for unknown route", () => {
    expect(resolveHeaderTitle("/unknown")).toBe("Dashboard");
  });
});
