import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { getPayrollWorkspace } from "@/server/actions/payroll";
import { buildPayrollExportRows } from "@/server/payroll-engine/build-payroll-export-rows";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    periodId: string;
  }>;
};

export async function GET(_: Request, context: RouteContext) {
  const { periodId } = await context.params;
  const workspace = await getPayrollWorkspace(periodId);

  if ("error" in workspace) {
    return NextResponse.json({ error: workspace.error }, { status: 403 });
  }

  const period = workspace.selectedPeriod;
  if (!period) {
    return NextResponse.json({ error: "Periode payroll tidak ditemukan." }, { status: 404 });
  }

  const rows = buildPayrollExportRows({
    periodCode: period.periodCode,
    results: workspace.results.map((row) => ({
      employeeCode: row.employeeCode ?? "-",
      employeeName: row.employeeName ?? "-",
      employeeGroup: row.employeeGroup ?? "TEAMWORK",
      divisionName: row.divisionName ?? "-",
      positionName: row.positionName ?? "-",
      payrollStatus: row.payrollStatus ?? "-",
      performancePercent: Number(row.performancePercent),
      baseSalaryPaid: Number(row.baseSalaryPaid),
      gradeAllowancePaid: Number(row.gradeAllowancePaid),
      tenureAllowancePaid: Number(row.tenureAllowancePaid),
      overtimeAmount: 0,
      bonusKinerjaAmount: Number(row.bonusKinerjaAmount),
      bonusPrestasiAmount: Number(row.bonusPrestasiAmount),
      bonusFulltimeAmount: Number(row.bonusFulltimeAmount),
      bonusDisciplineAmount: Number(row.bonusDisciplineAmount),
      bonusTeamAmount: Number(row.bonusTeamAmount),
      totalAdditionAmount: Number(row.totalAdditionAmount),
      totalDeductionAmount: Number(row.totalDeductionAmount),
      takeHomePay: Number(row.takeHomePay),
    })),
  });

  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.json_to_sheet(rows);
  XLSX.utils.book_append_sheet(workbook, worksheet, "Payroll");
  const buffer = XLSX.write(workbook, { bookType: "xlsx", type: "buffer" });

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename=\"payroll-${period.periodCode}.xlsx\"`,
    },
  });
}
