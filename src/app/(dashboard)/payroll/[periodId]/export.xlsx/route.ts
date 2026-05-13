import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { generatePayrollPreview, getPayrollWorkspace } from "@/server/actions/payroll";
import { buildPayrollExportRows } from "@/server/payroll-engine/build-payroll-export-rows";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    periodId: string;
  }>;
};

export async function GET(_: Request, context: RouteContext) {
  const { periodId } = await context.params;
  let workspace = await getPayrollWorkspace(periodId);

  if ("error" in workspace) {
    return NextResponse.json({ error: workspace.error }, { status: 403 });
  }

  let period = workspace.selectedPeriod;
  if (!period) {
    return NextResponse.json({ error: "Periode payroll tidak ditemukan." }, { status: 404 });
  }

  // Allow recap export directly from history even when period is still editable.
  // If preview rows are not ready yet, generate them once and re-fetch workspace.
  if (
    workspace.results.length === 0 &&
    ["OPEN", "DATA_REVIEW", "DRAFT"].includes(period.status)
  ) {
    const previewResult = await generatePayrollPreview({ periodId }, { revalidate: false });
    if (!("error" in previewResult)) {
      workspace = await getPayrollWorkspace(periodId);
      if ("error" in workspace) {
        return NextResponse.json({ error: workspace.error }, { status: 403 });
      }
      period = workspace.selectedPeriod;
      if (!period) {
        return NextResponse.json({ error: "Periode payroll tidak ditemukan." }, { status: 404 });
      }
    }
  }

  if (workspace.results.length === 0) {
    return NextResponse.json({ error: "Belum ada data payroll untuk diexport di periode ini." }, { status: 400 });
  }

  const periodCode = period.periodCode;
  const rows = buildPayrollExportRows({
    periodCode,
    results: workspace.results.map((row) => ({
      employeeCode: row.employeeCode ?? "-",
      employeeName: row.employeeName ?? "-",
      gradeName: row.gradeName ?? "-",
      divisionName: row.divisionName ?? "-",
      baseSalaryPaid: Number(row.baseSalaryPaid),
      gradeAllowancePaid: Number(row.gradeAllowancePaid),
      tenureAllowancePaid: Number(row.tenureAllowancePaid),
      overtimeAmount: Number(row.overtimeAmount),
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
      "Content-Disposition": `attachment; filename=\"payroll-${periodCode}.xlsx\"`,
    },
  });
}
