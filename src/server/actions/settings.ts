"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { getCurrentUserRoleRow, getUser, requireAuth } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { employeeCompetencies, employeeEducationHistories, employeeHobbies, employees } from "@/lib/db/schema/employee";
import { createClient } from "@/lib/supabase/server";

export type AccountSettingsData = {
  userEmail: string;
  username: string;
  phoneNumber: string;
  employeeCode: string | null;
  fullName: string | null;
  canEditPersonalEnrichment: boolean;
  hobbies: Array<{ id: string; hobbyName: string; notes: string }>;
  educationHistories: Array<{
    id: string;
    institutionName: string;
    degree: string;
    major: string;
    startYear: string;
    endYear: string;
    notes: string;
  }>;
  competencies: Array<{
    id: string;
    competencyName: string;
    level: string;
    issuer: string;
    certifiedAt: string;
    attachmentUrl: string;
    notes: string;
  }>;
};

export async function getMyAccountSettings(): Promise<AccountSettingsData> {
  await requireAuth();
  const user = await getUser();
  const roleRow = await getCurrentUserRoleRow();

  let username = "";
  let phoneNumber = "";
  let employeeCode: string | null = null;
  let fullName: string | null = null;
  let hobbies: AccountSettingsData["hobbies"] = [];
  let educationHistories: AccountSettingsData["educationHistories"] = [];
  let competencies: AccountSettingsData["competencies"] = [];
  const canEditPersonalEnrichment = roleRow.role !== "SUPER_ADMIN" && roleRow.role !== "HRD";

  if (roleRow.employeeId) {
    const [employee, hobbyRows, educationRows, competencyRows] = await Promise.all([
      db
        .select({
          employeeCode: employees.employeeCode,
          fullName: employees.fullName,
          nickname: employees.nickname,
          phoneNumber: employees.phoneNumber,
        })
        .from(employees)
        .where(eq(employees.id, roleRow.employeeId))
        .limit(1)
        .then((rows) => rows[0]),
      db
        .select({
          id: employeeHobbies.id,
          hobbyName: employeeHobbies.hobbyName,
          notes: employeeHobbies.notes,
        })
        .from(employeeHobbies)
        .where(eq(employeeHobbies.employeeId, roleRow.employeeId)),
      db
        .select({
          id: employeeEducationHistories.id,
          institutionName: employeeEducationHistories.institutionName,
          degree: employeeEducationHistories.degree,
          major: employeeEducationHistories.major,
          startYear: employeeEducationHistories.startYear,
          endYear: employeeEducationHistories.endYear,
          notes: employeeEducationHistories.notes,
        })
        .from(employeeEducationHistories)
        .where(eq(employeeEducationHistories.employeeId, roleRow.employeeId)),
      db
        .select({
          id: employeeCompetencies.id,
          competencyName: employeeCompetencies.competencyName,
          level: employeeCompetencies.level,
          issuer: employeeCompetencies.issuer,
          certifiedAt: employeeCompetencies.certifiedAt,
          attachmentUrl: employeeCompetencies.attachmentUrl,
          notes: employeeCompetencies.notes,
        })
        .from(employeeCompetencies)
        .where(eq(employeeCompetencies.employeeId, roleRow.employeeId)),
    ]);

    if (employee) {
      username = employee.nickname ?? "";
      phoneNumber = employee.phoneNumber ?? "";
      employeeCode = employee.employeeCode;
      fullName = employee.fullName;
    }

    hobbies = hobbyRows.map((row) => ({
      id: row.id,
      hobbyName: row.hobbyName,
      notes: row.notes ?? "",
    }));
    educationHistories = educationRows.map((row) => ({
      id: row.id,
      institutionName: row.institutionName,
      degree: row.degree ?? "",
      major: row.major ?? "",
      startYear: row.startYear ? String(row.startYear) : "",
      endYear: row.endYear ? String(row.endYear) : "",
      notes: row.notes ?? "",
    }));
    competencies = competencyRows.map((row) => ({
      id: row.id,
      competencyName: row.competencyName,
      level: row.level ?? "",
      issuer: row.issuer ?? "",
      certifiedAt: row.certifiedAt ? row.certifiedAt.toISOString().slice(0, 10) : "",
      attachmentUrl: row.attachmentUrl ?? "",
      notes: row.notes ?? "",
    }));
  }

  if (!username) {
    username = typeof user?.user_metadata?.username === "string" ? user.user_metadata.username : "";
  }

  return {
    userEmail: user?.email ?? "",
    username,
    phoneNumber,
    employeeCode,
    fullName,
    canEditPersonalEnrichment,
    hobbies,
    educationHistories,
    competencies,
  };
}

