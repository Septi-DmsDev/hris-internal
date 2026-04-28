import WorkSchedulesTable, {
  type WorkScheduleRow,
} from "./WorkSchedulesTable";
import { getWorkSchedules } from "@/server/actions/work-schedules";

export default async function WorkSchedulesPage() {
  const schedules = await getWorkSchedules();

  const rows: WorkScheduleRow[] = schedules.map((schedule) => ({
    id: schedule.id,
    code: schedule.code,
    name: schedule.name,
    description: schedule.description ?? "",
    isActive: schedule.isActive,
    days: schedule.days.map((day) => ({
      dayOfWeek: day.dayOfWeek,
      dayStatus: day.dayStatus,
      isWorkingDay: day.isWorkingDay,
      startTime: day.startTime ?? "",
      endTime: day.endTime ?? "",
      targetPoints: day.targetPoints,
    })),
  }));

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-800">
            Master Jadwal Kerja
          </h1>
          <p className="text-sm text-slate-500">
            Jadwal mingguan sebagai dasar target poin dan payroll attendance pada
            Phase 1.
          </p>
        </div>
      </div>

      <WorkSchedulesTable data={rows} />
    </div>
  );
}
