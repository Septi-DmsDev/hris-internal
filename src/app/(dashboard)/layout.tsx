import { cache } from "react";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { requireAuth } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { isDatabaseConnectionError } from "@/lib/db/errors";
import { userRoles } from "@/lib/db/schema/auth";
import { employees } from "@/lib/db/schema/employee";
import { isEmployeeProfileComplete } from "@/lib/auth/profile-completion";
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
      try {
        userRoleRow = await getUserRole(user.id);
      } catch (retryErr) {
        if (isDatabaseConnectionError(retryErr)) {
          redirect("/database-unavailable");
        }
        throw retryErr;
      }
    } else {
      throw err;
    }
  }

  if (!userRoleRow) {
    redirect("/account-pending");
  }

  const role = userRoleRow.role;
  const pathname = (await headers()).get("x-pathname") ?? "";

  if ((role === "TEAMWORK" || role === "MANAGERIAL") && userRoleRow.employeeId) {
    const [employeeRow] = await db
      .select({
        nik: employees.nik,
        birthPlace: employees.birthPlace,
        birthDate: employees.birthDate,
        gender: employees.gender,
        religion: employees.religion,
        maritalStatus: employees.maritalStatus,
        phoneNumber: employees.phoneNumber,
        address: employees.address,
        photoUrl: employees.photoUrl,
      })
      .from(employees)
      .where(eq(employees.id, userRoleRow.employeeId))
      .limit(1);

    const complete = employeeRow
      ? isEmployeeProfileComplete({
          ...employeeRow,
          userEmail: user.email ?? null,
        })
      : false;

    const isProfilePath = pathname.startsWith("/me/profile");
    if (!complete && !isProfilePath) {
      redirect("/me/profile?complete_profile=1");
    }
  }

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
