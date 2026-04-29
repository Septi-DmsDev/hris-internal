import { describe, expect, it } from "vitest";
import {
  buildPersonalQuickActions,
  resolveMyAccessState,
} from "./me.helpers";

describe("resolveMyAccessState", () => {
  it("redirects super admin without employee link to dashboard", () => {
    expect(resolveMyAccessState("SUPER_ADMIN", null)).toEqual({
      canAccess: false,
      redirectTo: "/dashboard",
    });
  });

  it("allows employee-linked teamwork user", () => {
    expect(
      resolveMyAccessState("TEAMWORK", "123e4567-e89b-12d3-a456-426614174000")
    ).toEqual({
      canAccess: true,
      redirectTo: null,
    });
  });

  it("allows non-super-admin without employee link but marks no redirect", () => {
    expect(resolveMyAccessState("FINANCE", null)).toEqual({
      canAccess: true,
      redirectTo: null,
    });
  });
});

describe("buildPersonalQuickActions", () => {
  it("puts performance first for teamwork", () => {
    const actions = buildPersonalQuickActions("TEAMWORK");

    expect(actions[0]?.href).toBe("/performance");
    expect(actions.some((item) => item.href === "/tickets")).toBe(true);
    expect(actions.some((item) => item.href === "/me/profile")).toBe(true);
  });

  it("includes payroll and finance for finance role", () => {
    const actions = buildPersonalQuickActions("FINANCE");

    expect(actions.some((item) => item.href === "/payroll")).toBe(true);
    expect(actions.some((item) => item.href === "/finance")).toBe(true);
    expect(actions.some((item) => item.href === "/performance")).toBe(false);
  });
});
