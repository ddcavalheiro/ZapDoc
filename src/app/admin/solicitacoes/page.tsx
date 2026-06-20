import Link from "next/link";
import {
  countReimbursements,
  filtersFromParams,
  getAllDepartments,
  getAllExpenseTypes,
  listOptionsFromParams,
  listReimbursements,
  STATUS_FILTER_ALL,
  STATUS_FILTER_OPEN,
  type SortKey,
} from "@/db/queries";
import { StatusControl } from "@/components/status-control";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/field";
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
  // "Pendentes" é o filtro padrão quando nenhum status foi escolhido.
  const statusValue = sp.status ?? STATUS_FILTER_OPEN;
  const effectiveSp: SP = { ...sp, status: statusValue };
  const filters = filtersFromParams(effectiveSp);
  const { sort, dir, page, perPage } = listOptionsFromParams(sp);

  const [rows, summary, departments, expenseTypes] = await Promise.all([
    listReimbursements(filters, { sort, dir, page, perPage }),
    countReimbursements(filters),
    getAllDepartments(),
    getAllExpenseTypes(),
  ]);

  const totalPages = Math.max(1, Math.ceil(summary.count / perPage));

  // Query string (com status efetivo) para os botões de exportação.
  const exportQs = new URLSearchParams(
    Object.entries(effectiveSp).filter(([, v]) => v) as [string, string][],
  ).toString();

  // Monta uma URL preservando os params atuais, aplicando overrides.
  const hrefWith = (overrides: SP) => {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(sp)) if (v) params.set(k, v);
    for (const [k, v] of Object.entries(overrides)) {
      if (v === undefined || v === "") params.delete(k);
      else params.set(k, v);
    }
    const qs = params.toString();
    return `/admin/solicitacoes${qs ? `?${qs}` : ""}`;
  };

  // Cabeçalho de coluna clicável que alterna a ordenação.
  const sortableHeader = (
    label: string,
    col: SortKey,
    align: "left" | "right" = "left",
  ) => {
    const active = sort === col;
    const nextDir = active && dir === "asc" ? "desc" : "asc";
    const arrow = active ? (dir === "asc" ? "▲" : "▼") : "↕";
    return (
      <th
        key={col}
        className={`px-3 py-2 ${align === "right" ? "text-right" : ""}`}
      >
        <Link
          href={hrefWith({ sort: col, dir: nextDir, page: undefined })}
          className={`inline-flex items-center gap-1 hover:text-slate-700 ${
            active ? "text-slate-700" : ""
          }`}
        >
          <span>{label}</span>
          <span className={active ? "text-slate-500" : "text-slate-300"}>
            {arrow}
          </span>
        </Link>
      </th>
    );
  };

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold text-slate-900">Solicitações</h1>
        <div className="flex items-center gap-3">
          <span className="text-sm text-slate-500">
            {summary.count} resultado(s) · {formatBRL(summary.total)}
          </span>
          <a href={`/api/relatorios/export?format=xlsx&${exportQs}`}>
            <Button type="button" size="sm" variant="outline">
              Excel
            </Button>
          </a>
          <a href={`/api/relatorios/export?format=pdf&${exportQs}`}>
            <Button type="button" size="sm" variant="outline">
              PDF
            </Button>
          </a>
        </div>
      </div>

      {/* Filtros (GET, URL compartilhável) */}
      <form
        method="get"
        className="mb-5 space-y-3 rounded-lg border border-slate-200 bg-white p-4"
      >
        {/* Linha 1: busca + selects (todos com label) */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <div className="lg:col-span-2">
            <Label htmlFor="search">Buscar</Label>
            <Input
              id="search"
              name="search"
              defaultValue={sp.search ?? ""}
              placeholder="Nome, fornecedor, nº doc…"
            />
          </div>
          <div>
            <Label htmlFor="status">Status</Label>
            <Select id="status" name="status" defaultValue={statusValue}>
              <option value={STATUS_FILTER_OPEN}>Pendentes</option>
              <option value={STATUS_FILTER_ALL}>Todos</option>
              {STATUS_ORDER.map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABELS[s]}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="departmentId">Departamento</Label>
            <Select
              id="departmentId"
              name="departmentId"
              defaultValue={sp.departmentId ?? ""}
            >
              <option value="">Todos</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="expenseTypeId">Tipo de despesa</Label>
            <Select
              id="expenseTypeId"
              name="expenseTypeId"
              defaultValue={sp.expenseTypeId ?? ""}
            >
              <option value="">Todos</option>
              {expenseTypes.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </Select>
          </div>
        </div>

        {/* Linha 2: período (com labels) */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <Label htmlFor="from">Data inicial</Label>
            <Input
              id="from"
              name="from"
              type="date"
              defaultValue={sp.from ?? ""}
            />
          </div>
          <div>
            <Label htmlFor="to">Data final</Label>
            <Input id="to" name="to" type="date" defaultValue={sp.to ?? ""} />
          </div>
        </div>

        {/* Preserva a ordenação ao reaplicar filtros */}
        {sort && <input type="hidden" name="sort" value={sort} />}
        {sort && <input type="hidden" name="dir" value={dir} />}

        <div className="flex gap-2">
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
              {sortableHeader("#", "id")}
              {sortableHeader("Solicitante", "requester")}
              {sortableHeader("Departamento", "department")}
              {sortableHeader("Tipo", "type")}
              {sortableHeader("Data", "date")}
              {sortableHeader("Valor", "amount", "right")}
              {sortableHeader("Qtde Notas", "notes")}
              <th className="px-3 py-2">Fotos</th>
              {sortableHeader("Status", "status")}
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
                <td className="px-3 py-2 text-center text-slate-600">
                  {r.noteCount}
                </td>
                <td className="px-3 py-2 text-center text-slate-600">
                  {r.attachmentCount}
                </td>
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
                <td colSpan={10} className="px-3 py-8 text-center text-slate-400">
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
              {r.departmentName} · {r.expenseTypeName} · {r.noteCount} nota(s) ·{" "}
              {r.attachmentCount} foto(s)
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

      {/* Paginação */}
      {totalPages > 1 && (
        <nav className="mt-4 flex items-center justify-between text-sm">
          <span className="text-slate-500">
            Página {page} de {totalPages}
          </span>
          <div className="flex gap-2">
            {page > 1 ? (
              <Link href={hrefWith({ page: String(page - 1) })}>
                <Button type="button" size="sm" variant="outline">
                  ← Anterior
                </Button>
              </Link>
            ) : (
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled
                className="opacity-50"
              >
                ← Anterior
              </Button>
            )}
            {page < totalPages ? (
              <Link href={hrefWith({ page: String(page + 1) })}>
                <Button type="button" size="sm" variant="outline">
                  Próxima →
                </Button>
              </Link>
            ) : (
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled
                className="opacity-50"
              >
                Próxima →
              </Button>
            )}
          </div>
        </nav>
      )}
    </div>
  );
}
