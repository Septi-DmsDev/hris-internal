import {
  pgTable,
  pgEnum,
  uuid,
  timestamp,
} from "drizzle-orm/pg-core";

export const userRoleEnum = pgEnum("user_role", [
  "SUPER_ADMIN",
  "HRD",
  "FINANCE",
  "SPV",
  "TEAMWORK",
  "MANAGERIAL",
  "PAYROLL_VIEWER",
]);

export const userRoles = pgTable("user_roles", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().unique(),
  role: userRoleEnum("role").notNull().default("TEAMWORK"),
  divisionId: uuid("division_id"), // null = akses semua, diisi = SPV hanya divisi ini
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull().$onUpdateFn(() => new Date()),
});

export type UserRoleRow = typeof userRoles.$inferSelect;
export type NewUserRoleRow = typeof userRoles.$inferInsert;
