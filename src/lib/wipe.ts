import type { ActionState } from "@/lib/action-state";

/**
 * Constantes da limpeza de base, fora do módulo de server action: um arquivo
 * `"use server"` só pode exportar funções async, então a constante precisa
 * morar aqui para o client component também conseguir importá-la.
 */

/** Palavra que o usuário precisa digitar para liberar a limpeza. */
export const WIPE_CONFIRMATION = "LIMPAR";

export type WipeSummary = {
  reimbursements: number;
  notes: number;
  attachments: number;
  statusHistory: number;
  blobsDeleted: number;
  blobsFailed: number;
};

export type WipeState = ActionState & { summary?: WipeSummary };
