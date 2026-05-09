import { format } from "date-fns";
import { redirect } from "next/navigation";
import { getTickets } from "@/server/actions/tickets";
import { getMyAttendanceFallbackRequests } from "@/server/actions/attendance";
import TicketingClient from "./TicketingClient";
import { getCurrentUserRoleRow } from "@/lib/auth/session";
import type { UserRole } from "@/types";

export default async function TicketingPage() {
  const roleRow = await getCurrentUserRoleRow();
  const role = roleRow.role as UserRole;

  if (role === "HRD") {
    redirect("/ticketingapproval");
  }
  if (role === "FINANCE") {
    redirect("/finance");
  }

  const [ticketResult, fallbackRequests] = await Promise.all([
    getTickets(),
    getMyAttendanceFallbackRequests(),
  ]);
  const { tickets } = ticketResult;

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
    attachmentUrl: t.attachmentUrl ?? null,
  }));

  return (
    <div className="space-y-4">
      <TicketingClient
        role={role}
        hasEmployeeLink={Boolean(roleRow.employeeId)}
        tickets={ticketRows}
        fallbackRequests={fallbackRequests.map((r) => ({
          id: r.id,
          attendanceDate: r.attendanceDate instanceof Date ? format(r.attendanceDate, "yyyy-MM-dd") : String(r.attendanceDate),
          photoUrl: r.photoUrl,
          distanceMeters: r.distanceMeters,
          radiusMetersSnapshot: r.radiusMetersSnapshot,
          geofenceMatched: r.geofenceMatched,
          fingerprintFailureReason: r.fingerprintFailureReason,
          status: r.status,
          reviewNotes: r.reviewNotes ?? "",
          createdAt: r.createdAt instanceof Date ? format(r.createdAt, "yyyy-MM-dd HH:mm") : String(r.createdAt),
        }))}
      />
    </div>
  );
}
