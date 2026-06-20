import Link from "next/link";
import { notFound } from "next/navigation";
import { getAllDepartments, getAllExpenseTypes, getReimbursement } from "@/db/queries";
import { AdminEditForm } from "@/components/admin-edit-form";
import { NotesManager } from "@/components/notes-manager";
import { StatusForm } from "@/components/status-form";
import { StatusBadge } from "@/components/status-badge";
import { STATUS_LABELS, type Status } from "@/lib/status";
import { formatBRL, formatDate, formatDateTime } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function ReimbursementDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: idStr } = await params;
  const id = Number(idStr);
  if (!Number.isInteger(id)) notFound();

  const [r, departments, expenseTypes] = await Promise.all([
    getReimbursement(id),
    getAllDepartments(),
    getAllExpenseTypes(),
  ]);
  if (!r) notFound();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link
            href="/admin/solicitacoes"
            className="text-sm text-slate-500 hover:underline"
          >
            ← Voltar
          </Link>
          <h1 className="mt-1 text-xl font-bold text-slate-900">
            Solicitação #{r.id}
          </h1>
          <p className="text-sm text-slate-500">
            Enviada em {formatDateTime(r.createdAt)}
          </p>
        </div>
        <StatusBadge status={r.status as Status} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Coluna principal */}
        <div className="space-y-6 lg:col-span-2">
          <section className="rounded-lg border border-slate-200 bg-white p-5">
            <h2 className="mb-4 text-sm font-semibold uppercase text-slate-500">
              Dados da solicitação
            </h2>
            <AdminEditForm
              reimbursement={r}
              departments={departments}
              expenseTypes={expenseTypes}
            />
          </section>

          <section className="rounded-lg border border-slate-200 bg-white p-5">
            <h2 className="mb-4 text-sm font-semibold uppercase text-slate-500">
              Notas fiscais ({r.notes.length})
            </h2>
            <NotesManager
              reimbursementId={r.id}
              total={r.amount}
              notes={r.notes}
            />
          </section>
        </div>

        {/* Coluna lateral */}
        <div className="space-y-6">
          <section className="rounded-lg border border-slate-200 bg-white p-5">
            <h2 className="mb-3 text-sm font-semibold uppercase text-slate-500">
              Resumo
            </h2>
            <dl className="space-y-2 text-sm">
              <Row label="Valor" value={formatBRL(r.amount)} />
              <Row label="Data da despesa" value={formatDate(r.expenseDate)} />
              <Row label="Departamento" value={r.departmentName ?? "—"} />
              <Row label="Tipo" value={r.expenseTypeName ?? "—"} />
              <Row label="Recebedor" value={r.payeeName} />
              <Row label="Pagamento" value={r.paymentDetails} />
              {r.paidAt && (
                <Row label="Pago em" value={formatDateTime(r.paidAt)} />
              )}
              {r.statusReason && (
                <Row label="Motivo recusa" value={r.statusReason} />
              )}
            </dl>
          </section>

          <section className="rounded-lg border border-slate-200 bg-white p-5">
            <h2 className="mb-3 text-sm font-semibold uppercase text-slate-500">
              Mudar status
            </h2>
            <StatusForm id={r.id} current={r.status as Status} />
          </section>

          <section className="rounded-lg border border-slate-200 bg-white p-5">
            <h2 className="mb-3 text-sm font-semibold uppercase text-slate-500">
              Histórico
            </h2>
            <ol className="space-y-3">
              {r.history.map((h) => (
                <li key={h.id} className="text-sm">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-slate-700">
                      {h.fromStatus
                        ? `${STATUS_LABELS[h.fromStatus as Status]} → ${STATUS_LABELS[h.toStatus as Status]}`
                        : STATUS_LABELS[h.toStatus as Status]}
                    </span>
                    <span className="text-xs text-slate-400">
                      {formatDateTime(h.changedAt)}
                    </span>
                  </div>
                  {h.note && (
                    <p className="text-xs text-slate-500">{h.note}</p>
                  )}
                </li>
              ))}
            </ol>
          </section>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-slate-500">{label}</dt>
      <dd className="text-right font-medium text-slate-800">{value}</dd>
    </div>
  );
}
