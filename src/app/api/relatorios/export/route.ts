import { auth } from "@/lib/auth";
import {
  filtersFromParams,
  getNotesByReimbursementIds,
  listReimbursements,
} from "@/db/queries";
import { STATUS_LABELS, type Status } from "@/lib/status";
import { formatBRL, formatDate, formatDateTime } from "@/lib/utils";

export const runtime = "nodejs";

type Row = {
  id: number;
  status: string;
  requester: string;
  date: string;
  department: string;
  type: string;
  amount: number;
  payee: string;
  payment: string;
  description: string;
  noteCount: number;
  notesSum: number;
  createdAt: string;
  paidAt: string;
};

type NoteRow = {
  reimbursementId: number;
  supplier: string;
  fiscal: string;
  amount: number;
};

const COLUMNS = [
  "ID",
  "Status",
  "Solicitante",
  "Data despesa",
  "Departamento",
  "Tipo",
  "Valor a reembolsar",
  "Recebedor",
  "Dados pagamento",
  "Descrição",
  "Qtde Notas",
  "Soma das notas",
  "Enviado em",
  "Pago em",
];

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return new Response("Não autorizado", { status: 401 });
  }

  const url = new URL(request.url);
  const format = (url.searchParams.get("format") ?? "csv").toLowerCase();
  const filtered = await listReimbursements(filtersFromParams(url.searchParams));
  const ids = filtered.map((r) => r.id);
  const noteRows = await getNotesByReimbursementIds(ids);

  const sumByReimbursement = new Map<number, number>();
  for (const n of noteRows) {
    sumByReimbursement.set(
      n.reimbursementId,
      (sumByReimbursement.get(n.reimbursementId) ?? 0) + Number(n.amount),
    );
  }

  const rows: Row[] = filtered.map((r) => ({
    id: r.id,
    status: STATUS_LABELS[r.status as Status] ?? r.status,
    requester: r.requesterName,
    date: formatDate(r.expenseDate),
    department: r.departmentName ?? "",
    type: r.expenseTypeName ?? "",
    amount: Number(r.amount),
    payee: r.payeeName,
    payment: r.paymentDetails,
    description: r.description,
    noteCount: r.noteCount,
    notesSum: sumByReimbursement.get(r.id) ?? 0,
    createdAt: r.createdAt ? formatDateTime(r.createdAt) : "",
    paidAt: r.paidAt ? formatDateTime(r.paidAt) : "",
  }));

  const notes: NoteRow[] = noteRows.map((n) => ({
    reimbursementId: n.reimbursementId,
    supplier: n.supplierName,
    fiscal: n.fiscalDocNumber,
    amount: Number(n.amount),
  }));

  const stamp = new Date().toISOString().slice(0, 10);

  if (format === "xlsx") return excel(rows, notes, stamp);
  if (format === "pdf") return pdf(rows, stamp);
  return csv(rows, stamp);
}

/* ------------------------------- CSV ------------------------------- */

