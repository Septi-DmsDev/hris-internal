import WorkSchedulesTable, {
  type WorkScheduleRow,
  type WorkShiftRow,
} from "./WorkSchedulesTable";
import { getWorkSchedules, getWorkShiftMasters } from "@/server/actions/work-schedules";

export default async function WorkSchedulesPage() {
  const [schedules, shifts] = await Promise.all([getWorkSchedules(), getWorkShiftMasters()]);

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
      breakStart: day.breakStart ?? "",
      breakEnd: day.breakEnd ?? "",
      breakToleranceMinutes: String(day.breakToleranceMinutes),
      checkInToleranceMinutes: String(day.checkInToleranceMinutes),
      targetPoints: day.targetPoints,
    })),
  }));

  const shiftRows: WorkShiftRow[] = shifts.map((shift) => ({
    id: shift.id,
    code: shift.code,
    name: shift.name,
    startTime: shift.startTime,
    endTime: shift.endTime,
    isOvernight: shift.isOvernight,
    applicableDivisionCodes: shift.applicableDivisionCodes ?? [],
    notes: shift.notes ?? "",
    sortOrder: shift.sortOrder,
    isActive: shift.isActive,
  }));

  return (
    <div className="space-y-4">
      <WorkSchedulesTable data={rows} shifts={shiftRows} />
    </div>
  );
}
