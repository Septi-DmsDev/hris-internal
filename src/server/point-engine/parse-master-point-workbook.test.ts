import { describe, expect, it } from "vitest";
import * as XLSX from "xlsx";
import { parseMasterPointWorkbook } from "./parse-master-point-workbook";

function createWorkbookBuffer() {
  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.aoa_to_sheet([
    ["DIVISI", "NO", "JENIS PEKERJAAN (EYD)", "POIN (ID)", "KETERANGAN/SATUAN"],
    ["FINISHING", 1, "Potong Kertas", "1.500", "rim"],
    ["OFFSET", 2, "Cleaning Mesin", "0,25", "-"],
    ["OFFSET", 3, "Cetak Cover", "39.000", "job"],
    [null, null, null, null, null],
  ]);
  XLSX.utils.book_append_sheet(workbook, worksheet, "MASTER_BERSIH");
  return XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
}

describe("parseMasterPointWorkbook", () => {
  it("menormalisasi entry workbook menjadi katalog poin dan target rule", () => {
    const parsed = parseMasterPointWorkbook({
      buffer: createWorkbookBuffer(),
      versionCode: "2026-v1",
      effectiveStartDate: "2026-05-26",
      sourceFileName: "DATABASE POIN.xlsx",
    });

    expect(parsed.version.code).toBe("2026-v1");
    expect(parsed.entries).toHaveLength(3);
    expect(parsed.discoveredDivisions).toEqual(["FINISHING", "OFFSET"]);
    expect(parsed.entries[0]).toMatchObject({
      divisionName: "FINISHING",
      externalCode: "1",
      workName: "Potong Kertas",
      pointValue: "1500.00",
      unitDescription: "rim",
    });
    expect(parsed.entries[1]).toMatchObject({
      divisionName: "OFFSET",
      pointValue: "0.25",
    });
    expect(parsed.targetRules).toEqual([
      {
        divisionCode: "DEFAULT",
        divisionName: "DEFAULT",
        targetPoints: 13000,
        isDefault: true,
      },
      {
        divisionCode: "OFFSET",
        divisionName: "OFFSET",
        targetPoints: 39000,
        isDefault: false,
      },
    ]);
  });
});