const accountHobbySchema = z.object({
  hobbyName: z.string().trim().min(1, "Nama hobi wajib diisi.").max(150, "Nama hobi maksimal 150 karakter."),
  notes: z.string().trim().max(500, "Catatan hobi maksimal 500 karakter.").optional().or(z.literal("")),
});

const accountEducationSchema = z
  .object({
    institutionName: z.string().trim().min(1, "Nama institusi wajib diisi.").max(200, "Nama institusi maksimal 200 karakter."),
    degree: z.string().trim().max(120, "Jenjang maksimal 120 karakter.").optional().or(z.literal("")),
    major: z.string().trim().max(150, "Jurusan maksimal 150 karakter.").optional().or(z.literal("")),
    startYear: z.string().trim().optional().or(z.literal("")),
    endYear: z.string().trim().optional().or(z.literal("")),
    notes: z.string().trim().max(500, "Catatan pendidikan maksimal 500 karakter.").optional().or(z.literal("")),
  })
  .superRefine((value, ctx) => {
    const toYear = (year: string | undefined) => {
      if (!year?.trim()) return null;
      const parsed = Number.parseInt(year, 10);
      if (!Number.isInteger(parsed) || parsed < 1900 || parsed > 2100) return Number.NaN;
      return parsed;
    };

    const startYear = toYear(value.startYear);
    const endYear = toYear(value.endYear);

    if (Number.isNaN(startYear)) {
      ctx.addIssue({ code: "custom", path: ["startYear"], message: "Tahun masuk pendidikan tidak valid (1900-2100)." });
    }
    if (Number.isNaN(endYear)) {
      ctx.addIssue({ code: "custom", path: ["endYear"], message: "Tahun lulus pendidikan tidak valid (1900-2100)." });
    }
    if (startYear && endYear && startYear > endYear) {
      ctx.addIssue({ code: "custom", path: ["endYear"], message: "Tahun lulus tidak boleh lebih kecil dari tahun masuk." });
    }
  });

const accountCompetencySchema = z.object({
  competencyName: z.string().trim().min(1, "Nama kompetensi wajib diisi.").max(200, "Nama kompetensi maksimal 200 karakter."),
  level: z.string().trim().max(50, "Level kompetensi maksimal 50 karakter.").optional().or(z.literal("")),
  issuer: z.string().trim().max(150, "Penerbit sertifikat maksimal 150 karakter.").optional().or(z.literal("")),
  certifiedAt: z.string().trim().optional().or(z.literal("")),
  attachmentUrl: z.string().trim().url("Link dokumen kompetensi tidak valid.").optional().or(z.literal("")),
  notes: z.string().trim().max(500, "Catatan kompetensi maksimal 500 karakter.").optional().or(z.literal("")),
});

const updateAccountSchema = z.object({
  username: z.string().trim().min(2, "Username minimal 2 karakter").max(100, "Username maksimal 100 karakter"),
  phoneNumber: z.string().trim().max(30, "Nomor HP maksimal 30 karakter").optional(),
  email: z.string().trim().email("Email tidak valid"),
  newPassword: z.string().optional(),
  confirmPassword: z.string().optional(),
  hobbies: z.array(accountHobbySchema).default([]),
  educationHistories: z.array(accountEducationSchema).default([]),
  competencies: z.array(accountCompetencySchema).default([]),
}).superRefine((value, ctx) => {
  if (value.newPassword && value.newPassword.length < 8) {
    ctx.addIssue({
      code: "custom",
      path: ["newPassword"],
      message: "Password baru minimal 8 karakter",
    });
  }

  if ((value.newPassword ?? "") !== (value.confirmPassword ?? "")) {
    ctx.addIssue({
      code: "custom",
      path: ["confirmPassword"],
      message: "Konfirmasi password tidak sama",
    });
  }
});

