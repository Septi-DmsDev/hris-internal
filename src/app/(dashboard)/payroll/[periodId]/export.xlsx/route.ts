import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { generatePayrollPreview, getPayrollWorkspace } from "@/server/actions/payroll";
import { normalizeEmployeeGroup } from "@/lib/employee-groups";

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
    return NextResponse.json({ error: "Belum ada data payroll untuk direkap di periode ini." }, { status: 400 });
  }

  const periodCode = period.periodCode;

  const normalizedRows = workspace.results.map((row) => ({
    id: row.employeeId,
    uid: row.employeeCode ?? "-",
    name: row.employeeName ?? "-",
    divisionName: row.divisionName ?? "-",
    positionName: (row.positionName ?? "-").toUpperCase(),
    normalizedGroup: normalizeEmployeeGroup(row.employeeGroup ?? "MITRA_KERJA"),
    thp: Number(row.takeHomePay),
  }));

  const assignedEmployeeIds = new Set<string>();
  const tabSummaries: Array<{ tabName: string; employeeCount: number; totalThp: number }> = [];

  function createSheetRows(rows: typeof normalizedRows) {
    const body = rows
      .map((row) => [row.uid, row.name, row.thp] as const)
      .sort((a, b) => String(a[1]).localeCompare(String(b[1])));
    const totalThp = rows.reduce((sum, row) => sum + row.thp, 0);

    return [
      ["periode", periodCode],
      [],
      ["uid", "nama_lengkap", "total_thp"],
      ...body,
      [],
      ["TOTAL THP", "", totalThp],
    ] as Array<Array<string | number>>;
  }

  function appendSheet(workbook: XLSX.WorkBook, title: string, rows: typeof normalizedRows) {
    if (rows.length === 0) return;
    const uniqueRows: typeof normalizedRows = [];
    for (const row of rows) {
      if (assignedEmployeeIds.has(row.id)) continue;
      assignedEmployeeIds.add(row.id);
      uniqueRows.push(row);
    }
    if (uniqueRows.length === 0) return;
    const tabName = title.slice(0, 31);
    const totalThp = uniqueRows.reduce((sum, row) => sum + row.thp, 0);
    tabSummaries.push({
      tabName,
      employeeCount: uniqueRows.length,
      totalThp,
    });
    const worksheet = XLSX.utils.aoa_to_sheet(createSheetRows(uniqueRows));
    XLSX.utils.book_append_sheet(workbook, worksheet, tabName);
  }

  const workbook = XLSX.utils.book_new();

  // Tab langsung per kategori:
  // - KABAG/SPV/MANAGERIAL berdasar jabatan
  // - selain itu berdasar divisi
  const rowsByCategory = new Map<string, typeof normalizedRows>();
  for (const row of normalizedRows) {
    let category = row.divisionName || "-";
    if (row.positionName.includes("KABAG")) category = "KABAG";
    else if (row.positionName.includes("SPV")) category = "SPV";
    else if (row.positionName.includes("MANAGERIAL")) category = "MANAGERIAL";

    const current = rowsByCategory.get(category) ?? [];
    current.push(row);
    rowsByCategory.set(category, current);
  }

  const orderedCategories = [
    "KABAG",
    "SPV",
    "MANAGERIAL",
    ...[...rowsByCategory.keys()]
      .filter((key) => key !== "KABAG" && key !== "SPV" && key !== "MANAGERIAL")
      .sort((a, b) => a.localeCompare(b)),
  ];

  for (const category of orderedCategories) {
    appendSheet(workbook, category, rowsByCategory.get(category) ?? []);
  }

  // Safety net: jika ada data yang belum masuk tab manapun, masukkan ke tab fallback.
  const unassigned = normalizedRows.filter((row) => !assignedEmployeeIds.has(row.id));
  appendSheet(workbook, "Unassigned", unassigned);

  const grandTotalThp = tabSummaries.reduce((sum, row) => sum + row.totalThp, 0);
  const grandTotalEmployees = tabSummaries.reduce((sum, row) => sum + row.employeeCount, 0);
  const summaryRows: Array<Array<string | number>> = [
    ["periode", periodCode],
    [],
    ["tab", "jumlah_karyawan", "total_thp"],
    ...tabSummaries.map((row) => [row.tabName, row.employeeCount, row.totalThp]),
    [],
    ["GRAND TOTAL", grandTotalEmployees, grandTotalThp],
  ];
  const summaryWorksheet = XLSX.utils.aoa_to_sheet(summaryRows);
  XLSX.utils.book_append_sheet(workbook, summaryWorksheet, "Summary");
  // Ensure Summary appears as the first sheet in the workbook.
  workbook.SheetNames = ["Summary", ...workbook.SheetNames.filter((name) => name !== "Summary")];

  const buffer = XLSX.write(workbook, { bookType: "xlsx", type: "buffer" });

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename=\"payroll-${periodCode}.xlsx\"`,
    },
  });
}
