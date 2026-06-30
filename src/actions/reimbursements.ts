"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { del } from "@vercel/blob";
import { db } from "@/db";
import {
  reimbursements,
  notes,
  noteAttachments,
  statusHistory,
} from "@/db/schema";
import {
  createReimbursementSchema,
  updateReimbursementSchema,
  changeStatusSchema,
  noteSchema,
  noteFieldsSchema,
  type CreateReimbursementInput,
  type NoteInput,
  type AttachmentInput,
} from "@/lib/validators";
import {
  requireUser,
  zodFieldErrors,
  type ActionState,
} from "@/lib/action-utils";
import { STATUS, type Status } from "@/lib/status";

export type CreateResult =
  | { ok: true; id: number }
  | { ok: false; error?: string; fieldErrors?: Record<string, string> };

/** Envio público — cria solicitação (status PENDENTE) com notas, fotos e histórico. */
export async function createReimbursement(
  input: CreateReimbursementInput,
): Promise<CreateResult> {
  const parsed = createReimbursementSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      fieldErrors: zodFieldErrors(parsed.error.flatten().fieldErrors),
    };
  }
  const data = parsed.data;

  const inserted = (
    await db
      .insert(reimbursements)
      .values({
        requesterName: data.requesterName,
        expenseDate: data.expenseDate,
        departmentId: data.departmentId,
        expenseTypeId: data.expenseTypeId,
        description: data.description,
        amount: data.amount.toFixed(2),
        payeeName: data.payeeName,
        paymentDetails: data.paymentDetails,
        status: STATUS.PENDENTE,
      })
      .returning({ id: reimbursements.id })
  )[0];

  for (const n of data.notes) {
    await insertNoteWithAttachments(inserted.id, n);
  }

  await db.insert(statusHistory).values({
    reimbursementId: inserted.id,
    fromStatus: null,
    toStatus: STATUS.PENDENTE,
    note: "Solicitação recebida.",
  });

  revalidatePath("/admin/solicitacoes");
  revalidatePath("/admin");
  return { ok: true, id: inserted.id };
}

/** Insere uma nota e suas fotos. */
async function insertNoteWithAttachments(
  reimbursementId: number,
  n: NoteInput,
): Promise<number> {
  const note = (
    await db
      .insert(notes)
      .values({
        reimbursementId,
        supplierName: n.supplierName,
        fiscalDocNumber: n.fiscalDocNumber,
        amount: n.amount.toFixed(2),
      })
      .returning({ id: notes.id })
  )[0];

  await db.insert(noteAttachments).values(
    n.attachments.map((a) => ({
      noteId: note.id,
      blobUrl: a.url,
      pathname: a.pathname,
      contentType: a.contentType ?? null,
      size: a.size ?? null,
    })),
  );
  return note.id;
}

/** Edição dos dados gerais da solicitação pelo tesoureiro. */
export async function updateReimbursement(
  id: number,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireUser();
  const parsed = updateReimbursementSchema.safeParse(
    Object.fromEntries(formData),
  );
  if (!parsed.success) {
    return {
      ok: false,
      fieldErrors: zodFieldErrors(parsed.error.flatten().fieldErrors),
    };
  }
  const d = parsed.data;
  await db
    .update(reimbursements)
    .set({
      requesterName: d.requesterName,
      expenseDate: d.expenseDate,
      departmentId: d.departmentId,
      expenseTypeId: d.expenseTypeId,
      description: d.description,
      amount: d.amount.toFixed(2),
      payeeName: d.payeeName,
      paymentDetails: d.paymentDetails,
      updatedAt: new Date(),
    })
    .where(eq(reimbursements.id, id));

  revalidatePath(`/admin/solicitacoes/${id}`);
  revalidatePath("/admin/solicitacoes");
  return { ok: true };
}

/* ----------------------------- Notas (admin) ----------------------------- */

/** Adiciona uma nota (com fotos) a uma solicitação existente. */
export async function addNote(
  reimbursementId: number,
  input: NoteInput,
): Promise<ActionState> {
  await requireUser();
  const parsed = noteSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      fieldErrors: zodFieldErrors(parsed.error.flatten().fieldErrors),
    };
  }
  await insertNoteWithAttachments(reimbursementId, parsed.data);
  revalidatePath(`/admin/solicitacoes/${reimbursementId}`);
  revalidatePath("/admin/solicitacoes");
  return { ok: true };
}

