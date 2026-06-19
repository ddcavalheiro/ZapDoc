import Link from "next/link";
import {
  filtersFromParams,
  getAllDepartments,
  getAllExpenseTypes,
  listReimbursements,
} from "@/db/queries";
import { StatusControl } from "@/components/status-control";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/field";
import { STATUS_LABELS, STATUS_ORDER, type Status } from "@/lib/status";
import { formatBRL, formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

type SP = Record<string, string | undefined>;

export default async function SolicitacoesPage({
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

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-900">Solicitações</h1>
        <span className="text-sm text-slate-500">
          {rows.length} resultado(s) · {formatBRL(total)}
        </span>
      </div>

      {/* Filtros (GET, URL compartilhável) */}
      <form
        method="get"
        className="mb-5 grid grid-cols-1 gap-3 rounded-lg border border-slate-200 bg-white p-4 sm:grid-cols-2 lg:grid-cols-6"
      >
        <Input
          name="search"
          defaultValue={sp.search ?? ""}
          placeholder="Buscar nome, fornecedor, nº doc…"
          className="lg:col-span-2"
        />
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
        <div className="flex items-center gap-2">
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
        </div>
        <div className="flex gap-2 sm:col-span-2 lg:col-span-6">
          <Button type="submit" size="sm">
            Filtrar
          </Button>
          <Link href="/admin/solicitacoes">
            <Button type="button" size="sm" variant="outline">
              Limpar
            </Button>
          </Link>
        </div>
      </form>

      {/* Tabela (desktop) */}
      <div className="hidden overflow-x-auto rounded-lg border border-slate-200 bg-white md:block">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-3 py-2">#</th>
              <th className="px-3 py-2">Solicitante</th>
              <th className="px-3 py-2">Departamento</th>
              <th className="px-3 py-2">Tipo</th>
              <th className="px-3 py-2">Data</th>
              <th className="px-3 py-2 text-right">Valor</th>
              <th className="px-3 py-2">Fotos</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((r) => (
              <tr key={r.id} className="hover:bg-slate-50">
                <td className="px-3 py-2 text-slate-400">#{r.id}</td>
                <td className="px-3 py-2 font-medium text-slate-800">
                  {r.requesterName}
                </td>
                <td className="px-3 py-2 text-slate-600">{r.departmentName}</td>
                <td className="px-3 py-2 text-slate-600">{r.expenseTypeName}</td>
                <td className="px-3 py-2 text-slate-600">
                  {formatDate(r.expenseDate)}
                </td>
                <td className="px-3 py-2 text-right font-medium text-slate-800">
                  {formatBRL(r.amount)}
                </td>
                <td className="px-3 py-2 text-slate-600">{r.attachmentCount}</td>
                <td className="px-3 py-2">
                  <StatusControl id={r.id} status={r.status as Status} />
                </td>
                <td className="px-3 py-2 text-right">
                  <Link
                    href={`/admin/solicitacoes/${r.id}`}
                    className="text-sm font-medium text-slate-700 hover:underline"
                  >
                    Ver
                  </Link>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={9} className="px-3 py-8 text-center text-slate-400">
                  Nenhuma solicitação encontrada.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Cards (mobile) */}
      <div className="space-y-3 md:hidden">
        {rows.map((r) => (
          <div
            key={r.id}
            className="rounded-lg border border-slate-200 bg-white p-4"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="font-semibold text-slate-800">
                  {r.requesterName}
                </p>
                <p className="text-xs text-slate-500">
                  #{r.id} · {formatDate(r.expenseDate)}
                </p>
              </div>
              <span className="font-medium text-slate-800">
                {formatBRL(r.amount)}
              </span>
            </div>
            <p className="mt-1 text-sm text-slate-600">
              {r.departmentName} · {r.expenseTypeName} · {r.attachmentCount} foto(s)
            </p>
            <div className="mt-3 flex items-center justify-between">
              <StatusControl id={r.id} status={r.status as Status} />
              <Link
                href={`/admin/solicitacoes/${r.id}`}
                className="text-sm font-medium text-slate-700 hover:underline"
              >
                Ver detalhes
              </Link>
            </div>
          </div>
        ))}
        {rows.length === 0 && (
          <p className="py-8 text-center text-slate-400">
            Nenhuma solicitação encontrada.
          </p>
        )}
      </div>
    </div>
  );
}
