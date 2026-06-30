import Link from "next/link";
import { getDashboardData } from "@/db/queries";
import { DashboardCharts } from "@/components/dashboard-charts";
import { STATUS, STATUS_LABELS, type Status } from "@/lib/status";
import { formatBRL } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const { byStatus, byDepartment, byExpenseType, monthly } =
    await getDashboardData();

  const map = new Map(byStatus.map((s) => [s.status as Status, s]));
  const countOf = (s: Status) => map.get(s)?.count ?? 0;
  const totalOf = (s: Status) => map.get(s)?.total ?? 0;

  const cards = [
    {
      label: STATUS_LABELS.PENDENTE,
      value: countOf(STATUS.PENDENTE),
      hint: formatBRL(totalOf(STATUS.PENDENTE)),
      color: "text-amber-600",
    },
    {
      label: "A pagar (verif. + aguard.)",
      value:
        countOf(STATUS.VERIFICADO) + countOf(STATUS.AGUARDANDO_PAGAMENTO),
      hint: formatBRL(
        totalOf(STATUS.VERIFICADO) + totalOf(STATUS.AGUARDANDO_PAGAMENTO),
      ),
      color: "text-sky-600",
    },
    {
      label: STATUS_LABELS.PAGO,
      value: countOf(STATUS.PAGO),
      hint: formatBRL(totalOf(STATUS.PAGO)),
      color: "text-emerald-600",
    },
    {
      label: STATUS_LABELS.CONCILIADO,
      value: countOf(STATUS.CONCILIADO),
      hint: formatBRL(totalOf(STATUS.CONCILIADO)),
      color: "text-cyan-700",
    },
  ];

  const hasData = byStatus.length > 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-ink">Dashboard</h1>
        <Link
          href="/admin/solicitacoes"
          className="text-sm font-medium text-brand hover:underline"
        >
          Ver solicitações →
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {cards.map((c) => (
          <div
            key={c.label}
            className="rounded-2xl border border-hairline bg-surface p-5"
          >
            <p className="text-xs font-medium text-ink-muted">{c.label}</p>
            <p
              className={`mt-1 font-display text-2xl font-bold tnum ${c.color}`}
            >
              {c.value}
            </p>
            <p className="tnum text-xs text-ink-faint">{c.hint}</p>
          </div>
        ))}
      </div>

      {hasData ? (
        <DashboardCharts
          byStatus={byStatus}
          byDepartment={byDepartment}
          byExpenseType={byExpenseType}
          monthly={monthly}
        />
      ) : (
        <div className="rounded-2xl border border-dashed border-hairline bg-surface p-10 text-center text-ink-faint">
          Ainda não há solicitações para exibir gráficos.
        </div>
      )}
    </div>
  );
}
