import { checkRole, requireAuth } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import { getUsers, getUserFormOptions } from "@/server/actions/users";
import UsersClient from "./UsersClient";

export default async function UsersPage() {
  await requireAuth();
  const guard = await checkRole(["SUPER_ADMIN", "HRD"]);
  if (guard) redirect("/dashboard");

  const [users, options] = await Promise.all([getUsers(), getUserFormOptions()]);

  return (
    <div className="space-y-4">
      <UsersClient data={users} options={options} />
    </div>
  );
}
