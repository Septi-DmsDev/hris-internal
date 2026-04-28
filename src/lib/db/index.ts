import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as authSchema from "./schema/auth";
import * as employeeSchema from "./schema/employee";
import * as hrSchema from "./schema/hr";
import * as masterSchema from "./schema/master";
import * as payrollSchema from "./schema/payroll";
import * as pointSchema from "./schema/point";

const globalForDb = globalThis as unknown as {
  db: ReturnType<typeof drizzle> | undefined;
};

function createDb() {
  const client = postgres(process.env.DATABASE_URL!, { prepare: false });
  return drizzle(client, {
    schema: {
      ...authSchema,
      ...employeeSchema,
      ...hrSchema,
      ...masterSchema,
      ...payrollSchema,
      ...pointSchema,
    },
  });
}

export const db = globalForDb.db ?? createDb();

if (process.env.NODE_ENV !== "production") {
  globalForDb.db = db;
}
