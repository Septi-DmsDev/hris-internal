import { describe, expect, it } from "vitest";
import {
  isKpiEmployeeGroup,
  isPointBasedEmployeeGroup,
  normalizeEmployeeGroup,
  resolveEmployeeGroupLabel,
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
});
