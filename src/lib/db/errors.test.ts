import { describe, expect, it } from "vitest";
import {
  getDatabaseTargetLabel,
  isDatabaseConnectionError,
  isLocalDatabaseTarget,
} from "./errors";

describe("database error helpers", () => {
  it("mendeteksi error koneksi berdasarkan code", () => {
    expect(
      isDatabaseConnectionError({ code: "ECONNREFUSED", message: "failed" }),
    ).toBe(true);
  });

  it("mendeteksi error koneksi berdasarkan message", () => {
    expect(
      isDatabaseConnectionError(new Error("connect ECONNREFUSED 127.0.0.1:5432")),
    ).toBe(true);
  });

  it("mengambil host dan port yang aman dari DATABASE_URL", () => {
    expect(
      getDatabaseTargetLabel("postgresql://postgres:secret@db.internal:5432/postgres"),
    ).toBe("db.internal:5432");
  });

  it("mendeteksi target localhost", () => {
    expect(
      isLocalDatabaseTarget("postgresql://postgres:secret@localhost:5433/postgres"),
    ).toBe(true);
    expect(
      isLocalDatabaseTarget("postgresql://postgres:secret@db.internal:5432/postgres"),
    ).toBe(false);
  });
});
