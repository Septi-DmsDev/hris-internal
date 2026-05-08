"use client";

import { useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { resolveActivityJobIdLabel } from "@/lib/performance/job-id";

export type TeamPerformanceDivisionRow = {
  id: string;
  name: string;
};

export type TeamPerformanceEmployeeRow = {
  id: string;
  employeeCode: string;
  fullName: string;
  divisionId: string;
};

export type TeamPerformanceActivityRow = {
  id: string;
  employeeId: string;
  workDate: string;
  submittedAt: string;
  approvedAt: string;
  externalCode: string | null;
  notes: string | null;
  jobIdSnapshot: string | null;
  workNameSnapshot: string;
  quantity: string;
  pointValueSnapshot: string;
  totalPoints: string;
  status: string;
};

type EmployeeDialogState = {
  id: string;
  employeeCode: string;
  fullName: string;
} | null;

export default function TeamPerformanceClient({
  periodStartDate,
  periodEndDate,
  divisions,
  employees,
  approvedActivities,
}: {
  periodStartDate: string;
  periodEndDate: string;
  divisions: TeamPerformanceDivisionRow[];
  employees: TeamPerformanceEmployeeRow[];
  approvedActivities: TeamPerformanceActivityRow[];
}) {
  const [activeDivisionId, setActiveDivisionId] = useState(divisions[0]?.id ?? "");
  const [activeEmployee, setActiveEmployee] = useState<EmployeeDialogState>(null);
  const [selectedWorkDate, setSelectedWorkDate] = useState<string | null>(null);

  const divisionEmployees = useMemo(
    () =>
      employees
        .filter((employee) => employee.divisionId === activeDivisionId)
        .sort((a, b) => a.fullName.localeCompare(b.fullName)),
    [activeDivisionId, employees]
  );

  const employeeActivities = useMemo(() => {
    if (!activeEmployee) return [];
    return approvedActivities
      .filter((activity) => activity.employeeId === activeEmployee.id)
      .sort((a, b) => b.workDate.localeCompare(a.workDate));
  }, [activeEmployee, approvedActivities]);

  const employeeWorkDates = useMemo(
    () => [...new Set(employeeActivities.map((activity) => activity.workDate))],
    [employeeActivities]
  );

  const workDateActivities = useMemo(() => {
    if (!selectedWorkDate) return [];
    return employeeActivities.filter((activity) => activity.workDate === selectedWorkDate);
  }, [employeeActivities, selectedWorkDate]);

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
        Periode kerja: <span className="font-semibold text-slate-900">{periodStartDate}</span> s.d.{" "}
        <span className="font-semibold text-slate-900">{periodEndDate}</span>
      </div>

      {divisions.length === 0 ? (
        <div className="rounded-lg border border-slate-200 bg-white px-4 py-8 text-center text-sm text-slate-500">
          Tidak ada divisi dalam scope Anda.
        </div>
      ) : (
        <>
          <Tabs value={activeDivisionId} onValueChange={setActiveDivisionId}>
            <TabsList className="h-auto flex-wrap justify-start">
              {divisions.map((division) => (
                <TabsTrigger key={division.id} value={division.id}>
                  {division.name}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>

          <div className="rounded-lg border border-slate-200 bg-white">
            <div className="border-b border-slate-200 px-4 py-3">
              <h2 className="text-sm font-semibold text-slate-900">
                Daftar Karyawan TEAMWORK ({divisionEmployees.length})
              </h2>
            </div>
            {divisionEmployees.length === 0 ? (
              <div className="px-4 py-8 text-sm text-slate-500">
                Tidak ada karyawan TEAMWORK pada divisi ini.
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {divisionEmployees.map((employee) => (
                  <button
                    key={employee.id}
                    type="button"
                    onClick={() => {
                      setActiveEmployee({
                        id: employee.id,
                        employeeCode: employee.employeeCode,
                        fullName: employee.fullName,
                      });
                      setSelectedWorkDate(null);
                    }}
                    className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-slate-50"
                  >
                    <div>
                      <p className="text-sm font-medium text-slate-900">{employee.fullName}</p>
                      <p className="text-xs text-slate-500">UID: {employee.employeeCode}</p>
                    </div>
                    <Badge variant="secondary">Lihat Detail</Badge>
                  </button>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      <Dialog
        open={Boolean(activeEmployee)}
        onOpenChange={(open) => {
          if (!open) {
            setActiveEmployee(null);
            setSelectedWorkDate(null);
          }
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle>
              Detail Aktivitas - {activeEmployee?.fullName} ({activeEmployee?.employeeCode})
            </DialogTitle>
          </DialogHeader>

          {employeeWorkDates.length === 0 ? (
            <div className="rounded-md border border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-600">
              Tidak ada aktivitas berstatus approved pada periode ini.
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {employeeWorkDates.map((workDate) => (
                  <Button
                    key={workDate}
                    type="button"
                    size="sm"
                    variant={selectedWorkDate === workDate ? "default" : "outline"}
                    onClick={() => setSelectedWorkDate(workDate)}
                  >
                    {workDate}
                  </Button>
                ))}
              </div>

              {selectedWorkDate ? (
                <div className="rounded-lg border border-slate-200">
                  <div className="border-b border-slate-200 px-4 py-3 text-sm font-semibold text-slate-900">
                    Aktivitas Tanggal {selectedWorkDate}
                  </div>
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                      <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                        <tr>
                          <th className="px-4 py-2 text-left">Job ID</th>
                          <th className="px-4 py-2 text-left">Jenis Pekerjaan</th>
                          <th className="px-4 py-2 text-right">Qty</th>
                          <th className="px-4 py-2 text-right">Poin</th>
                          <th className="px-4 py-2 text-right">Total</th>
                          <th className="px-4 py-2 text-left">Submitted</th>
                          <th className="px-4 py-2 text-left">Approved</th>
                        </tr>
                      </thead>
                      <tbody>
                        {workDateActivities.map((activity) => (
                          <tr key={activity.id} className="border-t border-slate-100">
                            <td className="px-4 py-2 font-mono text-xs text-slate-700">
                              {resolveActivityJobIdLabel(
                                activity.jobIdSnapshot,
                                activity.externalCode,
                                activity.notes
                              )}
                            </td>
                            <td className="px-4 py-2 text-slate-900">{activity.workNameSnapshot}</td>
                            <td className="px-4 py-2 text-right tabular-nums">{activity.quantity}</td>
                            <td className="px-4 py-2 text-right tabular-nums">{activity.pointValueSnapshot}</td>
                            <td className="px-4 py-2 text-right font-semibold tabular-nums">{activity.totalPoints}</td>
                            <td className="px-4 py-2 text-xs text-slate-600">{activity.submittedAt}</td>
                            <td className="px-4 py-2 text-xs text-slate-600">{activity.approvedAt}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="rounded-md border border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-600">
                  Pilih tanggal untuk melihat detail job ID dan jenis pekerjaan.
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
