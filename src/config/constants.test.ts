import { describe, expect, it } from "vitest";
import {
  DIVISION_POINT_TARGET_OVERRIDES,
  POINT_TARGET_HARIAN,
  resolvePointTargetForDivision,
} from "./constants";

describe("resolvePointTargetForDivision", () => {
  it("mengembalikan target default untuk divisi umum", () => {
    expect(resolvePointTargetForDivision("Finishing")).toBe(POINT_TARGET_HARIAN);
    expect(resolvePointTargetForDivision("AFT")).toBe(POINT_TARGET_HARIAN);
    expect(resolvePointTargetForDivision(undefined)).toBe(POINT_TARGET_HARIAN);
  });

  it("mengembalikan override untuk Offset tanpa peduli casing", () => {
    expect(resolvePointTargetForDivision("OFFSET")).toBe(
      DIVISION_POINT_TARGET_OVERRIDES.OFFSET
    );
    expect(resolvePointTargetForDivision("Offset")).toBe(
      DIVISION_POINT_TARGET_OVERRIDES.OFFSET
    );
    expect(resolvePointTargetForDivision(" offset ")).toBe(
      DIVISION_POINT_TARGET_OVERRIDES.OFFSET
    );
  });
});
