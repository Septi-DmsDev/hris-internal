import { format } from "date-fns";
import { getAttendanceWorkspace } from "@/server/actions/attendance";
import AttendanceClient from "./AttendanceClient";

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function AttendancePage({ searchParams }: PageProps) {
  const params = (await searchParams) ?? {};
  const selectedDate = typeof params.date === "string" ? params.date : undefined;
  const workspace = await getAttendanceWorkspace(selectedDate);

  if ("error" in workspace) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-slate-500">Akses absensi ditolak.</p>
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {workspace.error}
        </div>
      </div>
    );
  }

  const records = workspace.records.map((record) => {
    const raw = record.rawPayload as { breakOutTime?: string | null; breakInTime?: string | null; taps?: string[] } | null;
    return {
      id: record.id,
      employeeId: record.employeeId,
      employeeName: record.employeeName ?? "-",
      employeeCode: record.employeeCode ?? "-",
      divisionName: record.divisionName ?? "-",
      attendanceDate: format(record.attendanceDate, "yyyy-MM-dd"),
      attendanceStatus: record.attendanceStatus,
      checkInTime: record.checkInTime?.slice(0, 5) ?? "",
      checkOutTime: record.checkOutTime?.slice(0, 5) ?? "",
      breakOutTime: raw?.breakOutTime?.slice(0, 5) ?? "",
      breakInTime: raw?.breakInTime?.slice(0, 5) ?? "",
      tapsCount: raw?.taps?.length ?? 0,
      punctualityStatus: record.punctualityStatus ?? "",
      source: record.source,
      notes: record.notes ?? "",
      updatedAt: record.updatedAt ? format(record.updatedAt, "yyyy-MM-dd HH:mm") : "-",
    };
  });

  const employees = workspace.employees.map((employee) => ({
    id: employee.id,
    employeeCode: employee.employeeCode,
    fullName: employee.fullName,
    divisionName: employee.divisionName ?? "-",
  }));

  const fallbackRequests = workspace.fallbackRequests.map((req) => ({
    id: req.id,
    employeeId: req.employeeId,
    employeeName: req.employeeName ?? "-",
    employeeCode: req.employeeCode ?? "-",
    divisionName: req.divisionName ?? "-",
    attendanceDate: format(req.attendanceDate, "yyyy-MM-dd"),
    photoUrl: req.photoUrl,
    latitude: req.latitude ? String(req.latitude) : "",
    longitude: req.longitude ? String(req.longitude) : "",
    distanceMeters: req.distanceMeters ?? null,
    radiusMetersSnapshot: req.radiusMetersSnapshot ?? null,
    geofenceMatched: req.geofenceMatched,
    fingerprintFailureReason: req.fingerprintFailureReason,
    developerModeDisabledConfirmed: req.developerModeDisabledConfirmed,
    status: req.status,
    reviewNotes: req.reviewNotes ?? "",
    reviewedAt: req.reviewedAt ? format(req.reviewedAt, "yyyy-MM-dd HH:mm") : "-",
    createdAt: req.createdAt ? format(req.createdAt, "yyyy-MM-dd HH:mm") : "-",
  }));

  return (
    <AttendanceClient
      selectedDate={workspace.selectedDate}
      employees={employees}
      records={records}
      fallbackRequests={fallbackRequests}
    />
  );
}
