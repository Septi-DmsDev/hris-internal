"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DataTable } from "@/components/tables/DataTable";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { createReview, validateReview, createIncident } from "@/server/actions/reviews";
import type { UserRole } from "@/types";

type ReviewRow = {
  id: string;
  employeeId: string | null;
  employeeName: string;
  employeeCode: string;
  divisionName: string;
  periodStartDate: string;
  periodEndDate: string;
  sopQualityScore: number | null;
  instructionScore: number | null;
  attendanceDisciplineScore: number | null;
  initiativeTeamworkScore: number | null;
  processMissScore: number | null;
  totalScore: number | null;
  category: string;
  status: string;
  reviewNotes: string;
  createdAt: string;
};

type IncidentRow = {
  id: string;
  employeeId: string | null;
  employeeName: string;
  employeeCode: string;
  divisionName: string;
  incidentType: string;
  incidentDate: string;
  description: string;
  impact: string;
  payrollDeduction: number | null;
  isActive: boolean;
  notes: string;
  createdAt: string;
};

type EmployeeOption = { id: string; employeeCode: string; fullName: string; divisionName: string };

type Props = {
  role: UserRole;
  reviews: ReviewRow[];
  incidents: IncidentRow[];
  employeeOptions: EmployeeOption[];
};

type ReviewDraft = {
  employeeId: string;
  periodStartDate: string;
  periodEndDate: string;
  sopQualityScore: string;
  instructionScore: string;
  attendanceDisciplineScore: string;
  initiativeTeamworkScore: string;
  processMissScore: string;
  reviewNotes: string;
};

type IncidentDraft = {
  employeeId: string;
  incidentType: string;
  incidentDate: string;
  description: string;
  impact: string;
  payrollDeduction: string;
  notes: string;
};

const INCIDENT_TYPE_LABEL: Record<string, string> = {
  KOMPLAIN: "Komplain", MISS_PROSES: "Miss Proses", TELAT: "Telat",
  AREA_KOTOR: "Area Kotor", PELANGGARAN: "Pelanggaran", SP1: "SP1", SP2: "SP2", PENGHARGAAN: "Penghargaan",
};

const IMPACT_LABEL: Record<string, string> = {
  REVIEW_ONLY: "Review", PAYROLL_POTENTIAL: "Payroll", NONE: "-",
};

const REVIEW_STATUS_VARIANT: Record<string, "default" | "secondary" | "outline"> = {
  DRAFT: "outline", SUBMITTED: "secondary", VALIDATED: "default", LOCKED: "default",
};

const SCORE_ASPECTS = [
  { key: "sopQualityScore", label: "SOP & Kualitas Kerja", weight: "25%" },
  { key: "instructionScore", label: "Pemahaman Instruksi", weight: "15%" },
  { key: "attendanceDisciplineScore", label: "Absensi & Disiplin", weight: "20%" },
  { key: "initiativeTeamworkScore", label: "Inisiatif, Teamwork & 5R", weight: "20%" },
  { key: "processMissScore", label: "Miss Proses & Tanggung Jawab", weight: "20%" },
] as const;

function today() { return new Date().toISOString().slice(0, 10); }
function monthStart() {
  const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}

function createReviewDraft(): ReviewDraft {
  return {
    employeeId: "", periodStartDate: monthStart(), periodEndDate: today(),
    sopQualityScore: "3", instructionScore: "3", attendanceDisciplineScore: "3",
    initiativeTeamworkScore: "3", processMissScore: "3", reviewNotes: "",
  };
}

function createIncidentDraft(): IncidentDraft {
  return {
    employeeId: "", incidentType: "KOMPLAIN", incidentDate: today(),
    description: "", impact: "REVIEW_ONLY", payrollDeduction: "", notes: "",
  };
}

