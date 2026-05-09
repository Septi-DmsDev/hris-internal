import { format } from "date-fns";
import { getTicketsForApproval, getTicketsForApprovalHistory } from "@/server/actions/tickets";
import { getAlphaMonitoringWorkspace } from "@/server/actions/alpha";
import { getCurrentUserRoleRow } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import TicketApprovalClient from "./TicketApprovalClient";
import type { UserRole } from "@/types";

export default async function TicketApprovalPage() {
  const roleRow = await getCurrentUserRoleRow();
  const role = roleRow.role as UserRole;

  if (!["SUPER_ADMIN", "HRD", "SPV", "KABAG"].includes(role)) {
    redirect("/dashboard");
  }

  const [queue, history, alphaWorkspace] = await Promise.all([
    getTicketsForApproval(),
    getTicketsForApprovalHistory(),
    getAlphaMonitoringWorkspace(),
  ]);

  const rows = queue.tickets.map((t) => ({
    id: t.id,
    employeeId: t.employeeId ?? null,
    employeeName: t.employeeName ?? "-",
    employeeCode: t.employeeCode ?? "-",
    divisionName: t.divisionName ?? "-",
    ticketType: t.ticketType,
    startDate: t.startDate instanceof Date ? format(t.startDate, "yyyy-MM-dd") : String(t.startDate),
    endDate: t.endDate instanceof Date ? format(t.endDate, "yyyy-MM-dd") : String(t.endDate),
    daysCount: t.daysCount,
    reason: t.reason,
    attachmentUrl: t.attachmentUrl ?? null,
    status: t.status,
    createdAt: t.createdAt instanceof Date ? format(t.createdAt, "yyyy-MM-dd HH:mm") : String(t.createdAt),
  }));

  const historyRows = history.tickets.map((t) => ({
    id: t.id,
    employeeId: t.employeeId ?? null,
    employeeName: t.employeeName ?? "-",
    employeeCode: t.employeeCode ?? "-",
    divisionName: t.divisionName ?? "-",
    ticketType: t.ticketType,
    startDate: t.startDate instanceof Date ? format(t.startDate, "yyyy-MM-dd") : String(t.startDate),
    endDate: t.endDate instanceof Date ? format(t.endDate, "yyyy-MM-dd") : String(t.endDate),
    daysCount: t.daysCount,
    reason: t.reason,
    attachmentUrl: t.attachmentUrl ?? null,
    status: t.status,
    payrollImpact: t.payrollImpact ?? null,
    reviewNotes: t.reviewNotes ?? null,
    rejectionReason: t.rejectionReason ?? null,
    approvedAt: t.approvedAt instanceof Date ? format(t.approvedAt, "yyyy-MM-dd HH:mm") : null,
    rejectedAt: t.rejectedAt instanceof Date ? format(t.rejectedAt, "yyyy-MM-dd HH:mm") : null,
    createdAt: t.createdAt instanceof Date ? format(t.createdAt, "yyyy-MM-dd HH:mm") : String(t.createdAt),
  }));

  const alphaRows = alphaWorkspace.alphaEvents.map((row) => ({
    id: row.id,
    employeeId: row.employeeId,
    employeeName: row.employeeName ?? "-",
    employeeCode: row.employeeCode ?? "-",
    divisionName: row.divisionName ?? "-",
    alphaDate: row.alphaDate instanceof Date ? format(row.alphaDate, "yyyy-MM-dd") : String(row.alphaDate),
    alphaCount: row.alphaCount,
    status: row.status,
    callSentAt: row.callSentAt instanceof Date ? format(row.callSentAt, "yyyy-MM-dd HH:mm") : null,
    sp1IssuedAt: row.sp1IssuedAt instanceof Date ? format(row.sp1IssuedAt, "yyyy-MM-dd HH:mm") : null,
    notes: row.notes ?? null,
  }));

  return (
    <div className="space-y-4">
      <TicketApprovalClient tickets={rows} historyTickets={historyRows} alphaRows={alphaRows} role={role} />
    </div>
  );
}
