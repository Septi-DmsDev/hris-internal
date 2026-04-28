// src/lib/permissions/index.test.ts
import { describe, it, expect } from "vitest";
import { canAccess, ROLE_PERMISSIONS, requireRole, isUserRole } from "./index";

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

  it("MANAGERIAL hanya bisa baca employees dan payroll", () => {
    expect(canAccess("MANAGERIAL", "employees:read")).toBe(true);
    expect(canAccess("MANAGERIAL", "payroll:write")).toBe(false);
    expect(canAccess("MANAGERIAL", "employees:write")).toBe(false);
  });

  it("PAYROLL_VIEWER hanya bisa baca payroll", () => {
    expect(canAccess("PAYROLL_VIEWER", "payroll:read")).toBe(true);
    expect(canAccess("PAYROLL_VIEWER", "payroll:write")).toBe(false);
    expect(canAccess("PAYROLL_VIEWER", "payroll:finalize")).toBe(false);
  });
});

describe("requireRole", () => {
  it("cocok dengan satu role yang benar", () => {
    expect(requireRole("HRD", "HRD")).toBe(true);
    expect(requireRole("HRD", "FINANCE")).toBe(false);
  });

  it("cocok dengan array role", () => {
    expect(requireRole("SPV", ["SPV", "MANAGERIAL"])).toBe(true);
    expect(requireRole("TEAMWORK", ["SPV", "MANAGERIAL"])).toBe(false);
  });
});

describe("isUserRole", () => {
  it("mengembalikan true untuk role yang valid", () => {
    expect(isUserRole("SUPER_ADMIN")).toBe(true);
    expect(isUserRole("TEAMWORK")).toBe(true);
    expect(isUserRole("PAYROLL_VIEWER")).toBe(true);
  });

  it("mengembalikan false untuk nilai yang tidak valid", () => {
    expect(isUserRole("ADMIN")).toBe(false);
    expect(isUserRole("")).toBe(false);
    expect(isUserRole(null)).toBe(false);
    expect(isUserRole(42)).toBe(false);
    expect(isUserRole(undefined)).toBe(false);
  });
});