export async function updateMyAccountSettings(formData: FormData) {
  await requireAuth();
  const user = await getUser();
  const roleRow = await getCurrentUserRoleRow();
  let hobbiesPayload: unknown = [];
  let educationPayload: unknown = [];
  let competenciesPayload: unknown = [];

  try {
    hobbiesPayload = JSON.parse(String(formData.get("hobbies") ?? "[]"));
    educationPayload = JSON.parse(String(formData.get("educationHistories") ?? "[]"));
    competenciesPayload = JSON.parse(String(formData.get("competencies") ?? "[]"));
  } catch {
    return { error: "Format data profil tambahan tidak valid." };
  }

  const parsed = updateAccountSchema.safeParse({
    username: formData.get("username"),
    phoneNumber: formData.get("phoneNumber") ?? "",
    email: formData.get("email"),
    newPassword: formData.get("newPassword") ?? "",
    confirmPassword: formData.get("confirmPassword") ?? "",
    hobbies: hobbiesPayload,
    educationHistories: educationPayload,
    competencies: competenciesPayload,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Data tidak valid" };
  }

  const { username, phoneNumber, email, newPassword, hobbies, educationHistories, competencies } = parsed.data;

  const employeeId = roleRow.employeeId;
  if (employeeId) {
    await db.transaction(async (tx) => {
      await tx
        .update(employees)
        .set({
          nickname: username,
          phoneNumber: phoneNumber || null,
          updatedAt: new Date(),
        })
        .where(eq(employees.id, employeeId));

      const canEditPersonalEnrichment = roleRow.role !== "SUPER_ADMIN" && roleRow.role !== "HRD";
      if (!canEditPersonalEnrichment) return;

      await tx.delete(employeeHobbies).where(eq(employeeHobbies.employeeId, employeeId));
      if (hobbies.length) {
        await tx.insert(employeeHobbies).values(
          hobbies.map((item) => ({
            employeeId,
            hobbyName: item.hobbyName,
            notes: item.notes?.trim() ? item.notes.trim() : null,
          }))
        );
      }

      await tx.delete(employeeEducationHistories).where(eq(employeeEducationHistories.employeeId, employeeId));
      if (educationHistories.length) {
        await tx.insert(employeeEducationHistories).values(
          educationHistories.map((item) => ({
            employeeId,
            institutionName: item.institutionName,
            degree: item.degree?.trim() ? item.degree.trim() : null,
            major: item.major?.trim() ? item.major.trim() : null,
            startYear: item.startYear?.trim() ? Number.parseInt(item.startYear, 10) : null,
            endYear: item.endYear?.trim() ? Number.parseInt(item.endYear, 10) : null,
            notes: item.notes?.trim() ? item.notes.trim() : null,
          }))
        );
      }

      await tx.delete(employeeCompetencies).where(eq(employeeCompetencies.employeeId, employeeId));
      if (competencies.length) {
        await tx.insert(employeeCompetencies).values(
          competencies.map((item) => ({
            employeeId,
            competencyName: item.competencyName,
            level: item.level?.trim() ? item.level.trim() : null,
            issuer: item.issuer?.trim() ? item.issuer.trim() : null,
            certifiedAt: item.certifiedAt?.trim() ? new Date(item.certifiedAt) : null,
            attachmentUrl: item.attachmentUrl?.trim() ? item.attachmentUrl.trim() : null,
            notes: item.notes?.trim() ? item.notes.trim() : null,
          }))
        );
      }
    });
  }

  const currentEmail = user?.email ?? "";
  const authPayload: {
    email?: string;
    password?: string;
    data?: Record<string, string>;
  } = {
    data: { username },
  };

  if (email !== currentEmail) {
    authPayload.email = email;
  }

  if (newPassword) {
    authPayload.password = newPassword;
  }

  const shouldUpdateAuth = Boolean(authPayload.email || authPayload.password || authPayload.data);
  if (shouldUpdateAuth) {
    const supabase = await createClient();
    const { error } = await supabase.auth.updateUser(authPayload);
    if (error) {
      return { error: error.message };
    }
  }

  revalidatePath("/settings");
  revalidatePath("/dashboard");

  if (email !== currentEmail) {
    return { success: "Profil tersimpan. Cek email untuk konfirmasi perubahan alamat email." };
  }

  return { success: "Profil akun berhasil diperbarui." };
}
