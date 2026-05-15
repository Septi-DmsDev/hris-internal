import { describe, expect, it } from "vitest";
import { resolveDisciplineBonus } from "./resolve-discipline-bonus";

describe("resolveDisciplineBonus", () => {
  it("tidak membayar bonus disiplin saat rule absensi belum aktif", () => {
    expect(
      resolveDisciplineBonus({
        ruleEnabled: false,
        lateDays: 0,
        bonusTier80Amount: 80_000,
        bonusTier90Amount: 90_000,
        bonusTier100Amount: 100_000,
      })
    ).toEqual({
      disciplineBonusAmount: 0,
      disciplineEligible: false,
      disciplinePercent: 0,
    });
  });

  it("memberi tier 80 saat telat maksimal 7x", () => {
    expect(
      resolveDisciplineBonus({
        ruleEnabled: true,
        lateDays: 7,
        bonusTier80Amount: 80_000,
        bonusTier90Amount: 90_000,
        bonusTier100Amount: 100_000,
      })
    ).toEqual({
      disciplineBonusAmount: 80_000,
      disciplineEligible: true,
      disciplinePercent: 80,
    });
  });

  it("memberi tier 90 saat telat maksimal 3x", () => {
    expect(
      resolveDisciplineBonus({
        ruleEnabled: true,
        lateDays: 3,
        bonusTier80Amount: 80_000,
        bonusTier90Amount: 90_000,
        bonusTier100Amount: 100_000,
      })
    ).toEqual({
      disciplineBonusAmount: 90_000,
      disciplineEligible: true,
      disciplinePercent: 90,
    });
  });

  it("memberi tier 100 saat tidak telat sama sekali", () => {
    expect(
      resolveDisciplineBonus({
        ruleEnabled: true,
        lateDays: 0,
        bonusTier80Amount: 80_000,
        bonusTier90Amount: 90_000,
        bonusTier100Amount: 100_000,
      })
    ).toEqual({
      disciplineBonusAmount: 100_000,
      disciplineEligible: true,
      disciplinePercent: 100,
    });
  });

  it("tidak memberi bonus jika telat 8x atau lebih", () => {
    expect(
      resolveDisciplineBonus({
        ruleEnabled: true,
        lateDays: 8,
        bonusTier80Amount: 80_000,
        bonusTier90Amount: 90_000,
        bonusTier100Amount: 100_000,
      })
    ).toEqual({
      disciplineBonusAmount: 0,
      disciplineEligible: false,
      disciplinePercent: 0,
    });
  });
});
