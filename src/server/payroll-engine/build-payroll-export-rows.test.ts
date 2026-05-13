import { describe, expect, it } from "vitest";
import { buildPayrollExportRows } from "./build-payroll-export-rows";

describe("buildPayrollExportRows", () => {
  it("membentuk baris export excel payroll yang siap ditulis ke worksheet", () => {
    const rows = buildPayrollExportRows({
      periodCode: "2026-04",
      results: [
        {
          employeeCode: "EMP-001",
          employeeName: "Budi",
          gradeName: "Grade A",
          divisionName: "Printing",
          baseSalaryPaid: 1_200_000,
          gradeAllowancePaid: 100_000,
          tenureAllowancePaid: 50_000,
          overtimeAmount: 0,
          bonusKinerjaAmount: 200_000,
          bonusPrestasiAmount: 0,
          bonusFulltimeAmount: 100_000,
          bonusDisciplineAmount: 75_000,
          bonusTeamAmount: 50_000,
          totalAdditionAmount: 575_000,
          totalDeductionAmount: 25_000,
          takeHomePay: 1_700_000,
        },
      ],
    });

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      periode: "2026-04",
      uid: "EMP-001",
      nama_lengkap: "Budi",
      grade: "Grade A",
      divisi: "Printing",
      total_thp: 1_700_000,
    });
  });
});
