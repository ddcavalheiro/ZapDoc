"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import {
  reimbursements,
  reimbursementAttachments,
  statusHistory,
} from "@/db/schema";
import {
  createReimbursementSchema,
  updateReimbursementSchema,
  changeStatusSchema,
  type CreateReimbursementInput,
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

/** Envio público — cria solicitação com status PENDENTE + anexos + histórico. */
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
        supplierName: data.supplierName,
        fiscalDocNumber: data.fiscalDocNumber,
        amount: data.amount.toFixed(2),
        payeeName: data.payeeName,
        paymentDetails: data.paymentDetails,
        status: STATUS.PENDENTE,
      })
      .returning({ id: reimbursements.id })
  )[0];

  await db.insert(reimbursementAttachments).values(
    data.attachments.map((a) => ({
      reimbursementId: inserted.id,
      blobUrl: a.url,
      pathname: a.pathname,
      contentType: a.contentType ?? null,
      size: a.size ?? null,
    })),
  );

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

/** Edição dos dados pelo tesoureiro (após conferência). */
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
      supplierName: d.supplierName,
      fiscalDocNumber: d.fiscalDocNumber,
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

/** Núcleo da mudança de status (já autenticado e validado). */
async function applyStatusChange(
  id: number,
  newStatus: Status,
  reason?: string,
): Promise<ActionState> {
  const current = (
    await db
      .select({ status: reimbursements.status })
      .from(reimbursements)
      .where(eq(reimbursements.id, id))
      .limit(1)
  )[0];
  if (!current) return { ok: false, error: "Solicitação não encontrada." };

  await db
    .update(reimbursements)
    .set({
      status: newStatus,
      statusReason: newStatus === STATUS.RECUSADO ? (reason ?? null) : null,
      paidAt: newStatus === STATUS.PAGO ? new Date() : null,
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
    return { ok: false, error: fe.reason?.[0] ?? fe.status?.[0] ?? "Dados inválidos." };
  }
  return applyStatusChange(id, parsed.data.status as Status, parsed.data.reason);
}
