"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  STATUS_COLOR,
  STATUS_LABELS,
  type Status,
} from "@/lib/status";
import { formatBRL } from "@/lib/utils";

const brl = (v: number) => formatBRL(v);

function Card({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <h3 className="mb-3 text-sm font-semibold text-slate-700">{title}</h3>
      <div className="h-64">{children}</div>
    </div>
  );
}

export function DashboardCharts({
  byStatus,
  byDepartment,
  byExpenseType,
  monthly,
}: {
  byStatus: { status: string; count: number; total: number }[];
  byDepartment: { name: string | null; total: number }[];
  byExpenseType: { name: string | null; total: number }[];
  monthly: { month: string; total: number; count: number }[];
}) {
  const statusData = byStatus.map((s) => ({
    name: STATUS_LABELS[s.status as Status] ?? s.status,
    value: s.count,
    color: STATUS_COLOR[s.status as Status] ?? "#64748b",
  }));
  const deptData = byDepartment.map((d) => ({
    name: d.name ?? "—",
    total: d.total,
  }));
  const typeData = byExpenseType.map((d) => ({
    name: d.name ?? "—",
    total: d.total,
  }));

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <Card title="Solicitações por status">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={statusData}
              dataKey="value"
              nameKey="name"
              outerRadius={90}
              label
            >
              {statusData.map((d, i) => (
                <Cell key={i} fill={d.color} />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      </Card>

      <Card title="Evolução mensal (valor)">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={monthly}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" fontSize={12} />
            <YAxis fontSize={12} width={70} tickFormatter={brl} />
            <Tooltip formatter={(v) => brl(Number(v))} />
            <Line
              type="monotone"
              dataKey="total"
              stroke="#0f172a"
              strokeWidth={2}
            />
          </LineChart>
        </ResponsiveContainer>
      </Card>

      <Card title="Valor por departamento">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={deptData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" fontSize={11} />
            <YAxis fontSize={12} width={70} tickFormatter={brl} />
            <Tooltip formatter={(v) => brl(Number(v))} />
            <Bar dataKey="total" fill="#6366f1" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      <Card title="Valor por tipo de despesa">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={typeData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" fontSize={11} />
            <YAxis fontSize={12} width={70} tickFormatter={brl} />
            <Tooltip formatter={(v) => brl(Number(v))} />
            <Bar dataKey="total" fill="#10b981" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Card>
    </div>
  );
}