function ScoreInput({ label, weight, value, onChange }: { label: string; weight: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <p className="text-sm font-medium text-slate-700">{label}</p>
        <p className="text-xs text-slate-400">Bobot {weight}</p>
      </div>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onChange(String(n))}
            className={`w-8 h-8 rounded text-sm font-medium transition-colors ${
              value === String(n)
                ? "bg-slate-900 text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            {n}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function ReviewsClient({ role, reviews, incidents, employeeOptions }: Props) {
  const router = useRouter();
  const [reviewOpen, setReviewOpen] = useState(false);
  const [incidentOpen, setIncidentOpen] = useState(false);
  const [reviewDraft, setReviewDraft] = useState<ReviewDraft>(createReviewDraft());
  const [incidentDraft, setIncidentDraft] = useState<IncidentDraft>(createIncidentDraft());
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const canManage = ["SUPER_ADMIN", "HRD", "SPV"].includes(role);
  const canValidate = ["SUPER_ADMIN", "HRD"].includes(role);

  function updateReview(field: keyof ReviewDraft, value: string) {
    setReviewDraft((d) => ({ ...d, [field]: value }));
  }
  function updateIncident(field: keyof IncidentDraft, value: string) {
    setIncidentDraft((d) => ({ ...d, [field]: value }));
  }

  async function handleCreateReview() {
    setPending(true); setError(null);
    try {
      const result = await createReview({
        ...reviewDraft,
        sopQualityScore: Number(reviewDraft.sopQualityScore),
        instructionScore: Number(reviewDraft.instructionScore),
        attendanceDisciplineScore: Number(reviewDraft.attendanceDisciplineScore),
        initiativeTeamworkScore: Number(reviewDraft.initiativeTeamworkScore),
        processMissScore: Number(reviewDraft.processMissScore),
      });
      if (result && "error" in result) { setError(result.error); return; }
      setSuccess(`Review berhasil disimpan. Skor: ${result.total} — ${result.category}`);
      setReviewOpen(false); setReviewDraft(createReviewDraft()); router.refresh();
    } finally { setPending(false); }
  }

  async function handleValidate(reviewId: string) {
    setPending(true); setError(null);
    try {
      const result = await validateReview(reviewId);
      if (result && "error" in result) { setError(result.error); return; }
      setSuccess("Review berhasil divalidasi."); router.refresh();
    } finally { setPending(false); }
  }

  async function handleCreateIncident() {
    setPending(true); setError(null);
    try {
      const result = await createIncident({
        ...incidentDraft,
        payrollDeduction: incidentDraft.payrollDeduction ? Number(incidentDraft.payrollDeduction) : undefined,
      });
      if (result && "error" in result) { setError(result.error); return; }
      setSuccess("Incident berhasil dicatat.");
      setIncidentOpen(false); setIncidentDraft(createIncidentDraft()); router.refresh();
    } finally { setPending(false); }
  }

  const reviewColumns: ColumnDef<ReviewRow>[] = useMemo(() => [
    {
      header: "Karyawan",
      accessorKey: "employeeName",
      cell: ({ row }) => (
        <div className="space-y-0.5">
          <p className="font-medium text-slate-900">{row.original.employeeName}</p>
          <p className="text-xs text-slate-500">{row.original.employeeCode} · {row.original.divisionName}</p>
        </div>
      ),
    },
    {
      header: "Periode",
      id: "period",
      cell: ({ row }) => <p className="text-sm">{row.original.periodStartDate} s/d {row.original.periodEndDate}</p>,
    },
    {
      header: "Skor",
      accessorKey: "totalScore",
      cell: ({ row }) => {
        const score = row.original.totalScore;
        if (score === null) return <span className="text-slate-400">-</span>;
        const color = score >= 80 ? "text-emerald-600" : score >= 60 ? "text-amber-600" : "text-red-500";
        return (
          <div>
            <p className={`font-semibold ${color}`}>{score.toFixed(1)}</p>
            <p className="text-xs text-slate-500">{row.original.category}</p>
          </div>
        );
      },
    },
    {
      header: "Status",
      accessorKey: "status",
      cell: ({ row }) => (
        <Badge variant={REVIEW_STATUS_VARIANT[row.original.status] ?? "outline"}>{row.original.status}</Badge>
      ),
    },
    {
      header: "Aksi",
      id: "actions",
      cell: ({ row }) => canValidate && row.original.status === "SUBMITTED" ? (
        <Button size="sm" onClick={() => void handleValidate(row.original.id)} disabled={pending}>
          Validasi
        </Button>
      ) : null,
    },
  ], [canValidate, pending]);

  const incidentColumns: ColumnDef<IncidentRow>[] = useMemo(() => [
    {
      header: "Karyawan",
      accessorKey: "employeeName",
      cell: ({ row }) => (
        <div className="space-y-0.5">
          <p className="font-medium text-slate-900">{row.original.employeeName}</p>
          <p className="text-xs text-slate-500">{row.original.employeeCode} · {row.original.divisionName}</p>
        </div>
      ),
    },
    { header: "Tanggal", accessorKey: "incidentDate" },
    {
      header: "Jenis",
      accessorKey: "incidentType",
      cell: ({ row }) => {
        const label = INCIDENT_TYPE_LABEL[row.original.incidentType] ?? row.original.incidentType;
        const isNegative = !["PENGHARGAAN"].includes(row.original.incidentType);
        return <Badge variant={isNegative ? "destructive" : "default"}>{label}</Badge>;
      },
    },
    { header: "Deskripsi", accessorKey: "description", cell: ({ row }) => <p className="text-sm max-w-[200px] truncate">{row.original.description}</p> },
    {
      header: "Dampak",
      accessorKey: "impact",
      cell: ({ row }) => (
        <div>
          <p className="text-sm">{IMPACT_LABEL[row.original.impact] ?? row.original.impact}</p>
          {row.original.payrollDeduction ? (
            <p className="text-xs text-red-500">-Rp {row.original.payrollDeduction.toLocaleString("id-ID")}</p>
          ) : null}
        </div>
      ),
    },
  ], []);

  return (
    <div className="space-y-4">
      {success && <div className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{success}</div>}
      {error && <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      <Tabs defaultValue="reviews">
        <TabsList>
          <TabsTrigger value="reviews">Review Karyawan</TabsTrigger>
          <TabsTrigger value="incidents">Incident Log</TabsTrigger>
        </TabsList>

        <TabsContent value="reviews" className="space-y-3">
          <div className="flex justify-between items-center">
            <p className="text-sm text-slate-500">Penilaian kualitas kerja 5 aspek, skor 1–5, tertimbang.</p>
            {canManage && (
              <Button onClick={() => { setError(null); setReviewDraft(createReviewDraft()); setReviewOpen(true); }}>
                Tambah Review
              </Button>
            )}
          </div>
          <DataTable data={reviews} columns={reviewColumns} searchKey="employeeName" searchPlaceholder="Cari karyawan..." />
        </TabsContent>

        <TabsContent value="incidents" className="space-y-3">
          <div className="flex justify-between items-center">
            <p className="text-sm text-slate-500">Kejadian yang memengaruhi review dan payroll potensial.</p>
            {canManage && (
              <Button onClick={() => { setError(null); setIncidentDraft(createIncidentDraft()); setIncidentOpen(true); }}>
                Catat Incident
              </Button>
            )}
          </div>
          <DataTable data={incidents} columns={incidentColumns} searchKey="employeeName" searchPlaceholder="Cari karyawan..." />
        </TabsContent>
      </Tabs>

      {/* Review Dialog */}
      <Dialog open={reviewOpen} onOpenChange={setReviewOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>Review Karyawan</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">Karyawan</label>
              <select value={reviewDraft.employeeId} onChange={(e) => updateReview("employeeId", e.target.value)}
                className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                <option value="">Pilih karyawan</option>
                {employeeOptions.map((emp) => (
                  <option key={emp.id} value={emp.id}>{emp.fullName} ({emp.employeeCode}) · {emp.divisionName}</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700">Periode Awal</label>
                <Input type="date" value={reviewDraft.periodStartDate} onChange={(e) => updateReview("periodStartDate", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700">Periode Akhir</label>
                <Input type="date" value={reviewDraft.periodEndDate} onChange={(e) => updateReview("periodEndDate", e.target.value)} />
              </div>
            </div>
            <div className="space-y-3 rounded-md border border-slate-100 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Skor Aspek (1–5)</p>
              {SCORE_ASPECTS.map((aspect) => (
                <ScoreInput
                  key={aspect.key}
                  label={aspect.label}
                  weight={aspect.weight}
                  value={reviewDraft[aspect.key]}
                  onChange={(v) => updateReview(aspect.key, v)}
                />
              ))}
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">Catatan</label>
              <textarea value={reviewDraft.reviewNotes} onChange={(e) => updateReview("reviewNotes", e.target.value)} rows={3}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReviewOpen(false)} disabled={pending}>Batal</Button>
            <Button onClick={() => void handleCreateReview()} disabled={pending}>
              {pending ? "Menyimpan..." : "Simpan Review"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Incident Dialog */}
      <Dialog open={incidentOpen} onOpenChange={setIncidentOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>Catat Incident</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">Karyawan</label>
              <select value={incidentDraft.employeeId} onChange={(e) => updateIncident("employeeId", e.target.value)}
                className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                <option value="">Pilih karyawan</option>
                {employeeOptions.map((emp) => (
                  <option key={emp.id} value={emp.id}>{emp.fullName} ({emp.employeeCode}) · {emp.divisionName}</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700">Jenis</label>
                <select value={incidentDraft.incidentType} onChange={(e) => updateIncident("incidentType", e.target.value)}
                  className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                  {Object.entries(INCIDENT_TYPE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700">Tanggal</label>
                <Input type="date" value={incidentDraft.incidentDate} onChange={(e) => updateIncident("incidentDate", e.target.value)} />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">Deskripsi</label>
              <textarea value={incidentDraft.description} onChange={(e) => updateIncident("description", e.target.value)} rows={3}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700">Dampak</label>
                <select value={incidentDraft.impact} onChange={(e) => updateIncident("impact", e.target.value)}
                  className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                  <option value="REVIEW_ONLY">Review Only</option>
                  <option value="PAYROLL_POTENTIAL">Payroll Potential</option>
                  <option value="NONE">Tidak Ada</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700">Potongan Payroll (Rp)</label>
                <Input type="number" value={incidentDraft.payrollDeduction}
                  onChange={(e) => updateIncident("payrollDeduction", e.target.value)} placeholder="0" />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">Catatan Internal</label>
              <textarea value={incidentDraft.notes} onChange={(e) => updateIncident("notes", e.target.value)} rows={2}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIncidentOpen(false)} disabled={pending}>Batal</Button>
            <Button onClick={() => void handleCreateIncident()} disabled={pending}>
              {pending ? "Menyimpan..." : "Catat"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
