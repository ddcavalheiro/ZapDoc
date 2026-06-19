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
      label: STATUS_LABELS.AGUARDANDO_PAGAMENTO,
      value: countOf(STATUS.AGUARDANDO_PAGAMENTO),
      hint: formatBRL(totalOf(STATUS.AGUARDANDO_PAGAMENTO)),
      color: "text-violet-600",
    },
    {
      label: STATUS_LABELS.PAGO,
      value: countOf(STATUS.PAGO),
      hint: formatBRL(totalOf(STATUS.PAGO)),
      color: "text-emerald-600",
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
  ];

  const hasData = byStatus.length > 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-900">Dashboard</h1>
        <Link
          href="/admin/solicitacoes"
          className="text-sm font-medium text-slate-700 hover:underline"
        >
          Ver solicitações →
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {cards.map((c) => (
          <div
            key={c.label}
            className="rounded-lg border border-slate-200 bg-white p-4"
          >
            <p className="text-xs font-medium text-slate-500">{c.label}</p>
            <p className={`mt-1 text-2xl font-bold ${c.color}`}>{c.value}</p>
            <p className="text-xs text-slate-400">{c.hint}</p>
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
        <div className="rounded-lg border border-dashed border-slate-300 bg-white p-10 text-center text-slate-400">
          Ainda não há solicitações para exibir gráficos.
        </div>
      )}
    </div>
  );
}
