"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { graduateTrainee, failTrainee } from "@/server/actions/training";
import type { UserRole } from "@/types";

type PerformanceRecord = {
  id: string;
  periodStartDate: string;
  periodEndDate: string;
  performancePercent: number;
  totalApprovedPoints: number;
  totalTargetPoints: number;
  status: string;
};

type TraineeEvaluation = {
  id: string;
  employeeCode: string;
  fullName: string;
  startDate: Date | string | null;
  divisionName: string;
  divisionTrainingPassPercent: number;
  performances: PerformanceRecord[];
  avgPerformancePercent: number;
  latestPerformancePercent: number;
  trainingMonths: number;
  evaluationCategory: string;
};

type Props = {
  role: UserRole;
  evaluations: TraineeEvaluation[];
};

type DecisionState = {
  action: "graduate" | "fail";
  employeeId: string;
  fullName: string;
};

function CategoryBadge({ category, passPct }: { category: string; passPct: number }) {
  if (category === "LULUS") return <Badge variant="default">Siap Lulus ≥{passPct}%</Badge>;
  if (category === "MENDEKATI") return <Badge variant="secondary">Mendekati</Badge>;
  return <Badge variant="destructive">Belum Memenuhi</Badge>;
}

function PercentBar({ pct, passPct }: { pct: number; passPct: number }) {
  const capped = Math.min(pct, 165);
  const color = pct >= passPct ? "bg-emerald-500" : pct >= passPct * 0.8 ? "bg-amber-400" : "bg-red-400";
  return (
    <div className="relative w-full rounded-full bg-slate-100 h-2">
      <div className={`${color} h-2 rounded-full`} style={{ width: `${Math.min((capped / 100) * 100, 100)}%` }} />
      <div
        className="absolute top-0 h-2 w-0.5 bg-slate-400"
        style={{ left: `${Math.min(passPct, 100)}%` }}
        title={`Standar: ${passPct}%`}
      />
    </div>
  );
}

export default function TrainingEvaluationClient({ role, evaluations }: Props) {
  const router = useRouter();
  const [decision, setDecision] = useState<DecisionState | null>(null);
  const [notes, setNotes] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const canDecide = role === "HRD" || role === "SUPER_ADMIN";

  async function handleDecision() {
    if (!decision) return;
    setPending(true);
    setError(null);
    try {
      const result =
        decision.action === "graduate"
          ? await graduateTrainee(decision.employeeId, notes)
          : await failTrainee(decision.employeeId, notes);
      if (result && "error" in result) { setError(result.error); return; }
      setSuccess(
        decision.action === "graduate"
          ? `${decision.fullName} berhasil dinyatakan lulus training.`
          : `${decision.fullName} dicatat tidak lolos training.`
      );
      setDecision(null);
      setNotes("");
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  if (evaluations.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-slate-200 bg-white p-10 text-center text-slate-500">
        Tidak ada karyawan yang sedang dalam masa training.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {success && (
        <div className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {success}
        </div>
      )}
      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="grid gap-4">
        {evaluations.map((ev) => (
          <div key={ev.id} className="rounded-lg border border-slate-200 bg-white p-5">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-slate-900">{ev.fullName}</p>
                  <span className="text-xs text-slate-400">{ev.employeeCode}</span>
                  <CategoryBadge category={ev.evaluationCategory} passPct={ev.divisionTrainingPassPercent} />
                </div>
                <p className="text-sm text-slate-500">
                  Divisi: <span className="font-medium text-slate-700">{ev.divisionName}</span>
                  {" · "}Standar lulus: <span className="font-medium text-slate-700">{ev.divisionTrainingPassPercent}%</span>
                  {" · "}Training: <span className="font-medium text-slate-700">{ev.trainingMonths} bulan</span>
                </p>
              </div>
              {canDecide && (
                <div className="flex gap-2 shrink-0">
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => setDecision({ action: "graduate", employeeId: ev.id, fullName: ev.fullName })}
                  >
                    Luluskan
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="destructive"
                    onClick={() => setDecision({ action: "fail", employeeId: ev.id, fullName: ev.fullName })}
                  >
                    Tidak Lolos
                  </Button>
                </div>
              )}
            </div>

            <div className="mt-4 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500">Rata-rata performa</span>
                <span className="font-semibold text-slate-900">{ev.avgPerformancePercent.toFixed(1)}%</span>
              </div>
              <PercentBar pct={ev.avgPerformancePercent} passPct={ev.divisionTrainingPassPercent} />
            </div>

            {ev.performances.length > 0 && (
              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 text-left text-xs text-slate-400">
                      <th className="pb-2 font-medium">Periode</th>
                      <th className="pb-2 font-medium text-right">Poin Approved</th>
                      <th className="pb-2 font-medium text-right">Target</th>
                      <th className="pb-2 font-medium text-right">Performa</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ev.performances.map((p) => (
                      <tr key={p.id} className="border-b border-slate-50">
                        <td className="py-1.5 text-slate-600">
                          {p.periodStartDate} s/d {p.periodEndDate}
                        </td>
                        <td className="py-1.5 text-right text-slate-700">
                          {p.totalApprovedPoints.toLocaleString("id-ID")}
                        </td>
                        <td className="py-1.5 text-right text-slate-500">
                          {p.totalTargetPoints.toLocaleString("id-ID")}
                        </td>
                        <td className={`py-1.5 text-right font-medium ${
                          p.performancePercent >= ev.divisionTrainingPassPercent
                            ? "text-emerald-600"
                            : "text-red-500"
                        }`}>
                          {p.performancePercent.toFixed(1)}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ))}
      </div>

      <Dialog open={decision !== null} onOpenChange={(open) => !open && setDecision(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {decision?.action === "graduate" ? "Luluskan Training" : "Tidak Lolos Training"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-slate-600">
              {decision?.action === "graduate"
                ? `${decision?.fullName} akan diubah status menjadi Reguler.`
                : `${decision?.fullName} akan dicatat sebagai Tidak Lolos Training.`}
            </p>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">Catatan</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                placeholder="Alasan keputusan..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDecision(null)} disabled={pending}>
              Batal
            </Button>
            <Button
              type="button"
              variant={decision?.action === "fail" ? "destructive" : "default"}
              onClick={() => void handleDecision()}
              disabled={pending}
            >
              {pending ? "Memproses..." : "Konfirmasi"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
