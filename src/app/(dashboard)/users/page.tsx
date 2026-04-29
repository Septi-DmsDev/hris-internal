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
      <div>
        <h1 className="text-xl font-bold text-slate-800">Manajemen Pengguna</h1>
        <p className="text-sm text-slate-500">
          Undang pengguna baru, atur role, dan kelola akses sistem.
        </p>
      </div>
      <UsersClient data={users} options={options} />
    </div>
  );
}
