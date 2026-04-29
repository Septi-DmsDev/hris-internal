import { cache } from "react";
import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { userRoles } from "@/lib/db/schema/auth";
import { eq } from "drizzle-orm";
import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";

const getUserRole = cache(async (userId: string) => {
  const [row] = await db
    .select()
    .from(userRoles)
    .where(eq(userRoles.userId, userId))
    .limit(1);
  return row;
});

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireAuth();
  const userRoleRow = await getUserRole(user.id);

  if (!userRoleRow) {
    redirect("/login");
  }

  const role = userRoleRow.role;

  return (
    <div className="flex min-h-screen">
      <Sidebar userRole={role} />
      <div className="flex-1 flex flex-col">
        <Header userEmail={user.email ?? ""} userRole={role} />
        <main className="flex-1 p-6 bg-[#f7f8f9]">{children}</main>
      </div>
    </div>
  );
}
