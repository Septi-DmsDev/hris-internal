import { resolvePointTargetForDivision, POINT_TARGET_HARIAN } from "@/config/constants";
import * as XLSX from "xlsx";

type ParseMasterPointWorkbookInput = {
  buffer: Buffer;
  versionCode: string;
  effectiveStartDate: string;
  sourceFileName?: string;
};

type ParsedPointCatalogEntry = {
  divisionCode: string;
  divisionName: string;
  externalRowNumber: number | null;
  externalCode: string | null;
  workName: string;
  pointValue: string;
  unitDescription: string | null;
};

type ParsedPointTargetRule = {
  divisionCode: string;
  divisionName: string;
  targetPoints: number;
  isDefault: boolean;
};

function normalizeDivisionName(value: unknown) {
  return String(value ?? "")
    .trim()
    .replace(/\s+/g, " ")
    .toUpperCase();
}

function parsePointNumber(rawValue: unknown) {
  if (rawValue === null || rawValue === undefined || rawValue === "") return null;
  if (typeof rawValue === "number") return rawValue;

  const normalized = String(rawValue).trim().replace(/\./g, "").replace(",", ".");
  if (!normalized) return null;
  const parsed = Number(normalized);
  return Number.isNaN(parsed) ? null : parsed;
}

export function parseMasterPointWorkbook({
  buffer,
  versionCode,
  effectiveStartDate,
  sourceFileName,
}: ParseMasterPointWorkbookInput) {
  const workbook = XLSX.read(buffer, { type: "buffer" });
  const worksheetName =
    workbook.SheetNames.find((sheetName) => sheetName.toUpperCase() === "MASTER_BERSIH") ??
    workbook.SheetNames[0];

  if (!worksheetName) {
    throw new Error("Workbook tidak memiliki sheet yang dapat dibaca.");
  }

  const worksheet = workbook.Sheets[worksheetName];
  const rows = XLSX.utils.sheet_to_json<(string | number | null)[]>(worksheet, {
    header: 1,
    blankrows: false,
  });

  const dataRows = rows.slice(1);
  const entries: ParsedPointCatalogEntry[] = [];
  const discoveredDivisions = new Set<string>();

  for (const row of dataRows) {
    const divisionName = normalizeDivisionName(row[0]);
    const externalCode = row[1] === null || row[1] === undefined || row[1] === "" ? null : String(row[1]).trim();
    const workName = String(row[2] ?? "").trim();
    const pointValue = parsePointNumber(row[3]);
    const unitDescription =
      row[4] === null || row[4] === undefined || String(row[4]).trim() === ""
        ? null
        : String(row[4]).trim();

    if (!divisionName || !workName || pointValue === null) {
      continue;
    }

    discoveredDivisions.add(divisionName);
    entries.push({
      divisionCode: divisionName,
      divisionName,
      externalRowNumber: entries.length + 2,
      externalCode,
      workName,
      pointValue: pointValue.toFixed(2),
      unitDescription,
    });
  }

  const targetRules: ParsedPointTargetRule[] = [
    {
      divisionCode: "DEFAULT",
      divisionName: "DEFAULT",
      targetPoints: POINT_TARGET_HARIAN,
      isDefault: true,
    },
  ];

  for (const divisionName of discoveredDivisions) {
    const targetPoints = resolvePointTargetForDivision(divisionName);
    if (targetPoints !== POINT_TARGET_HARIAN) {
      targetRules.push({
        divisionCode: divisionName,
        divisionName,
        targetPoints,
        isDefault: false,
      });
    }
  }

  return {
    version: {
      code: versionCode,
      sourceFileName: sourceFileName ?? worksheetName,
      effectiveStartDate,
    },
    worksheetName,
    discoveredDivisions: [...discoveredDivisions].sort(),
    entries,
    targetRules,
  };
}
