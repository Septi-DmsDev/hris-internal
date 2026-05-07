import { describe, expect, it } from "vitest";
import { resolveDisciplineBonus } from "./resolve-discipline-bonus";

describe("resolveDisciplineBonus", () => {
  it("tidak membayar bonus disiplin saat rule absensi belum aktif meski nominal dari persentase tersedia", () => {
    expect(
      resolveDisciplineBonus({
        ruleEnabled: false,
        configuredAmount: 80_000,
        fulltimeEligible: true,
        hasLateIncident: false,
      })
    ).toEqual({
      disciplineBonusAmount: 0,
      disciplineEligible: false,
    });
  });

  it("bisa mengaktifkan bonus disiplin nanti saat rule absensi sudah tersedia", () => {
    expect(
      resolveDisciplineBonus({
        ruleEnabled: true,
        configuredAmount: 80_000,
        fulltimeEligible: true,
        hasLateIncident: false,
      })
    ).toEqual({
      disciplineBonusAmount: 80_000,
      disciplineEligible: true,
    });
  });
});
