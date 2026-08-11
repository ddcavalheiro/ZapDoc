"use server";

import { revalidatePath } from "next/cache";
import { sql } from "drizzle-orm";
import { del } from "@vercel/blob";
import { db } from "@/db";
import {
  noteAttachments,
  notes,
  reimbursements,
  statusHistory,
} from "@/db/schema";
import { getWipeableCounts } from "@/db/queries";
import { requireAdmin } from "@/lib/action-utils";
import { WIPE_CONFIRMATION, type WipeState } from "@/lib/wipe";

/** `del` aceita lista; mandamos em lotes para não estourar a requisição. */
const BLOB_BATCH = 100;

/**
 * Zera as tabelas transacionais, preservando os cadastros.
 *
 * Apaga: `reimbursements`, `notes`, `note_attachments`, `status_history`.
 * Preserva: `departments`, `expense_types`, `users` e `roles` — esta última
 * é catálogo referenciado por `users.role_id`, então limpá-la quebraria os
 * usuários preservados.
 *
 * As fotos são apagadas do Vercel Blob junto, senão os arquivos ficariam
 * órfãos no store (que é público) sem nenhuma referência no sistema.
 */
export async function wipeTransactionalData(
  _prev: WipeState,
  formData: FormData,
): Promise<WipeState> {
  await requireAdmin();

  if (formData.get("confirmacao") !== WIPE_CONFIRMATION) {
    return {
      ok: false,
      fieldErrors: {
        confirmacao: `Digite ${WIPE_CONFIRMATION} para confirmar.`,
      },
    };
  }

  const counts = await getWipeableCounts();

  // Lidos antes do TRUNCATE — depois dele as URLs não existem mais.
  const urls = (
    await db.select({ url: noteAttachments.blobUrl }).from(noteAttachments)
  ).map((a) => a.url);

  // TRUNCATE antes de mexer nos blobs: se a remoção dos arquivos falhar,
  // sobram blobs órfãos (custo de storage). Na ordem inversa, uma falha aqui
  // deixaria solicitações vivas apontando para fotos já apagadas — pior.
  await db.execute(
    sql`truncate table ${noteAttachments}, ${notes}, ${statusHistory}, ${reimbursements} restart identity cascade`,
  );

  let blobsDeleted = 0;
  let blobsFailed = 0;
  for (let i = 0; i < urls.length; i += BLOB_BATCH) {
    const batch = urls.slice(i, i + BLOB_BATCH);
    try {
      await del(batch);
      blobsDeleted += batch.length;
    } catch {
      // Best-effort, igual ao fluxo de exclusão de anexo: um blob que já não
      // existe (ou uma falha de rede) não deve reverter a limpeza do banco.
      blobsFailed += batch.length;
    }
  }

  revalidatePath("/admin");
  revalidatePath("/admin/solicitacoes");
  revalidatePath("/admin/relatorios");
  revalidatePath("/admin/conciliacao");
  revalidatePath("/admin/manutencao");

  return {
    ok: true,
    summary: { ...counts, blobsDeleted, blobsFailed },
  };
}
