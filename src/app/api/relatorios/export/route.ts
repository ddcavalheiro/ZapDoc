import { auth } from "@/lib/auth";
import { filtersFromParams, listReimbursements } from "@/db/queries";
import { STATUS_LABELS, type Status } from "@/lib/status";

export const runtime = "nodejs";

function csvCell(value: unknown): string {
  const s = value == null ? "" : String(value);
  if (/[",;\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return new Response("Não autorizado", { status: 401 });
  }

  const url = new URL(request.url);
  const rows = await listReimbursements(filtersFromParams(url.searchParams));

  const header = [
    "ID",
    "Status",
    "Solicitante",
    "Data despesa",
    "Departamento",
    "Tipo",
    "Fornecedor",
    "Nº documento",
    "Valor",
    "Recebedor",
    "Dados pagamento",
    "Descrição",
    "Enviado em",
    "Pago em",
  ];

  const lines = rows.map((r) =>
    [
      r.id,
      STATUS_LABELS[r.status as Status] ?? r.status,
      r.requesterName,
      r.expenseDate,
      r.departmentName ?? "",
      r.expenseTypeName ?? "",
      r.supplierName,
      r.fiscalDocNumber,
      Number(r.amount).toFixed(2).replace(".", ","),
      r.payeeName,
      r.paymentDetails,
      r.description,
      r.createdAt ? new Date(r.createdAt).toISOString() : "",
      r.paidAt ? new Date(r.paidAt).toISOString() : "",
    ]
      .map(csvCell)
      .join(";"),
  );

  // BOM para acentuação correta no Excel.
  const csv = "﻿" + [header.join(";"), ...lines].join("\r\n");
  const filename = `relatorio-reembolsos-${new Date().toISOString().slice(0, 10)}.csv`;

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
