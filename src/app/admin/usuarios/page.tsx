import { getAllUsers, getAllRoles } from "@/db/queries";
import { UsersManager } from "@/components/users-manager";

export const dynamic = "force-dynamic";

export default async function UsuariosPage() {
  const [users, roles] = await Promise.all([getAllUsers(), getAllRoles()]);
  return <UsersManager users={users} roles={roles} />;
}
