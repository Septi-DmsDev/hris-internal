import { describe, expect, it } from "vitest";
import { canDeleteIncident } from "./resolve-incident-delete-access";

describe("canDeleteIncident", () => {
  it("mengizinkan SUPER_ADMIN dan HRD menghapus incident lintas divisi", () => {
    expect(canDeleteIncident({ role: "SUPER_ADMIN", divisionIds: [], incidentDivisionId: null })).toBe(true);
    expect(canDeleteIncident({ role: "HRD", divisionIds: [], incidentDivisionId: "division-a" })).toBe(true);
  });

  it("mengizinkan SPV/KABAG hanya jika incident berada dalam scope divisi", () => {
    expect(canDeleteIncident({ role: "SPV", divisionIds: ["division-a"], incidentDivisionId: "division-a" })).toBe(true);
    expect(canDeleteIncident({ role: "KABAG", divisionIds: ["division-a"], incidentDivisionId: "division-b" })).toBe(false);
  });

  it("menolak role di luar pengelola review", () => {
    expect(canDeleteIncident({ role: "TEAMWORK", divisionIds: ["division-a"], incidentDivisionId: "division-a" })).toBe(false);
  });
});
