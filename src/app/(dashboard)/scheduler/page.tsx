import { redirect } from "next/navigation";
import { getCurrentUserRoleRow } from "@/lib/auth/session";
import { getTeamSchedules, getScheduleOptions } from "@/server/actions/schedule";
import SchedulerClient from "./SchedulerClient";
import type { UserRole } from "@/types";

const ALLOWED_ROLES: UserRole[] = ["SUPER_ADMIN", "HRD", "KABAG", "SPV"];

export default async function SchedulerPage() {
  const roleRow = await getCurrentUserRoleRow();
  const role = roleRow.role as UserRole;

  if (!ALLOWED_ROLES.includes(role)) {
    redirect("/schedule");
  }

  const [teamMembers, scheduleOptions] = await Promise.all([
    getTeamSchedules(),
    getScheduleOptions(),
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
      />
    </div>
  );
}
