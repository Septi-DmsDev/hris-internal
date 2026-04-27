import { requireAuth } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { userRoles } from "@/lib/db/schema/auth";
import { eq } from "drizzle-orm";
import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";
import type { UserRole } from "@/types";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireAuth();

  const [userRoleRow] = await db
    .select()
    .from(userRoles)
    .where(eq(userRoles.userId, user.id))
    .limit(1);

  const role = (userRoleRow?.role ?? "TEAMWORK") as UserRole;

  return (
    <div className="flex min-h-screen">
      <Sidebar userRole={role} />
      <div className="flex-1 flex flex-col">
        <Header userEmail={user.email ?? ""} userRole={role} />
        <main className="flex-1 p-6 bg-slate-50">{children}</main>
      </div>
    </div>
  );
}
