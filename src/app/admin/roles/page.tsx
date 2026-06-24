import { getAllRoles } from "@/db/queries";
import { RolesManager } from "@/components/roles-manager";

export const dynamic = "force-dynamic";

export default async function RolesPage() {
  const roles = await getAllRoles();
  return <RolesManager roles={roles} />;
}
