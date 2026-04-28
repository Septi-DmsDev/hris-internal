import { format } from "date-fns";
import { getTickets } from "@/server/actions/tickets";
import TicketingClient from "./TicketingClient";
import { db } from "@/lib/db";
import { employees } from "@/lib/db/schema/employee";
import { divisions } from "@/lib/db/schema/master";
import { getCurrentUserRoleRow } from "@/lib/auth/session";
import { and, asc, eq } from "drizzle-orm";
import type { UserRole } from "@/types";

export default async function TicketingPage() {
  const { role, tickets } = await getTickets();
  const roleRow = await getCurrentUserRoleRow();
  const canManageEmployeeOptions = ["SUPER_ADMIN", "HRD", "SPV"].includes(role);

  const employeeRows = canManageEmployeeOptions
    ? await db
        .select({
          id: employees.id,
          employeeCode: employees.employeeCode,
          fullName: employees.fullName,
          divisionId: employees.divisionId,
          divisionName: divisions.name,
        })
        .from(employees)
        .leftJoin(divisions, eq(employees.divisionId, divisions.id))
        .where(
          and(
            eq(employees.isActive, true),
            role === "SPV" && roleRow.divisionId
              ? eq(employees.divisionId, roleRow.divisionId)
              : undefined,
          )
        )
        .orderBy(asc(employees.fullName))
    : [];

  const ticketRows = tickets.map((t) => ({
    ...t,
    startDate: t.startDate instanceof Date ? format(t.startDate, "yyyy-MM-dd") : String(t.startDate),
    endDate: t.endDate instanceof Date ? format(t.endDate, "yyyy-MM-dd") : String(t.endDate),
    createdAt: t.createdAt instanceof Date ? format(t.createdAt, "yyyy-MM-dd HH:mm") : String(t.createdAt),
    employeeName: t.employeeName ?? "-",
    employeeCode: t.employeeCode ?? "-",
    divisionName: t.divisionName ?? "-",
    payrollImpact: t.payrollImpact ?? null,
    reviewNotes: t.reviewNotes ?? "",
    rejectionReason: t.rejectionReason ?? "",
  }));

  const employeeOptions = employeeRows.map((e) => ({
    id: e.id,
    employeeCode: e.employeeCode,
    fullName: e.fullName,
    divisionName: e.divisionName ?? "-",
  }));

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-slate-800">Ticketing Izin / Sakit / Cuti</h1>
        <p className="text-sm text-slate-500">
          Pengajuan izin, sakit, dan cuti yang memengaruhi target poin dan payroll.
        </p>
      </div>
      <TicketingClient
        role={role as UserRole}
        tickets={ticketRows}
        employeeOptions={employeeOptions}
      />
    </div>
  );
}
