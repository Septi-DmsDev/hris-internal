import { cache } from "react";
import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { userRoles } from "@/lib/db/schema/auth";
import { eq } from "drizzle-orm";
import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";

const getUserRole = cache(async (userId: string) => {
  try {
    const [row] = await db
      .select()
      .from(userRoles)
      .where(eq(userRoles.userId, userId))
      .limit(1);
    return row ?? null;
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code;
    if (code === "ECONNREFUSED" || code === "ENOTFOUND") {
      throw new Error("DB_UNREACHABLE");
    }
    throw err;
  }
});

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireAuth();

  let userRoleRow;
  try {
    userRoleRow = await getUserRole(user.id);
  } catch (err) {
    if (err instanceof Error && err.message === "DB_UNREACHABLE") {
      return (
        <div className="flex min-h-screen items-center justify-center bg-slate-50">
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-8 py-6 text-center max-w-md">
            <p className="text-base font-semibold text-amber-800">Database tidak dapat dijangkau</p>
            <p className="mt-2 text-sm text-amber-700">
              Koneksi ke database (localhost:5433) gagal. Pastikan SSH tunnel sudah aktif lalu muat ulang halaman.
            </p>
          </div>
        </div>
      );
    }
    throw err;
  }

  if (!userRoleRow) {
    redirect("/login");
  }

  const role = userRoleRow.role;

  return (
    <div className="flex min-h-screen">
      <Sidebar userRole={role} />
      <div className="flex-1 flex flex-col ml-60">
        <Header userEmail={user.email ?? ""} userRole={role} />
        <main className="flex-1 p-6 pt-20 bg-[#f7f8f9]">{children}</main>
      </div>
    </div>
  );
}
