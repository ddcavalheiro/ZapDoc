import Link from "next/link";
import { getActiveDepartments, getActiveExpenseTypes } from "@/db/queries";
import { PublicReimbursementForm } from "@/components/public-reimbursement-form";

export const dynamic = "force-dynamic";

export default async function Home() {
  const [departments, expenseTypes] = await Promise.all([
    getActiveDepartments(),
    getActiveExpenseTypes(),
  ]);

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-8 sm:py-12">
      <header className="mb-8">
        <h1 className="text-2xl font-bold text-ink sm:text-3xl">
          Solicitação de Reembolso
        </h1>
        <p className="mt-1 text-sm text-ink-muted">
          Preencha os dados e anexe as fotos das notas fiscais. O tesoureiro
          fará a conferência e o pagamento.
        </p>
      </header>

      <div className="rounded-2xl border border-hairline bg-surface p-5 shadow-sm sm:p-7">
        <PublicReimbursementForm
          departments={departments}
          expenseTypes={expenseTypes}
        />
      </div>

      <footer className="mt-6 text-center">
        <Link
          href="/admin"
          className="text-xs text-ink-faint hover:text-ink-muted hover:underline"
        >
          Área do tesoureiro
        </Link>
      </footer>
    </main>
  );
}
