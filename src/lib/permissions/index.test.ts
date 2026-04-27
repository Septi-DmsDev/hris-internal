// src/lib/permissions/index.test.ts
import { describe, it, expect } from "vitest";
import { canAccess, ROLE_PERMISSIONS } from "./index";

describe("canAccess", () => {
  it("SUPER_ADMIN bisa akses semua resource", () => {
    expect(canAccess("SUPER_ADMIN", "master:read")).toBe(true);
    expect(canAccess("SUPER_ADMIN", "payroll:write")).toBe(true);
    expect(canAccess("SUPER_ADMIN", "employees:delete")).toBe(true);
  });

  it("TEAMWORK hanya bisa akses resource sendiri", () => {
    expect(canAccess("TEAMWORK", "performance:input")).toBe(true);
    expect(canAccess("TEAMWORK", "payroll:write")).toBe(false);
    expect(canAccess("TEAMWORK", "master:write")).toBe(false);
  });

  it("SPV bisa approve dan baca data divisinya", () => {
    expect(canAccess("SPV", "performance:approve")).toBe(true);
    expect(canAccess("SPV", "employees:read")).toBe(true);
    expect(canAccess("SPV", "payroll:finalize")).toBe(false);
  });

  it("HRD bisa override dan baca semua data HR", () => {
    expect(canAccess("HRD", "performance:override")).toBe(true);
    expect(canAccess("HRD", "employees:write")).toBe(true);
    expect(canAccess("HRD", "payroll:finalize")).toBe(false);
  });

  it("FINANCE bisa akses payroll", () => {
    expect(canAccess("FINANCE", "payroll:read")).toBe(true);
    expect(canAccess("FINANCE", "payroll:finalize")).toBe(true);
    expect(canAccess("FINANCE", "employees:delete")).toBe(false);
  });
});
