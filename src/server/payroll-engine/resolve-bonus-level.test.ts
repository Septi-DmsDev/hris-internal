import { describe, expect, it } from "vitest";
import { resolveBonusLevel } from "./resolve-bonus-level";

describe("resolveBonusLevel", () => {
  it("tidak memberi bonus di bawah 80 persen", () => {
    expect(resolveBonusLevel(79.99)).toEqual({
      bonusKinerjaPercent: 0,
      bonusPrestasiLevel: 0,
    });
  });

  it("memberi bonus kinerja 90 persen untuk performa 90 persen", () => {
    expect(resolveBonusLevel(90)).toEqual({
      bonusKinerjaPercent: 90,
      bonusPrestasiLevel: 0,
    });
  });

  it("memberi bonus prestasi 140 tanpa menumpuk level lain", () => {
    expect(resolveBonusLevel(140)).toEqual({
      bonusKinerjaPercent: 100,
      bonusPrestasiLevel: 140,
    });
  });

  it("memberi bonus prestasi 165 sebagai level tertinggi tunggal", () => {
    expect(resolveBonusLevel(165)).toEqual({
      bonusKinerjaPercent: 100,
      bonusPrestasiLevel: 165,
    });
  });
});
