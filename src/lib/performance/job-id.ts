const LEGACY_JOB_ID_PREFIX = "__JOB_ID__:";

export function encodeLegacyNotes(jobId: string | null, notes?: string | null) {
  const trimmedNotes = notes?.trim() || "";
  if (!jobId) return trimmedNotes || null;
  const marker = `${LEGACY_JOB_ID_PREFIX}${jobId}`;
  return trimmedNotes ? `${marker}\n${trimmedNotes}` : marker;
}

export function decodeLegacyJobId(notes?: string | null) {
  if (!notes?.startsWith(LEGACY_JOB_ID_PREFIX)) return null;
  const firstLine = notes.split(/\r?\n/, 1)[0];
  return firstLine.slice(LEGACY_JOB_ID_PREFIX.length).trim() || null;
}

export function resolveActivityJobIdLabel(
  jobIdSnapshot: string | null,
  externalCode: string | null,
  notes?: string | null,
) {
  return jobIdSnapshot ?? decodeLegacyJobId(notes) ?? externalCode ?? "—";
}
