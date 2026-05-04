import { format } from "date-fns";
import { getTicketsForApproval, getTicketsForApprovalHistory } from "@/server/actions/tickets";
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

  const [queue, history] = await Promise.all([
    getTicketsForApproval(),
    getTicketsForApprovalHistory(),
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

  return (
    <div className="space-y-4">
      <TicketApprovalClient tickets={rows} historyTickets={historyRows} role={role} />
    </div>
  );
}
