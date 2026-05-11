import { describe, expect, test } from "vitest";
import { filterAdjustmentEmployeeOptions } from "./employee-search";

const rows = [
  {
    employeeId: "employee-1",
    employeeCode: "FAIFAC",
    employeeName: "Faiq Fachruddin",
    positionName: "TEAMWORK",
    divisionName: "Printing",
    employeeGroup: "TEAMWORK" as const,
  },
  {
    employeeId: "employee-2",
    employeeCode: "RENMAN",
    employeeName: "Rendy Saputra",
    positionName: "Managerial",
    divisionName: "Finance",
    employeeGroup: "KARYAWAN_TETAP" as const,
  },
];

describe("filterAdjustmentEmployeeOptions", () => {
  test("matches a full word inside the employee label", () => {
    const result = filterAdjustmentEmployeeOptions(rows, "BPJS", "fach");

    expect(result).toHaveLength(1);
    expect(result[0]?.employeeId).toBe("employee-1");
  });

  test("matches employee code and ignores case", () => {
    const result = filterAdjustmentEmployeeOptions(rows, "BPJS", "renman");

    expect(result).toHaveLength(1);
    expect(result[0]?.employeeId).toBe("employee-2");
  });

  test("limits team damage adjustment to managerial employees", () => {
    const result = filterAdjustmentEmployeeOptions(rows, "GANTI_RUGI_TEAM", "");

    expect(result).toHaveLength(1);
    expect(result[0]?.employeeGroup).toBe("KARYAWAN_TETAP");
  });
});
