import { z } from "zod";

export const pointCatalogSyncSchema = z.object({
  workbookPath: z.string().trim().min(1, "Path workbook wajib diisi."),
  versionCode: z.string().trim().min(1, "Kode versi wajib diisi.").max(50),
  effectiveStartDate: z.coerce.date({ message: "Tanggal efektif wajib diisi." }),
  notes: z.string().trim().optional().transform((value) => value || undefined),
  activateVersion: z.boolean().default(true),
});

export type PointCatalogSyncInput = z.infer<typeof pointCatalogSyncSchema>;
