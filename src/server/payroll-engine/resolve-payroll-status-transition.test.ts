import { describe, expect, it } from "vitest";
import { resolvePayrollStatusTransition } from "./resolve-payroll-status-transition";

describe("resolvePayrollStatusTransition", () => {
  it("mengizinkan finalisasi menjadi paid", () => {
    expect(resolvePayrollStatusTransition("FINALIZED", "mark_paid")).toEqual({
      nextStatus: "PAID",
      allowed: true,
    });
  });

  it("mengizinkan paid menjadi locked", () => {
    expect(resolvePayrollStatusTransition("PAID", "lock")).toEqual({
      nextStatus: "LOCKED",
      allowed: true,
    });
  });

  it("menolak lock sebelum paid", () => {
    expect(resolvePayrollStatusTransition("FINALIZED", "lock")).toEqual({
      nextStatus: "FINALIZED",
      allowed: false,
      reason: "Periode payroll harus berstatus PAID sebelum dikunci.",
    });
  });

  it("menahan transisi jika periode sudah locked", () => {
    expect(resolvePayrollStatusTransition("LOCKED", "mark_paid")).toEqual({
      nextStatus: "LOCKED",
      allowed: false,
      reason: "Periode payroll yang sudah LOCKED tidak bisa diubah lagi.",
    });
  });
});
