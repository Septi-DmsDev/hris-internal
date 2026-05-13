import { describe, expect, it } from "vitest";
import { resolveDisciplineBonus } from "./resolve-discipline-bonus";

describe("resolveDisciplineBonus", () => {
  it("tidak membayar bonus disiplin saat rule absensi belum aktif", () => {
    expect(
      resolveDisciplineBonus({
        ruleEnabled: false,
        presentDays: 26,
        scheduledWorkDays: 26,
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

  it("memberi tier 80 saat disiplin 80% sampai <90%", () => {
    expect(
      resolveDisciplineBonus({
        ruleEnabled: true,
        presentDays: 21,
        scheduledWorkDays: 26,
        bonusTier80Amount: 80_000,
        bonusTier90Amount: 90_000,
        bonusTier100Amount: 100_000,
      })
    ).toEqual({
      disciplineBonusAmount: 80_000,
      disciplineEligible: true,
      disciplinePercent: 80.76923076923077,
    });
  });

  it("memberi tier 90 saat disiplin 90% sampai <100%", () => {
    expect(
      resolveDisciplineBonus({
        ruleEnabled: true,
        presentDays: 24,
        scheduledWorkDays: 26,
        bonusTier80Amount: 80_000,
        bonusTier90Amount: 90_000,
        bonusTier100Amount: 100_000,
      })
    ).toEqual({
      disciplineBonusAmount: 90_000,
      disciplineEligible: true,
      disciplinePercent: 92.3076923076923,
    });
  });

  it("memberi tier 100 saat disiplin 100%", () => {
    expect(
      resolveDisciplineBonus({
        ruleEnabled: true,
        presentDays: 26,
        scheduledWorkDays: 26,
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

  it("tidak memberi bonus jika disiplin di bawah 80%", () => {
    expect(
      resolveDisciplineBonus({
        ruleEnabled: true,
        presentDays: 20,
        scheduledWorkDays: 26,
        bonusTier80Amount: 80_000,
        bonusTier90Amount: 90_000,
        bonusTier100Amount: 100_000,
      })
    ).toEqual({
      disciplineBonusAmount: 0,
      disciplineEligible: false,
      disciplinePercent: 76.92307692307693,
    });
  });
});
