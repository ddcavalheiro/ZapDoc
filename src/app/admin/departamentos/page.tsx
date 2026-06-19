import { getAllDepartments } from "@/db/queries";
import { CatalogManager } from "@/components/catalog-manager";

export const dynamic = "force-dynamic";

export default async function DepartamentosPage() {
  const items = await getAllDepartments();
  return (
    <CatalogManager
      kind="department"
      items={items}
      title="Departamentos"
      placeholder="Nome do departamento"
    />
  );
}
