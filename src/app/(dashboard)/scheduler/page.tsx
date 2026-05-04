import { redirect } from "next/navigation";
import { getCurrentUserRoleRow } from "@/lib/auth/session";
import { getScheduleManagementWorkspace } from "@/server/actions/schedule";
import { getWorkShiftMasters } from "@/server/actions/work-schedules";
import SchedulerClient from "./SchedulerClient";
import type { UserRole } from "@/types";

const ALLOWED_ROLES: UserRole[] = ["SUPER_ADMIN", "HRD", "KABAG", "SPV"];

export default async function SchedulerPage() {
  const roleRow = await getCurrentUserRoleRow();
  const role = roleRow.role as UserRole;

  if (!ALLOWED_ROLES.includes(role)) {
    redirect("/schedule");
  }

  const [{ teamMembers, scheduleOptions }, shiftMasters] = await Promise.all([
    getScheduleManagementWorkspace(),
    getWorkShiftMasters(),
  ]);

  return (
    <div className="space-y-6 max-w-6xl">
      <div>
        <h1 className="text-lg font-bold text-slate-900">Atur Jadwal Tim</h1>
        <p className="text-sm text-slate-500 mt-1">
          Tetapkan jadwal kerja untuk anggota tim. Jadwal aktif ditampilkan per karyawan.
        </p>
      </div>

      <SchedulerClient
        teamMembers={teamMembers}
        scheduleOptions={scheduleOptions}
        shiftMasters={shiftMasters.map((row) => ({
          id: row.id,
          name: row.name,
          startTime: row.startTime,
          endTime: row.endTime,
          isActive: row.isActive,
        }))}
        canBulkAssign={role === "HRD" || role === "SUPER_ADMIN"}
      />
    </div>
  );
}
