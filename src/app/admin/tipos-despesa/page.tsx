import { getAllExpenseTypes } from "@/db/queries";
import { CatalogManager } from "@/components/catalog-manager";

export const dynamic = "force-dynamic";

export default async function TiposDespesaPage() {
  const items = await getAllExpenseTypes();
  return (
    <CatalogManager
      kind="expenseType"
      items={items}
      title="Tipos de despesa"
      placeholder="Nome do tipo de despesa"
    />
  );
}
