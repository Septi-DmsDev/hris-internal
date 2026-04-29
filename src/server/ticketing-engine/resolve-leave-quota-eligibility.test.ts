import { describe, expect, it } from "vitest";
import { resolveLeaveQuotaEligibility } from "./resolve-leave-quota-eligibility";

describe("resolveLeaveQuotaEligibility", () => {
  it("membulatkan anniversary 12 bulan ke akhir quarter terkait", () => {
    const result = resolveLeaveQuotaEligibility({
      startDate: new Date("2025-01-15T00:00:00.000Z"),
      requestedYear: 2026,
      today: new Date("2026-03-31T00:00:00.000Z"),
    });

    expect(result.effectiveDate.toISOString().slice(0, 10)).toBe("2026-03-31");
    expect(result.eligible).toBe(true);
  });

  it("menggunakan akhir quarter ketiga untuk anniversary di bulan juli", () => {
    const result = resolveLeaveQuotaEligibility({
      startDate: new Date("2025-07-10T00:00:00.000Z"),
      requestedYear: 2026,
      today: new Date("2026-09-30T00:00:00.000Z"),
    });

    expect(result.effectiveDate.toISOString().slice(0, 10)).toBe("2026-09-30");
    expect(result.eligible).toBe(true);
  });

  it("menolak jika belum mencapai effective date quarter", () => {
    const result = resolveLeaveQuotaEligibility({
      startDate: new Date("2025-02-28T00:00:00.000Z"),
      requestedYear: 2026,
      today: new Date("2026-03-30T00:00:00.000Z"),
    });

    expect(result.effectiveDate.toISOString().slice(0, 10)).toBe("2026-03-31");
    expect(result.eligible).toBe(false);
  });

  it("menolak jika tahun kuota tidak sesuai effective year", () => {
    const result = resolveLeaveQuotaEligibility({
      startDate: new Date("2025-02-28T00:00:00.000Z"),
      requestedYear: 2027,
      today: new Date("2026-04-01T00:00:00.000Z"),
    });

    expect(result.eligible).toBe(false);
  });
});
