import { describe, expect, it } from "vitest";
import { resolveSpPerformancePenalty } from "./resolve-sp-performance-penalty";

describe("resolveSpPerformancePenalty", () => {
  it("mengurangi performa secara absolut 10 poin untuk SP1", () => {
    expect(resolveSpPerformancePenalty(70, ["SP1"])).toEqual({
      penaltyType: "SP1",
      penaltyPercent: 10,
      adjustedPerformancePercent: 60,
    });
  });

  it("mengurangi performa secara absolut 20 poin untuk SP2", () => {
    expect(resolveSpPerformancePenalty(70, ["SP2"])).toEqual({
      penaltyType: "SP2",
      penaltyPercent: 20,
      adjustedPerformancePercent: 50,
    });
  });

  it("memakai penalty tertinggi jika SP1 dan SP2 sama-sama aktif", () => {
    expect(resolveSpPerformancePenalty(95, ["SP1", "SP2"])).toEqual({
      penaltyType: "SP2",
      penaltyPercent: 20,
      adjustedPerformancePercent: 75,
    });
  });

  it("tidak membiarkan performa menjadi negatif", () => {
    expect(resolveSpPerformancePenalty(8, ["SP1"])).toEqual({
      penaltyType: "SP1",
      penaltyPercent: 10,
      adjustedPerformancePercent: 0,
    });
  });
});
