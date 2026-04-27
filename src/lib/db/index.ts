import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as authSchema from "./schema/auth";
import * as masterSchema from "./schema/master";

const client = postgres(process.env.DATABASE_URL!, { prepare: false });

export const db = drizzle(client, {
  schema: { ...authSchema, ...masterSchema },
});
