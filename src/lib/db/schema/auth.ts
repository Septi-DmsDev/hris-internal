import {
  pgTable,
  pgEnum,
  uuid,
  timestamp,
  unique,
} from "drizzle-orm/pg-core";
import { divisions } from "./master";
import { employees } from "./employee";

export const userRoleEnum = pgEnum("user_role", [
  "SUPER_ADMIN",
  "HRD",
  "KABAG",
  "SPV",
  "MANAGERIAL",
  "FINANCE",
  "TEAMWORK",
  "PAYROLL_VIEWER",
]);

export const userRoles = pgTable("user_roles", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().unique(),
  role: userRoleEnum("role").notNull().default("TEAMWORK"),
  // DEPRECATED: gunakan user_role_divisions. Tetap ada untuk zero-downtime migration.
  divisionId: uuid("division_id").references(() => divisions.id, { onDelete: "set null" }),
  employeeId: uuid("employee_id").references(() => employees.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull().$onUpdateFn(() => new Date()),
});

// Junction table: SPV (1 row) dan KABAG (1–N rows)
export const userRoleDivisions = pgTable(
  "user_role_divisions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userRoleId: uuid("user_role_id")
      .notNull()
      .references(() => userRoles.id, { onDelete: "cascade" }),
    divisionId: uuid("division_id")
      .notNull()
      .references(() => divisions.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [unique().on(t.userRoleId, t.divisionId)]
);

export type UserRoleRow = typeof userRoles.$inferSelect;
export type NewUserRoleRow = typeof userRoles.$inferInsert;
export type UserRoleDivisionRow = typeof userRoleDivisions.$inferSelect;
export type NewUserRoleDivisionRow = typeof userRoleDivisions.$inferInsert;
