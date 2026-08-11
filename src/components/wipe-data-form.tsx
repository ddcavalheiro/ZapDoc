"use client";

import { useActionState, useState } from "react";
import { wipeTransactionalData } from "@/actions/manutencao";
import { WIPE_CONFIRMATION, type WipeState } from "@/lib/wipe";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/field";

const initial: WipeState = { ok: false };

export type WipeCounts = {
  reimbursements: number;
  notes: number;
  attachments: number;
  statusHistory: number;
};

const PRESERVADAS = [
  "Departamentos",
  "Tipos de despesa",
  "Usuários",
  "Perfis de acesso",
];

export function WipeDataForm({ counts }: { counts: WipeCounts }) {
  const [state, formAction, pending] = useActionState(
    wipeTransactionalData,
    initial,
  );
  const [confirmacao, setConfirmacao] = useState("");

  const vazia =
    counts.reimbursements === 0 &&
    counts.notes === 0 &&
    counts.attachments === 0 &&
    counts.statusHistory === 0;
  const liberado = confirmacao === WIPE_CONFIRMATION && !pending;

  if (state.ok && state.summary) {
    const s = state.summary;
    return (
      <div className="rounded-2xl border border-hairline bg-surface p-5">
        <h2 className="font-display text-lg font-semibold text-ink">
          Base limpa
        </h2>
        <ul className="mt-3 space-y-1 text-sm text-ink-muted">
          <li>
            <span className="tnum font-semibold text-ink">
              {s.reimbursements}
            </span>{" "}
            solicitações apagadas
          </li>
          <li>
            <span className="tnum font-semibold text-ink">{s.notes}</span> notas
            fiscais apagadas
          </li>
          <li>
            <span className="tnum font-semibold text-ink">{s.attachments}</span>{" "}
            anexos apagados (
            <span className="tnum">{s.blobsDeleted}</span> fotos removidas do
            storage)
          </li>
          <li>
            <span className="tnum font-semibold text-ink">
              {s.statusHistory}
            </span>{" "}
            registros de histórico apagados
          </li>
        </ul>
        {s.blobsFailed > 0 && (
          <p className="mt-3 rounded-[10px] bg-[#fdf3e7] px-3 py-2 text-sm text-[#8a5a12]">
            {s.blobsFailed} foto(s) não puderam ser removidas do storage. O
            banco foi limpo mesmo assim — os arquivos ficaram órfãos e podem ser
            apagados pelo painel do Vercel Blob.
          </p>
        )}
        <p className="mt-4 text-sm text-ink-faint">
          A numeração de protocolo foi reiniciada: a próxima solicitação será a
          nº 1.
        </p>
      </div>
    );
  }

  return (
    <form
      action={formAction}
      className="rounded-2xl border border-[#e6c9c3] bg-surface p-5"
    >
      <h2 className="font-display text-lg font-semibold text-ink">
        Limpar base de solicitações
      </h2>
      <p className="mt-1 text-sm text-ink-muted">
        Apaga todo o movimento e reinicia a numeração de protocolo. Os cadastros
        são preservados: {PRESERVADAS.join(", ").toLowerCase()}.
      </p>

      <div className="mt-4 rounded-[10px] bg-[#fdf1ef] px-4 py-3">
        <p className="text-sm font-semibold text-[#8c2f24]">
          Esta ação é irreversível.
        </p>
        <ul className="mt-2 space-y-0.5 text-sm text-[#8c2f24]">
          <li>
            <span className="tnum font-semibold">{counts.reimbursements}</span>{" "}
            solicitações
          </li>
          <li>
            <span className="tnum font-semibold">{counts.notes}</span> notas
            fiscais
          </li>
          <li>
            <span className="tnum font-semibold">{counts.attachments}</span>{" "}
            fotos (apagadas também do storage)
          </li>
          <li>
            <span className="tnum font-semibold">{counts.statusHistory}</span>{" "}
            registros de histórico
          </li>
        </ul>
      </div>

      {vazia ? (
        <p className="mt-4 text-sm text-ink-faint">
          A base já está vazia — não há nada para apagar.
        </p>
      ) : (
        <div className="mt-4">
          <Label htmlFor="confirmacao">
            Digite {WIPE_CONFIRMATION} para confirmar
          </Label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              id="confirmacao"
              name="confirmacao"
              value={confirmacao}
              onChange={(e) => setConfirmacao(e.target.value)}
              autoComplete="off"
              placeholder={WIPE_CONFIRMATION}
              className="sm:max-w-56"
              aria-describedby={
                state.fieldErrors?.confirmacao ? "confirmacao-erro" : undefined
              }
            />
            <Button
              type="submit"
              variant="danger"
              disabled={!liberado}
              className="shrink-0"
            >
              {pending ? "Limpando…" : "Limpar base"}
            </Button>
          </div>
          {state.fieldErrors?.confirmacao && (
            <p id="confirmacao-erro" className="mt-1 text-sm text-rose-600">
              {state.fieldErrors.confirmacao}
            </p>
          )}
          {state.error && (
            <p className="mt-1 text-sm text-rose-600">{state.error}</p>
          )}
        </div>
      )}
    </form>
  );
}
