import { format } from "date-fns";
import { redirect } from "next/navigation";
import { getCurrentUserRoleRow } from "@/lib/auth/session";
import type { UserRole } from "@/types";
import { getSystemHistory } from "@/server/actions/history";
import HistoryClient from "./HistoryClient";

export default async function HistoryPage() {
  const roleRow = await getCurrentUserRoleRow();
  const role = roleRow.role as UserRole;

  if (!["SUPER_ADMIN", "HRD"].includes(role)) {
    redirect("/dashboard");
  }

  const historyRows = await getSystemHistory(1500);
  const rows = historyRows.map((row) => ({
    id: row.id,
    module: row.module,
    eventType: row.eventType,
    entityType: row.entityType,
    entityId: row.entityId,
    actorRole: row.actorRole,
    actorUserId: row.actorUserId,
    summary: row.summary,
    payload: JSON.stringify(row.payload ?? {}),
    occurredAt: row.occurredAt instanceof Date ? format(row.occurredAt, "yyyy-MM-dd HH:mm:ss") : String(row.occurredAt),
  }));

  return (
    <div className="space-y-4">
      <HistoryClient rows={rows} />
    </div>
  );
}
