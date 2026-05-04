import { cache } from "react";
import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { isDatabaseConnectionError } from "@/lib/db/errors";
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
  return row ?? null;
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
    if (isDatabaseConnectionError(err)) {
      redirect("/database-unavailable");
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
