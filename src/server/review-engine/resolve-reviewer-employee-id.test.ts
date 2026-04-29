import { describe, expect, it } from "vitest";
import { resolveReviewerEmployeeId } from "./resolve-reviewer-employee-id";

describe("resolveReviewerEmployeeId", () => {
  it("mengembalikan employee id reviewer jika akun terhubung ke data karyawan", () => {
    expect(resolveReviewerEmployeeId("123e4567-e89b-12d3-a456-426614174000")).toBe(
      "123e4567-e89b-12d3-a456-426614174000"
    );
  });

  it("mengembalikan null jika reviewer belum terhubung ke data karyawan", () => {
    expect(resolveReviewerEmployeeId(null)).toBeNull();
  });
});