function csvCell(value: unknown): string {
  const s = value == null ? "" : String(value);
  if (/[",;\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function csv(rows: Row[], stamp: string) {
  const money = (n: number) => n.toFixed(2).replace(".", ",");
  const lines = rows.map((r) =>
    [
      r.id,
      r.status,
      r.requester,
      r.date,
      r.department,
      r.type,
      money(r.amount),
      r.payee,
      r.payment,
      r.description,
      r.noteCount,
      money(r.notesSum),
      r.createdAt,
      r.paidAt,
    ]
      .map(csvCell)
      .join(";"),
  );
  const body = "﻿" + [COLUMNS.join(";"), ...lines].join("\r\n");
  return new Response(body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="reembolsos-${stamp}.csv"`,
    },
  });
}

/* ------------------------------- Excel ------------------------------- */

async function excel(rows: Row[], notes: NoteRow[], stamp: string) {
  const ExcelJS = (await import("exceljs")).default;
  const wb = new ExcelJS.Workbook();

  const ws = wb.addWorksheet("Solicitações");
  ws.columns = [
    { header: "ID", key: "id", width: 6 },
    { header: "Status", key: "status", width: 20 },
    { header: "Solicitante", key: "requester", width: 24 },
    { header: "Data despesa", key: "date", width: 14 },
    { header: "Departamento", key: "department", width: 20 },
    { header: "Tipo", key: "type", width: 20 },
    { header: "Valor a reembolsar", key: "amount", width: 18 },
    { header: "Recebedor", key: "payee", width: 24 },
    { header: "Dados pagamento", key: "payment", width: 28 },
    { header: "Descrição", key: "description", width: 40 },
    { header: "Qtde Notas", key: "noteCount", width: 12 },
    { header: "Soma das notas", key: "notesSum", width: 16 },
    { header: "Enviado em", key: "createdAt", width: 18 },
    { header: "Pago em", key: "paidAt", width: 18 },
  ];
  ws.getRow(1).font = { bold: true };
  for (const r of rows) ws.addRow(r);
  ws.getColumn("amount").numFmt = '"R$" #,##0.00';
  ws.getColumn("notesSum").numFmt = '"R$" #,##0.00';

  const wsNotes = wb.addWorksheet("Notas");
  wsNotes.columns = [
    { header: "Solicitação", key: "reimbursementId", width: 12 },
    { header: "Fornecedor", key: "supplier", width: 28 },
    { header: "Número da nota", key: "fiscal", width: 18 },
    { header: "Valor", key: "amount", width: 16 },
  ];
  wsNotes.getRow(1).font = { bold: true };
  for (const n of notes) wsNotes.addRow(n);
  wsNotes.getColumn("amount").numFmt = '"R$" #,##0.00';

  const buffer = await wb.xlsx.writeBuffer();
  return new Response(buffer as ArrayBuffer, {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="reembolsos-${stamp}.xlsx"`,
    },
  });
}

/* ------------------------------- PDF ------------------------------- */

async function pdf(rows: Row[], stamp: string) {
  const PDFDocument = (await import("pdfkit")).default;
  const doc = new PDFDocument({ size: "A4", layout: "landscape", margin: 36 });

  const chunks: Buffer[] = [];
  const done = new Promise<Buffer>((resolve) => {
    doc.on("data", (c: Buffer) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
  });

  doc.fontSize(16).text("Relatório de reembolsos", { continued: false });
  doc
    .fontSize(9)
    .fillColor("#666")
    .text(`Gerado em ${formatDateTime(new Date())} · ${rows.length} item(ns)`);
  doc.moveDown(0.8).fillColor("#000");

  // Colunas (x e largura) em pontos.
  const cols = [
    { label: "#", x: 36, w: 30 },
    { label: "Solicitante", x: 66, w: 150 },
    { label: "Data", x: 216, w: 60 },
    { label: "Departamento", x: 276, w: 120 },
    { label: "Status", x: 396, w: 120 },
    { label: "Notas", x: 516, w: 45 },
    { label: "Valor", x: 561, w: 200 },
  ];

  const drawRow = (
    cells: string[],
    opts: { bold?: boolean; color?: string } = {},
  ) => {
    const y = doc.y;
    doc
      .fontSize(9)
      .font(opts.bold ? "Helvetica-Bold" : "Helvetica")
      .fillColor(opts.color ?? "#000");
    cells.forEach((c, i) => {
      doc.text(c, cols[i].x, y, { width: cols[i].w, lineBreak: false });
    });
    doc.moveDown(0.6);
  };

  drawRow(
    cols.map((c) => c.label),
    { bold: true },
  );
  doc
    .moveTo(36, doc.y)
    .lineTo(806, doc.y)
    .strokeColor("#ccc")
    .stroke()
    .moveDown(0.2);

  let total = 0;
  for (const r of rows) {
    total += r.amount;
    if (doc.y > 540) {
      doc.addPage();
    }
    drawRow([
      String(r.id),
      r.requester,
      r.date,
      r.department,
      r.status,
      String(r.noteCount),
      formatBRL(r.amount),
    ]);
  }

  doc.moveDown(0.4);
  doc
    .moveTo(36, doc.y)
    .lineTo(806, doc.y)
    .strokeColor("#ccc")
    .stroke()
    .moveDown(0.3);
  doc
    .font("Helvetica-Bold")
    .fontSize(10)
    .text(`Total: ${formatBRL(total)}`, 396, doc.y);

  doc.end();
  const buffer = await done;
  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="reembolsos-${stamp}.pdf"`,
    },
  });
}
