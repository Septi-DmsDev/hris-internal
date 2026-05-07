import type { AdjustmentCategory } from "@/lib/validations/payroll";

export type AdjustmentEmployeeOption = {
  employeeId: string;
  employeeCode: string;
  employeeName: string;
  positionName: string;
  divisionName: string;
  employeeGroup: "TEAMWORK" | "MANAGERIAL";
};

function normalizeSearch(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

export function getEligibleAdjustmentEmployeeOptions<T extends AdjustmentEmployeeOption>(
  rows: T[],
  category: AdjustmentCategory
) {
  return rows.filter((row) =>
    category === "GANTI_RUGI_TEAM" ? row.employeeGroup === "MANAGERIAL" : true
  );
}

export function filterAdjustmentEmployeeOptions<T extends AdjustmentEmployeeOption>(
  rows: T[],
  category: AdjustmentCategory,
  searchTerm: string,
  limit = 30
) {
  const eligibleRows = getEligibleAdjustmentEmployeeOptions(rows, category);
  const query = normalizeSearch(searchTerm);

  if (!query) return eligibleRows.slice(0, limit);

  return eligibleRows
    .filter((row) => {
      const haystack = normalizeSearch(
        [
          row.employeeName,
          row.employeeCode,
          row.positionName,
          row.divisionName,
          row.employeeGroup,
        ].join(" ")
      );
      return haystack.includes(query);
    })
    .slice(0, limit);
}