/** Atualiza os dados (fornecedor/nº/valor) de uma nota. */
export async function updateNote(
  noteId: number,
  reimbursementId: number,
  input: unknown,
): Promise<ActionState> {
  await requireUser();
  const parsed = noteFieldsSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      fieldErrors: zodFieldErrors(parsed.error.flatten().fieldErrors),
    };
  }
  const d = parsed.data;
  await db
    .update(notes)
    .set({
      supplierName: d.supplierName,
      fiscalDocNumber: d.fiscalDocNumber,
      amount: d.amount.toFixed(2),
    })
    .where(eq(notes.id, noteId));
  revalidatePath(`/admin/solicitacoes/${reimbursementId}`);
  return { ok: true };
}

/** Remove uma nota inteira (e suas fotos, inclusive do Blob). */
export async function deleteNote(
  noteId: number,
  reimbursementId: number,
): Promise<ActionState> {
  await requireUser();
  const atts = await db
    .select({ url: noteAttachments.blobUrl })
    .from(noteAttachments)
    .where(eq(noteAttachments.noteId, noteId));
  await safeDelBlobs(atts.map((a) => a.url));
  await db.delete(notes).where(eq(notes.id, noteId));
  revalidatePath(`/admin/solicitacoes/${reimbursementId}`);
  revalidatePath("/admin/solicitacoes");
  return { ok: true };
}

/** Adiciona fotos a uma nota existente. */
export async function addNoteAttachments(
  noteId: number,
  reimbursementId: number,
  attachments: AttachmentInput[],
): Promise<ActionState> {
  await requireUser();
  if (!attachments?.length) return { ok: false, error: "Nenhuma foto enviada." };
  await db.insert(noteAttachments).values(
    attachments.map((a) => ({
      noteId,
      blobUrl: a.url,
      pathname: a.pathname,
      contentType: a.contentType ?? null,
      size: a.size ?? null,
    })),
  );
  revalidatePath(`/admin/solicitacoes/${reimbursementId}`);
  return { ok: true };
}

/** Remove uma foto específica de uma nota (mantém ao menos uma). */
export async function deleteNoteAttachment(
  attachmentId: number,
  noteId: number,
  reimbursementId: number,
): Promise<ActionState> {
  await requireUser();
  const count = (
    await db
      .select({ url: noteAttachments.blobUrl, id: noteAttachments.id })
      .from(noteAttachments)
      .where(eq(noteAttachments.noteId, noteId))
  );
  if (count.length <= 1) {
    return { ok: false, error: "A nota precisa ter ao menos uma foto." };
  }
  const target = count.find((a) => a.id === attachmentId);
  if (target) await safeDelBlobs([target.url]);
  await db.delete(noteAttachments).where(eq(noteAttachments.id, attachmentId));
  revalidatePath(`/admin/solicitacoes/${reimbursementId}`);
  return { ok: true };
}

/** Apaga blobs do Vercel Blob ignorando erros (best-effort). */
async function safeDelBlobs(urls: string[]) {
  if (!urls.length) return;
  try {
    await del(urls);
  } catch {
    // não bloqueia a operação se o blob já não existir
  }
}

/* ----------------------------- Status ----------------------------- */

/** Núcleo da mudança de status (já autenticado e validado). */
async function applyStatusChange(
  id: number,
  newStatus: Status,
  reason?: string,
): Promise<ActionState> {
  const current = (
    await db
      .select({ status: reimbursements.status, paidAt: reimbursements.paidAt })
      .from(reimbursements)
      .where(eq(reimbursements.id, id))
      .limit(1)
  )[0];
  if (!current) return { ok: false, error: "Solicitação não encontrada." };

  // `PAGO`/`CONCILIADO` mantêm uma data de pagamento; os demais a limpam.
  const paidAt =
    newStatus === STATUS.PAGO
      ? new Date()
      : newStatus === STATUS.CONCILIADO
        ? (current.paidAt ?? new Date())
        : null;

  await db
    .update(reimbursements)
    .set({
      status: newStatus,
      statusReason: newStatus === STATUS.RECUSADO ? (reason ?? null) : null,
      paidAt,
      updatedAt: new Date(),
    })
    .where(eq(reimbursements.id, id));

  await db.insert(statusHistory).values({
    reimbursementId: id,
    fromStatus: current.status,
    toStatus: newStatus,
    note: reason || null,
  });

  revalidatePath(`/admin/solicitacoes/${id}`);
  revalidatePath("/admin/solicitacoes");
  revalidatePath("/admin");
  return { ok: true };
}

