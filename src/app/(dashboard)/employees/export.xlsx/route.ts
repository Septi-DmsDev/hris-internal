import { NextResponse } from "next/server";
import { format } from "date-fns";
import * as XLSX from "xlsx";
import { getEmployeesForExport } from "@/server/actions/employees";

export const runtime = "nodejs";

function formatDate(value: Date | null) {
  if (!value) return "-";
  return format(value, "yyyy-MM-dd");
}

export async function GET() {
  const result = await getEmployeesForExport();

  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 403 });
  }

  const rows = result.map((row) => ({
    CABANG: row.cabang,
    NAMA: row.nama,
    "TEMPAT LAHIR": row.tempatLahir,
    "TGL LAHIR": formatDate(row.tglLahir),
    "JENIS KELAMIN": row.jenisKelamin,
    AGAMA: row.agama,
    STATUS: row.status,
    ALAMAT: row.alamat,
    "NO TELP": row.noTelp,
    EMAIL: row.email,
    "MASUK KERJA": formatDate(row.masukKerja),
    "LOLOS TRAINING": formatDate(row.lolosTraining),
  }));

  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.json_to_sheet(rows);
  XLSX.utils.book_append_sheet(workbook, worksheet, "Employees");
  const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

  const dateLabel = format(new Date(), "yyyyMMdd");
  return new NextResponse(buffer, {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="employees-${dateLabel}.xlsx"`,
    },
  });
}
