"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChevronDown, Trash2 } from "lucide-react";
import { batchSubmitDraft } from "@/server/actions/performance";
import { resolveActivityJobIdLabel } from "@/lib/performance/job-id";
import type { TwCatalogEntry, TwActivityItem } from "@/server/actions/performance";

type DraftItem = {
  key: string;
  catalogEntryId: string;
  jobId: string;
  workName: string;
  pointValue: number;
  qty: number;
};

type DateGroup = {
  workDate: string;
  entries: TwActivityItem[];
  totalJobs: number;
  totalPoints: number;
  statusLabel: string;
  statusType: "pending" | "approved" | "rejected" | "locked";
  canEdit: boolean;
};

const STATUS_VARIANT: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  pending: "secondary",
  approved: "default",
  rejected: "destructive",
  locked: "outline",
};

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function resolveGroupStatus(entries: TwActivityItem[]): DateGroup["statusType"] {
  const statuses = entries.map((e) => e.status);
  if (statuses.some((s) => s === "DITOLAK_SPV")) return "rejected";
  if (statuses.some((s) => ["DIAJUKAN", "DIAJUKAN_ULANG"].includes(s))) return "pending";
  if (statuses.every((s) => s === "DIKUNCI_PAYROLL")) return "locked";
  return "approved";
}

const STATUS_TEXT: Record<DateGroup["statusType"], string> = {
  pending: "Menunggu Review",
  approved: "Disetujui SPV",
  rejected: "Ditolak SPV",
  locked: "Terkunci",
};

