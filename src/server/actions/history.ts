"use server";

import { checkRole, requireAuth } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { sql } from "drizzle-orm";

export type SystemHistoryRow = {
  id: string;
  module: string;
  eventType: string;
  entityType: string;
  entityId: string | null;
  actorRole: string | null;
  actorUserId: string | null;
  summary: string;
  payload: Record<string, unknown>;
  occurredAt: Date;
};

export async function getSystemHistory(limit = 1000): Promise<SystemHistoryRow[]> {
  await requireAuth();
  const authError = await checkRole(["SUPER_ADMIN", "HRD"]);
  if (authError) return [];

  const normalizedLimit = Number.isFinite(limit) ? Math.min(Math.max(Math.trunc(limit), 1), 5000) : 1000;
  const segmentQueries: Array<{ label: string; query: ReturnType<typeof sql> }> = [
    {
      label: "attendance_ticket_audit_logs",
      query: sql`select
        atl.id::text as id,
        'TICKETING'::text as module,
        atl.action::text as "eventType",
        'attendance_ticket'::text as "entityType",
        atl.ticket_id::text as "entityId",
        atl.actor_role::text as "actorRole",
        atl.actor_user_id::text as "actorUserId",
        coalesce(atl.notes, 'Audit approval ticket')::text as summary,
        atl.payload as payload,
        atl.created_at as "occurredAt"
      from attendance_ticket_audit_logs atl
      order by atl.created_at desc
      limit ${normalizedLimit}`,
    },
    {
      label: "daily_activity_approval_logs",
      query: sql`select
        dal.id::text as id,
        'PERFORMANCE'::text as module,
        dal.action::text as "eventType",
        'daily_activity'::text as "entityType",
        dal.activity_entry_id::text as "entityId",
        dal.actor_role::text as "actorRole",
        dal.actor_user_id::text as "actorUserId",
        coalesce(dal.notes, 'Approval activity')::text as summary,
        '{}'::jsonb as payload,
        dal.created_at as "occurredAt"
      from daily_activity_approval_logs dal
      order by dal.created_at desc
      limit ${normalizedLimit}`,
    },
    {
      label: "payroll_audit_logs",
      query: sql`select
        pal.id::text as id,
        'PAYROLL'::text as module,
        pal.action::text as "eventType",
        'payroll_period'::text as "entityType",
        pal.period_id::text as "entityId",
        pal.actor_role::text as "actorRole",
        pal.actor_user_id::text as "actorUserId",
        coalesce(pal.notes, 'Payroll audit')::text as summary,
        pal.payload as payload,
        pal.created_at as "occurredAt"
      from payroll_audit_logs pal
      order by pal.created_at desc
      limit ${normalizedLimit}`,
    },
    {
      label: "employee_status_histories",
      query: sql`select
        esh.id::text as id,
        'EMPLOYEE'::text as module,
        'STATUS_CHANGE'::text as "eventType",
        'employee'::text as "entityType",
        esh.employee_id::text as "entityId",
        null::text as "actorRole",
        null::text as "actorUserId",
        coalesce(esh.notes, 'Perubahan status karyawan')::text as summary,
        jsonb_build_object(
          'previousEmploymentStatus', esh.previous_employment_status,
          'newEmploymentStatus', esh.new_employment_status,
          'previousPayrollStatus', esh.previous_payroll_status,
          'newPayrollStatus', esh.new_payroll_status
        ) as payload,
        esh.created_at as "occurredAt"
      from employee_status_histories esh
      order by esh.created_at desc
      limit ${normalizedLimit}`,
    },
    {
      label: "employee_division_histories",
      query: sql`select
        edh.id::text as id,
        'EMPLOYEE'::text as module,
        'DIVISION_CHANGE'::text as "eventType",
        'employee'::text as "entityType",
        edh.employee_id::text as "entityId",
        null::text as "actorRole",
        null::text as "actorUserId",
        coalesce(edh.notes, 'Perubahan divisi karyawan')::text as summary,
        jsonb_build_object(
          'previousDivisionId', edh.previous_division_id,
          'newDivisionId', edh.new_division_id,
          'effectiveDate', edh.effective_date
        ) as payload,
        edh.created_at as "occurredAt"
      from employee_division_histories edh
      order by edh.created_at desc
      limit ${normalizedLimit}`,
    },
    {
      label: "payroll_adjustments",
      query: sql`select
        pa.id::text as id,
        'FINANCE'::text as module,
        pa.adjustment_type::text as "eventType",
        'payroll_adjustment'::text as "entityType",
        pa.period_id::text as "entityId",
        pa.applied_by_role::text as "actorRole",
        pa.applied_by_user_id::text as "actorUserId",
        pa.reason::text as summary,
        jsonb_build_object(
          'employeeId', pa.employee_id,
          'amount', pa.amount,
          'adjustmentType', pa.adjustment_type
        ) as payload,
        pa.created_at as "occurredAt"
      from payroll_adjustments pa
      order by pa.created_at desc
      limit ${normalizedLimit}`,
    },
    {
      label: "incident_logs",
      query: sql`select
        il.id::text as id,
        'REVIEW'::text as module,
        il.incident_type::text as "eventType",
        'incident'::text as "entityType",
        il.employee_id::text as "entityId",
        il.recorded_by_role::text as "actorRole",
        il.recorded_by_user_id::text as "actorUserId",
        il.description::text as summary,
        jsonb_build_object(
          'impact', il.impact,
          'payrollDeduction', il.payroll_deduction,
          'isActive', il.is_active
        ) as payload,
        il.created_at as "occurredAt"
      from incident_logs il
      order by il.created_at desc
      limit ${normalizedLimit}`,
    },
  ];

  const allRows: SystemHistoryRow[] = [];
  for (const segment of segmentQueries) {
    try {
      const rows = await db.execute<SystemHistoryRow>(segment.query);
      allRows.push(...rows);
    } catch (error) {
      console.error(`[history] skip segment ${segment.label}:`, error);
    }
  }

  return allRows
    .sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime())
    .slice(0, normalizedLimit);
}
