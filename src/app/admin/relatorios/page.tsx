import {
  filtersFromParams,
  getAllDepartments,
  getAllExpenseTypes,
  listReimbursements,
} from "@/db/queries";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/field";
import { StatusBadge } from "@/components/status-badge";
import {
  STATUS_LABELS,
  STATUS_ORDER,
  type Status,
} from "@/lib/status";
import { formatBRL, formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

type SP = Record<string, string | undefined>;

export default async function RelatoriosPage({
  searchParams,
}: {
  searchParams: Promise<SP>;
}) {
  const sp = await searchParams;
  const filters = filtersFromParams(sp);

  const [rows, departments, expenseTypes] = await Promise.all([
    listReimbursements(filters),
    getAllDepartments(),
    getAllExpenseTypes(),
  ]);

  const total = rows.reduce((acc, r) => acc + Number(r.amount), 0);

  // Totais por status (no conjunto filtrado)
  const byStatus = new Map<Status, { count: number; total: number }>();
  for (const r of rows) {
    const s = r.status as Status;
    const cur = byStatus.get(s) ?? { count: 0, total: 0 };
    cur.count += 1;
    cur.total += Number(r.amount);
    byStatus.set(s, cur);
  }

  const exportQs = new URLSearchParams(
    Object.entries(sp).filter(([, v]) => v) as [string, string][],
  ).toString();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold text-slate-900">Relatórios</h1>
        <a href={`/api/relatorios/export?${exportQs}`}>
          <Button size="sm">Exportar CSV</Button>
        </a>
      </div>

      <form
        method="get"
        className="grid grid-cols-1 gap-3 rounded-lg border border-slate-200 bg-white p-4 sm:grid-cols-2 lg:grid-cols-5"
      >
        <Select name="status" defaultValue={sp.status ?? ""}>
          <option value="">Todos os status</option>
          {STATUS_ORDER.map((s) => (
            <option key={s} value={s}>
              {STATUS_LABELS[s]}
            </option>
          ))}
        </Select>
        <Select name="departmentId" defaultValue={sp.departmentId ?? ""}>
          <option value="">Todos os departamentos</option>
          {departments.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </Select>
        <Select name="expenseTypeId" defaultValue={sp.expenseTypeId ?? ""}>
          <option value="">Todos os tipos</option>
          {expenseTypes.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </Select>
        <Input
          name="from"
          type="date"
          defaultValue={sp.from ?? ""}
          aria-label="Data inicial"
        />
        <Input
          name="to"
          type="date"
          defaultValue={sp.to ?? ""}
          aria-label="Data final"
        />
        <div className="lg:col-span-5">
          <Button type="submit" size="sm">
            Gerar relatório
          </Button>
        </div>
      </form>

      {/* Resumo por status */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {STATUS_ORDER.map((s) => {
          const d = byStatus.get(s);
          return (
            <div
              key={s}
              className="rounded-lg border border-slate-200 bg-white p-3"
            >
              <StatusBadge status={s} />
              <p className="mt-2 text-lg font-bold text-slate-800">
                {d?.count ?? 0}
              </p>
              <p className="text-xs text-slate-500">
                {formatBRL(d?.total ?? 0)}
              </p>
            </div>
          );
        })}
      </div>

      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-3 py-2">#</th>
              <th className="px-3 py-2">Solicitante</th>
              <th className="px-3 py-2">Departamento</th>
              <th className="px-3 py-2">Tipo</th>
              <th className="px-3 py-2">Data</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2 text-right">Valor</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((r) => (
              <tr key={r.id}>
                <td className="px-3 py-2 text-slate-400">#{r.id}</td>
                <td className="px-3 py-2 text-slate-800">{r.requesterName}</td>
                <td className="px-3 py-2 text-slate-600">{r.departmentName}</td>
                <td className="px-3 py-2 text-slate-600">{r.expenseTypeName}</td>
                <td className="px-3 py-2 text-slate-600">
                  {formatDate(r.expenseDate)}
                </td>
                <td className="px-3 py-2">
                  <StatusBadge status={r.status as Status} />
                </td>
                <td className="px-3 py-2 text-right font-medium text-slate-800">
                  {formatBRL(r.amount)}
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={7} className="px-3 py-8 text-center text-slate-400">
                  Nenhum registro no período/filtro.
                </td>
              </tr>
            )}
          </tbody>
          {rows.length > 0 && (
            <tfoot>
              <tr className="border-t border-slate-200 bg-slate-50 font-semibold">
                <td className="px-3 py-2" colSpan={6}>
                  Total ({rows.length})
                </td>
                <td className="px-3 py-2 text-right">{formatBRL(total)}</td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}
