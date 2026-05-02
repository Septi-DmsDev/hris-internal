import { format } from "date-fns";
import { getReviews } from "@/server/actions/reviews";
import ReviewsClient from "./ReviewsClient";
import { db } from "@/lib/db";
import { employees } from "@/lib/db/schema/employee";
import { divisions } from "@/lib/db/schema/master";
import { getCurrentUserRoleRow } from "@/lib/auth/session";
import { and, asc, eq, inArray } from "drizzle-orm";
import type { UserRole } from "@/types";

export default async function ReviewsPage() {
  const { role, reviews, incidents } = await getReviews();
  const roleRow = await getCurrentUserRoleRow();
  const canManageEmployeeOptions = ["SUPER_ADMIN", "HRD", "KABAG", "SPV"].includes(role);
  const isDivScoped = ["SPV", "KABAG"].includes(role) && roleRow.divisionIds.length > 0;

  const employeeRows = canManageEmployeeOptions
    ? await db
        .select({
          id: employees.id,
          employeeCode: employees.employeeCode,
          fullName: employees.fullName,
          divisionName: divisions.name,
        })
        .from(employees)
        .leftJoin(divisions, eq(employees.divisionId, divisions.id))
        .where(
          and(
            eq(employees.isActive, true),
            isDivScoped ? inArray(employees.divisionId, roleRow.divisionIds) : undefined,
          )
        )
        .orderBy(asc(employees.fullName))
    : [];

  const fmt = (d: Date | string | null) =>
    d ? format(new Date(d as string), "yyyy-MM-dd") : "-";
  const fmtDt = (d: Date | string | null) =>
    d ? format(new Date(d as string), "yyyy-MM-dd HH:mm") : "-";

  const reviewRows = reviews.map((r) => ({
    ...r,
    periodStartDate: fmt(r.periodStartDate),
    periodEndDate: fmt(r.periodEndDate),
    totalScore: r.totalScore ? Number(r.totalScore) : null,
    createdAt: fmtDt(r.createdAt),
    employeeName: r.employeeName ?? "-",
    employeeCode: r.employeeCode ?? "-",
    divisionName: r.divisionName ?? "-",
    reviewNotes: r.reviewNotes ?? "",
    category: r.category ?? "-",
  }));

  const incidentRows = incidents.map((i) => ({
    ...i,
    incidentDate: fmt(i.incidentDate),
    createdAt: fmtDt(i.createdAt),
    employeeName: i.employeeName ?? "-",
    employeeCode: i.employeeCode ?? "-",
    divisionName: i.divisionName ?? "-",
    payrollDeduction: i.payrollDeduction ? Number(i.payrollDeduction) : null,
    notes: i.notes ?? "",
  }));

  const employeeOptions = employeeRows.map((e) => ({
    id: e.id,
    employeeCode: e.employeeCode,
    fullName: e.fullName,
    divisionName: e.divisionName ?? "-",
  }));

  return (
    <div className="space-y-4">
      <ReviewsClient
        role={role as UserRole}
        reviews={reviewRows}
        incidents={incidentRows}
        employeeOptions={employeeOptions}
      />
    </div>
  );
}
