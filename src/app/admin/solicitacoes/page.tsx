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

  // Fundo da linha por status, para diferenciação rápida na conferência.
  const rowBg = (status: Status) => {
    if (status === "CONCILIADO") return "bg-[#eaf6f0] hover:bg-[#e0f1e9]";
    if (status === "PAGO") return "bg-[#eaf1fb] hover:bg-[#e0eaf8]";
    if (status === "RECUSADO") return "bg-[#fbeeec] hover:bg-[#f7e4e0]";
    return "bg-surface hover:bg-[#faf9f4]";
  };
  const isLocked = (status: Status) =>
    status === "PAGO" || status === "CONCILIADO";

  // Cabeçalho de coluna clicável que alterna a ordenação.
  const sortableHeader = (label: string, col: SortKey) => {
    const active = sort === col;
    const nextDir = active && dir === "asc" ? "desc" : "asc";
    const arrow = active ? (dir === "asc" ? "▲" : "▼") : "↕";
    return (
      <th key={col} className="px-3 py-2 text-center">
        <Link
          href={hrefWith({ sort: col, dir: nextDir, page: undefined })}
          className={`inline-flex items-center justify-center gap-1 hover:text-ink ${
            active ? "text-ink" : ""
          }`}
        >
          <span>{label}</span>
          <span className={active ? "text-ink-muted" : "text-ink-faint"}>
            {arrow}
          </span>
        </Link>
      </th>
    );
  };

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold text-ink">Solicitações</h1>
        <span className="text-sm text-ink-muted">
          {summary.count} resultado(s) · {formatBRL(summary.total)}
        </span>
      </div>

      {/* Filtros (GET, URL compartilhável) */}
      <form
        method="get"
        className="mb-5 space-y-3 rounded-2xl border border-hairline bg-surface p-4"
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

        <div className="flex flex-wrap items-center gap-2">
          <Button type="submit" size="sm">
            Filtrar
          </Button>
          <Link href="/admin/solicitacoes">
            <Button type="button" size="sm" variant="outline">
              Limpar
            </Button>
          </Link>
          <div className="ml-auto flex gap-2">
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
      </form>

      {/* Tabela (desktop) */}
      <div className="hidden overflow-x-auto rounded-2xl border border-hairline bg-surface md:block">
        <table className="w-full text-left text-sm">
          <thead className="bg-[#faf9f4] text-xs uppercase text-ink-muted">
            <tr>
              {sortableHeader("#", "id")}
              {sortableHeader("Solicitante", "requester")}
              {sortableHeader("Departamento", "department")}
              {sortableHeader("Tipo", "type")}
              {sortableHeader("Data", "date")}
              {sortableHeader("Valor", "amount")}
              {sortableHeader("Qtde Notas", "notes")}
              <th className="px-3 py-2 text-center">Fotos</th>
              {sortableHeader("Status", "status")}
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-hairline">
            {rows.map((r) => (
              <tr key={r.id} className={rowBg(r.status as Status)}>
                <td className="px-3 py-2 text-ink-faint">#{r.id}</td>
                <td className="px-3 py-2 font-medium text-ink">
                  {r.requesterName}
                </td>
                <td className="px-3 py-2 text-ink-muted">{r.departmentName}</td>
                <td className="px-3 py-2 text-ink-muted">{r.expenseTypeName}</td>
                <td className="px-3 py-2 text-ink-muted">
                  {formatDate(r.expenseDate)}
                </td>
                <td className="px-3 py-2 text-right font-medium text-ink">
                  {formatBRL(r.amount)}
                </td>
                <td className="px-3 py-2 text-center text-ink-muted">
                  {r.noteCount}
                </td>
                <td className="px-3 py-2 text-center text-ink-muted">
                  {r.attachmentCount}
                </td>
                <td className="px-3 py-2">
                  <StatusControl
                    id={r.id}
                    status={r.status as Status}
                    locked={isLocked(r.status as Status)}
                  />
                </td>
                <td className="px-3 py-2 text-right">
                  <Link
                    href={`/admin/solicitacoes/${r.id}`}
                    className="text-sm font-medium text-brand hover:underline"
                  >
                    Ver
                  </Link>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={10} className="px-3 py-8 text-center text-ink-faint">
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
            className={`rounded-2xl border border-hairline p-4 ${
              rowBg(r.status as Status).split(" ")[0] || "bg-surface"
            }`}
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="font-semibold text-ink">
                  {r.requesterName}
                </p>
                <p className="text-xs text-ink-muted">
                  #{r.id} · {formatDate(r.expenseDate)}
                </p>
              </div>
              <span className="font-medium text-ink">
                {formatBRL(r.amount)}
              </span>
            </div>
            <p className="mt-1 text-sm text-ink-muted">
              {r.departmentName} · {r.expenseTypeName} · {r.noteCount} nota(s) ·{" "}
              {r.attachmentCount} foto(s)
            </p>
            <div className="mt-3 flex items-center justify-between">
              <StatusControl id={r.id} status={r.status as Status} />
              <Link
                href={`/admin/solicitacoes/${r.id}`}
                className="text-sm font-medium text-brand hover:underline"
              >
                Ver detalhes
              </Link>
            </div>
          </div>
        ))}
        {rows.length === 0 && (
          <p className="py-8 text-center text-ink-faint">
            Nenhuma solicitação encontrada.
          </p>
        )}
      </div>

      {/* Paginação */}
      {totalPages > 1 && (
        <nav className="mt-4 flex items-center justify-between text-sm">
          <span className="text-ink-muted">
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