/** Mudança de status via formulário (página de detalhe). */
export async function changeStatus(
  id: number,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireUser();
  const parsed = changeStatusSchema.safeParse({
    status: formData.get("status"),
    reason: formData.get("reason") ?? undefined,
  });
  if (!parsed.success) {
    return {
      ok: false,
      fieldErrors: zodFieldErrors(parsed.error.flatten().fieldErrors),
    };
  }
  return applyStatusChange(id, parsed.data.status as Status, parsed.data.reason);
}

/* -------------------------- Conciliação bancária -------------------------- */

/** Status a partir dos quais uma solicitação pode ser conciliada. */
const RECONCILABLE_FROM: Status[] = [
  STATUS.AGUARDANDO_PAGAMENTO,
  STATUS.VERIFICADO,
  STATUS.PAGO,
];

export interface ReconcileItem {
  id: number;
  /** Data do lançamento no extrato (yyyy-mm-dd) — usada como data de pagamento. */
  paymentDate: string;
}

export type ReconcileResult =
  | { ok: true; count: number }
  | { ok: false; error: string };

/**
 * Aprova a conciliação: promove as solicitações confirmadas para `CONCILIADO`,
 * preenche `paidAt` com a data do extrato quando ainda não houver, e registra na
 * auditoria (`status_history`) que foi conciliado via arquivo do banco informado.
 */
export async function reconcileReimbursements(
  bankName: string,
  items: ReconcileItem[],
): Promise<ReconcileResult> {
  await requireUser();

  if (!Array.isArray(items) || items.length === 0) {
    return { ok: false, error: "Nenhuma solicitação confirmada para aprovar." };
  }
  const bank = (bankName || "").trim() || "Banco não identificado";

  let count = 0;
  for (const item of items) {
    const id = Number(item.id);
    if (!Number.isInteger(id)) continue;

    const current = (
      await db
        .select({ status: reimbursements.status, paidAt: reimbursements.paidAt })
        .from(reimbursements)
        .where(eq(reimbursements.id, id))
        .limit(1)
    )[0];
    // Ignora silenciosamente o que já não é conciliável (ex.: alterado entre o
    // carregamento do extrato e a aprovação).
    if (!current || !RECONCILABLE_FROM.includes(current.status as Status)) {
      continue;
    }

    // Data do extrato → meio-dia UTC, evitando deslocar o dia ao formatar.
    const fromStatement = /^\d{4}-\d{2}-\d{2}$/.test(item.paymentDate ?? "")
      ? new Date(`${item.paymentDate}T12:00:00Z`)
      : null;

    await db
      .update(reimbursements)
      .set({
        status: STATUS.CONCILIADO,
        paidAt: current.paidAt ?? fromStatement ?? new Date(),
        statusReason: null,
        updatedAt: new Date(),
      })
      .where(eq(reimbursements.id, id));

    await db.insert(statusHistory).values({
      reimbursementId: id,
      fromStatus: current.status,
      toStatus: STATUS.CONCILIADO,
      note: `Conciliado via arquivo - banco ${bank}`,
    });
    count++;
  }

  if (count === 0) {
    return {
      ok: false,
      error: "Nenhuma solicitação pôde ser conciliada (status já alterado?).",
    };
  }

  revalidatePath("/admin/conciliacao");
  revalidatePath("/admin/solicitacoes");
  revalidatePath("/admin");
  return { ok: true, count };
}

/** Mudança de status programática (botões inline da listagem). */
export async function setReimbursementStatus(
  id: number,
  status: string,
  reason?: string,
): Promise<ActionState> {
  await requireUser();
  const parsed = changeStatusSchema.safeParse({ status, reason });
  if (!parsed.success) {
    const fe = parsed.error.flatten().fieldErrors;
    return {
      ok: false,
      error: fe.reason?.[0] ?? fe.status?.[0] ?? "Dados inválidos.",
    };
  }
  return applyStatusChange(id, parsed.data.status as Status, parsed.data.reason);
}
