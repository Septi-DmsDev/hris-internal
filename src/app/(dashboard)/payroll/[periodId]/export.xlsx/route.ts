import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { getPayrollWorkspace } from "@/server/actions/payroll";
import { normalizeEmployeeGroup } from "@/lib/employee-groups";

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
    const worksheet = XLSX.utils.aoa_to_sheet(createSheetRows(uniqueRows));
    XLSX.utils.book_append_sheet(workbook, worksheet, title.slice(0, 31));
  }

  const workbook = XLSX.utils.book_new();

  // 1) KARTAP: dikelompokkan jabatan (KABAG, SPV, MANAGERIAL)
  const kartapRows = normalizedRows.filter((row) => row.normalizedGroup === "KARYAWAN_TETAP");
  const kartapByRole: Record<string, typeof normalizedRows> = {
    KABAG: [],
    SPV: [],
    MANAGERIAL: [],
    LAINNYA: [],
  };
  for (const row of kartapRows) {
    if (row.positionName.includes("KABAG")) kartapByRole.KABAG.push(row);
    else if (row.positionName.includes("SPV")) kartapByRole.SPV.push(row);
    else if (row.positionName.includes("MANAGERIAL")) kartapByRole.MANAGERIAL.push(row);
    else kartapByRole.LAINNYA.push(row);
  }

  appendSheet(workbook, "Kartap - KABAG", kartapByRole.KABAG);
  appendSheet(workbook, "Kartap - SPV", kartapByRole.SPV);
  appendSheet(workbook, "Kartap - MANAGERIAL", kartapByRole.MANAGERIAL);
  appendSheet(workbook, "Kartap - Lainnya", kartapByRole.LAINNYA);

  // 2) MITRA KERJA: dikelompokkan berdasarkan divisi.
  // Semua non-KARTAP diarahkan ke kelompok ini agar tidak ada karyawan yang hilang.
  const mitraRows = normalizedRows.filter((row) => row.normalizedGroup !== "KARYAWAN_TETAP");
  const mitraByDivision = new Map<string, typeof normalizedRows>();
  for (const row of mitraRows) {
    const key = row.divisionName || "-";
    const current = mitraByDivision.get(key) ?? [];
    current.push(row);
    mitraByDivision.set(key, current);
  }
  for (const [divisionName, rows] of [...mitraByDivision.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
    appendSheet(workbook, `Mitra - ${divisionName}`, rows);
  }

  // Safety net: jika ada data yang belum masuk tab manapun, masukkan ke tab fallback.
  const unassigned = normalizedRows.filter((row) => !assignedEmployeeIds.has(row.id));
  appendSheet(workbook, "Unassigned", unassigned);

  const buffer = XLSX.write(workbook, { bookType: "xlsx", type: "buffer" });

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename=\"payroll-${periodCode}.xlsx\"`,
    },
  });
}
