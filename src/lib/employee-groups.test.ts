import { describe, expect, it } from "vitest";
import {
  isKpiEmployeeGroup,
  isPointBasedEmployeeGroup,
  normalizeEmployeeGroup,
  resolveEmployeeGroupFromTrainingDate,
  resolveEmployeeGroupLabel,
  resolveEmployeeGroupSearchText,
} from "./employee-groups";

describe("employee group helper", () => {
  it("maps legacy and new employee groups to the new display labels", () => {
    expect(resolveEmployeeGroupLabel("MANAGERIAL")).toBe("Karyawan Tetap");
    expect(resolveEmployeeGroupLabel("TEAMWORK")).toBe("Mitra Kerja");
    expect(resolveEmployeeGroupLabel("BORONGAN")).toBe("Borongan");
    expect(resolveEmployeeGroupLabel("TRAINING")).toBe("Training");
  });

  it("classifies point-based and KPI-based employee groups", () => {
    expect(isPointBasedEmployeeGroup("TEAMWORK")).toBe(true);
    expect(isPointBasedEmployeeGroup("MITRA_KERJA")).toBe(true);
    expect(isPointBasedEmployeeGroup("TRAINING")).toBe(true);
    expect(isPointBasedEmployeeGroup("KARYAWAN_TETAP")).toBe(false);

    expect(isKpiEmployeeGroup("MANAGERIAL")).toBe(true);
    expect(isKpiEmployeeGroup("KARYAWAN_TETAP")).toBe(true);
    expect(isKpiEmployeeGroup("MITRA_KERJA")).toBe(false);
  });

  it("normalizes legacy employee groups to the new categories", () => {
    expect(normalizeEmployeeGroup("MANAGERIAL")).toBe("KARYAWAN_TETAP");
    expect(normalizeEmployeeGroup("TEAMWORK")).toBe("MITRA_KERJA");
    expect(normalizeEmployeeGroup("BORONGAN")).toBe("BORONGAN");
  });

  it("builds searchable text for employee group labels", () => {
    expect(resolveEmployeeGroupSearchText("MANAGERIAL")).toContain("Karyawan Tetap");
    expect(resolveEmployeeGroupSearchText("MANAGERIAL")).toContain("MANAGERIAL");
    expect(resolveEmployeeGroupSearchText("TRAINING")).toContain("Training");
  });

  it("maps missing training graduation date to Training", () => {
    expect(resolveEmployeeGroupFromTrainingDate(undefined)).toBe("TRAINING");
    expect(resolveEmployeeGroupFromTrainingDate(new Date("2026-04-01"))).toBe("MITRA_KERJA");
  });
});