function formatDate(d: string) {
  return new Date(d + "T00:00:00").toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

type Props = {
  catalogEntries: TwCatalogEntry[];
  activities: TwActivityItem[];
  divisionName: string | null;
};

export default function TwPerformanceClient({ catalogEntries, activities, divisionName }: Props) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"submit" | "history">("submit");

  const [selectedDate, setSelectedDate] = useState(todayStr());
  const [draftItems, setDraftItems] = useState<DraftItem[]>([]);
  const [editingDate, setEditingDate] = useState<string | null>(null);

  const [inputCatalogId, setInputCatalogId] = useState("");
  const [inputJobId, setInputJobId] = useState("");
  const [inputQty, setInputQty] = useState("1");
  const [catalogOpen, setCatalogOpen] = useState(false);
  const [catalogSearch, setCatalogSearch] = useState("");
  const comboboxRef = useRef<HTMLDivElement>(null);

  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const selectedCatalog = catalogEntries.find((c) => c.id === inputCatalogId);

  const filteredCatalog = useMemo(() => {
    const q = catalogSearch.trim().toLowerCase();
    if (!q) return catalogEntries;
    return catalogEntries.filter(
      (c) =>
        c.workName.toLowerCase().includes(q) ||
        c.externalCode?.toLowerCase().includes(q)
    );
  }, [catalogSearch, catalogEntries]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (comboboxRef.current && !comboboxRef.current.contains(e.target as Node)) {
        setCatalogOpen(false);
        setCatalogSearch("");
      }
    }
    if (catalogOpen) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [catalogOpen]);

  function addItem() {
    if (!inputCatalogId) { setError("Pilih jenis pekerjaan terlebih dahulu."); return; }
    const cat = catalogEntries.find((c) => c.id === inputCatalogId);
    if (!cat) return;
    const qty = Math.max(0.01, Number(inputQty) || 1);
    setError(null);
    setDraftItems((prev) => [
      ...prev,
      {
        key: `${inputCatalogId}-${Date.now()}`,
        catalogEntryId: cat.id,
        jobId: inputJobId.trim() || cat.externalCode || "-",
        workName: cat.workName,
        pointValue: Number(cat.pointValue),
        qty,
      },
    ]);
    setInputCatalogId("");
    setInputJobId("");
    setInputQty("1");
    setCatalogSearch("");
    setCatalogOpen(false);
  }

  function removeItem(key: string) {
    setDraftItems((prev) => prev.filter((i) => i.key !== key));
  }

  async function handleSubmit() {
    if (draftItems.length === 0) { setError("Tambahkan minimal 1 aktivitas."); return; }
    setPending(true);
    setError(null);
    try {
      const result = await batchSubmitDraft({
        workDate: selectedDate,
        items: draftItems.map((i) => ({
          pointCatalogEntryId: i.catalogEntryId,
          jobId: i.jobId === "-" ? undefined : i.jobId,
          quantity: i.qty,
        })),
      });
      if (result && "error" in result && result.error) {
        setError(result.error);
        return;
      }
      setDraftItems([]);
      setEditingDate(null);
      setSuccess("Draft berhasil dikirim ke SPV untuk review.");
      setActiveTab("history");
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  function handleEdit(group: DateGroup) {
    const items: DraftItem[] = group.entries
      .filter((e) => e.status === "DITOLAK_SPV")
      .map((e) => {
        const cat = catalogEntries.find((c) => c.id === e.pointCatalogEntryId);
        return {
        key: `${e.id}-edit`,
        catalogEntryId: e.pointCatalogEntryId,
        jobId: resolveActivityJobIdLabel(e.jobIdSnapshot, cat?.externalCode ?? null, e.notes),
        workName: e.workNameSnapshot,
        pointValue: Number(e.pointValueSnapshot),
        qty: Number(e.quantity),
        };
      });
    setSelectedDate(group.workDate);
    setDraftItems(items);
    setEditingDate(group.workDate);
    setError(null);
    setSuccess(null);
    setActiveTab("submit");
  }

  const dateGroups = useMemo((): DateGroup[] => {
    const map = new Map<string, TwActivityItem[]>();
    for (const a of activities) {
      const key = typeof a.workDate === "string"
        ? a.workDate
        : a.workDate instanceof Date
          ? a.workDate.toISOString().slice(0, 10)
          : String(a.workDate);
      const existing = map.get(key) ?? [];
      existing.push(a);
      map.set(key, existing);
    }
    return Array.from(map.entries())
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([workDate, entries]) => {
        const statusType = resolveGroupStatus(entries);
        const totalJobs = new Set(entries.map((e) => e.pointCatalogEntryId)).size;
        const isShowPoints = ["approved", "locked"].includes(statusType);
        const totalPoints = isShowPoints
          ? entries.reduce((s, e) => s + Number(e.totalPoints), 0)
          : 0;
        return {
          workDate,
          entries,
          totalJobs,
          totalPoints,
          statusLabel: STATUS_TEXT[statusType],
          statusType,
          canEdit: statusType === "rejected",
        };
      });
  }, [activities]);

  const draftTotal = draftItems.reduce((s, i) => s + i.pointValue * i.qty, 0);

  return (
    <div className="space-y-4">
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "submit" | "history")}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold text-slate-900">Performa Saya</h2>
            {divisionName && (
              <p className="text-sm text-slate-500">Divisi: {divisionName}</p>
            )}
          </div>
          <TabsList>
            <TabsTrigger value="submit">Submit Draft</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
          </TabsList>
        </div>

        {/* ── TAB SUBMIT ── */}
        <TabsContent value="submit" className="space-y-4 pt-2">
          {editingDate && (
            <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-800">
              Mengedit ulang draft yang ditolak SPV untuk tanggal{" "}
              <strong>{formatDate(editingDate)}</strong>. Ubah isian lalu kirim ulang.
            </div>
          )}

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

          {catalogEntries.length === 0 ? (
            <div className="rounded-lg border border-slate-100 bg-slate-50 px-6 py-10 text-center">
              <p className="text-sm text-slate-500">
                Belum ada katalog poin aktif untuk divisi Anda.
              </p>
            </div>
          ) : (
            <>
              {/* Input row */}
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 space-y-3">
                <div className="flex items-center justify-between gap-4">
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Tambah Aktivitas
                  </p>
                  <div className="flex items-center gap-2 shrink-0">
                    <label className="text-xs font-medium text-slate-600">Tanggal Kerja</label>
                    <Input
                      type="date"
                      value={selectedDate}
                      onChange={(e) => { setSelectedDate(e.target.value); setEditingDate(null); }}
                      className="w-40 h-8 text-sm"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-[120px_1fr_100px_auto] gap-2 items-end">
                  {/* JOB ID */}
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-600">Job ID</label>
                    <Input
                      value={inputJobId}
                      onChange={(e) => {
                        const v = e.target.value;
                        setInputJobId(v);
                        if (v.trim() === "") {
                          setInputCatalogId("");
                        } else {
                          const match = catalogEntries.find(
                            (c) => c.externalCode?.toUpperCase() === v.trim().toUpperCase()
                          );
                          if (match) setInputCatalogId(match.id);
                        }
                        setError(null);
                      }}
                      placeholder="Ketik Job ID…"
                      className="bg-white"
                    />
                  </div>

                  {/* JENIS PEKERJAAN — searchable combobox */}
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-600">Jenis Pekerjaan</label>
                    <div ref={comboboxRef} className="relative">
                      <button
                        type="button"
                        className="h-10 w-full rounded-md border border-input bg-white px-3 py-2 text-sm text-left flex items-center justify-between gap-2 hover:bg-slate-50"
                        onClick={() => { setCatalogOpen((o) => !o); setCatalogSearch(""); }}
                      >
                        <span className={inputCatalogId ? "text-slate-900 truncate" : "text-slate-400"}>
                          {selectedCatalog
                            ? `${selectedCatalog.workName}${selectedCatalog.unitDescription ? ` (${selectedCatalog.unitDescription})` : ""} — ${selectedCatalog.pointValue} poin`
                            : "Pilih pekerjaan…"}
                        </span>
                        <ChevronDown size={14} className="text-slate-400 shrink-0" />
                      </button>

                      {catalogOpen && (
                        <div className="absolute z-50 w-full mt-1 rounded-md border border-slate-200 bg-white shadow-lg">
                          <div className="p-2 border-b border-slate-100">
                            <Input
                              autoFocus
                              value={catalogSearch}
                              onChange={(e) => setCatalogSearch(e.target.value)}
                              placeholder="Cari pekerjaan atau job ID…"
                              className="h-8 text-sm"
                            />
                          </div>
                          <div className="max-h-52 overflow-y-auto">
                            {filteredCatalog.length === 0 ? (
                              <p className="px-3 py-3 text-sm text-slate-400 text-center">Tidak ditemukan</p>
                            ) : (
                              filteredCatalog.map((c) => (
                                <button
                                  key={c.id}
                                  type="button"
                                  className={`w-full text-left px-3 py-2 text-sm flex items-center justify-between gap-2 hover:bg-slate-50 ${
                                    c.id === inputCatalogId ? "bg-teal-50 text-teal-700" : "text-slate-900"
                                  }`}
                                  onClick={() => {
                                    setInputCatalogId(c.id);
                                    if (c.externalCode) setInputJobId(c.externalCode);
                                    setCatalogOpen(false);
                                    setCatalogSearch("");
                                    setError(null);
                                  }}
                                >
                                  <span className="truncate">
                                    {c.externalCode && (
                                      <span className="font-mono text-xs text-slate-400 mr-1.5">{c.externalCode}</span>
                                    )}
                                    {c.workName}
                                    {c.unitDescription && (
                                      <span className="text-slate-400"> ({c.unitDescription})</span>
                                    )}
                                  </span>
                                  <span className="shrink-0 text-xs text-slate-500 tabular-nums">{c.pointValue} poin</span>
                                </button>
                              ))
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* QTY */}
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-600">Qty</label>
                    <Input
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={inputQty}
                      onChange={(e) => setInputQty(e.target.value)}
                    />
                  </div>

                  <Button variant="outline" onClick={addItem}>
                    + Tambah
                  </Button>
                </div>
              </div>

              {/* Draft list */}
              {draftItems.length > 0 && (
                <div className="rounded-lg border border-slate-200 overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 border-b border-slate-200">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Job ID</th>
                        <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Jenis Pekerjaan</th>
                        <th className="px-4 py-2 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">Qty</th>
                        <th className="px-4 py-2 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">Poin</th>
                        <th className="px-4 py-2" />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {draftItems.map((item) => (
                        <tr key={item.key} className="bg-white hover:bg-slate-50/50">
                          <td className="px-4 py-2.5 text-slate-500 font-mono text-xs">{item.jobId}</td>
                          <td className="px-4 py-2.5 text-slate-900">{item.workName}</td>
                          <td className="px-4 py-2.5 text-right tabular-nums">{item.qty}</td>
                          <td className="px-4 py-2.5 text-right tabular-nums font-medium">
                            {(item.pointValue * item.qty).toFixed(2)}
                          </td>
                          <td className="px-4 py-2.5 text-right">
                            <button
                              onClick={() => removeItem(item.key)}
                              className="text-slate-400 hover:text-red-500 transition-colors"
                            >
                              <Trash2 size={14} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="border-t border-slate-200 bg-slate-50">
                      <tr>
                        <td colSpan={3} className="px-4 py-2 text-sm font-semibold text-slate-700 text-right">
                          Total Poin
                        </td>
                        <td className="px-4 py-2 text-right font-bold text-teal-600 tabular-nums">
                          {draftTotal.toFixed(2)}
                        </td>
                        <td />
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}

              {draftItems.length > 0 && (
                <div className="flex justify-end">
                  <Button onClick={() => void handleSubmit()} disabled={pending} size="lg">
                    {pending ? "Mengirim…" : editingDate ? "Kirim Ulang Draft" : "Kirim Draft"}
                  </Button>
                </div>
              )}
            </>
          )}
        </TabsContent>

        {/* ── TAB HISTORY ── */}
        <TabsContent value="history" className="pt-2">
          {dateGroups.length === 0 ? (
            <div className="rounded-lg border border-slate-100 bg-slate-50 px-6 py-16 text-center">
              <p className="text-sm text-slate-500">Belum ada riwayat aktivitas.</p>
            </div>
          ) : (
            <div className="rounded-lg border border-slate-200 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Tgl Draft
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Total Job
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Poin
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {dateGroups.map((group) => (
                    <tr key={group.workDate} className="bg-white hover:bg-slate-50/50">
                      <td className="px-4 py-3 font-medium text-slate-900">
                        {formatDate(group.workDate)}
                      </td>
                      <td className="px-4 py-3 text-center tabular-nums text-slate-700">
                        {group.totalJobs}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums font-medium text-slate-900">
                        {["approved", "locked"].includes(group.statusType)
                          ? group.totalPoints.toFixed(2)
                          : "—"}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Badge variant={STATUS_VARIANT[group.statusType]}>
                            {group.statusLabel}
                          </Badge>
                          {group.canEdit && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-6 px-2 text-xs"
                              onClick={() => handleEdit(group)}
                            >
                              Edit
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
