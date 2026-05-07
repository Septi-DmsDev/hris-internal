import type { UserRole } from "@/types";

type CanDeleteIncidentInput = {
  role: UserRole;
  divisionIds: string[];
  incidentDivisionId: string | null;
};

export function canDeleteIncident(input: CanDeleteIncidentInput) {
  if (input.role === "SUPER_ADMIN" || input.role === "HRD") return true;
  if (input.role !== "SPV" && input.role !== "KABAG") return false;
  if (!input.incidentDivisionId) return false;
  return input.divisionIds.includes(input.incidentDivisionId);
}
