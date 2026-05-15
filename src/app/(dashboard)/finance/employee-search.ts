import type { AdjustmentCategory } from "@/lib/validations/payroll";
import { isKpiEmployeeGroup } from "@/lib/employee-groups";

export type AdjustmentEmployeeOption = {
  employeeId: string;
  employeeCode: string;
  employeeName: string;
  positionName: string;
  divisionName: string;
  employeeGroup: import("@/lib/employee-groups").EmployeeGroup;
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
  return rows.filter((row) => {
    if (category === "GANTI_RUGI_TEAM") return isKpiEmployeeGroup(row.employeeGroup);
    if (
      category === "BONUS_OMSET_1_CSM"
      || category === "BONUS_OMSET_2_CSM"
      || category === "BONUS_OMSET_3_CSM"
      || category === "BONUS_KINERJA_CSM_TERTINGGI"
    ) {
      return row.divisionName.trim().toUpperCase().includes("CSM");
    }
    if (category === "BONUS_COUNTER_MESIN") {
      return row.divisionName.trim().toUpperCase().includes("PRINTING");
    }
    return true;
  });
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
