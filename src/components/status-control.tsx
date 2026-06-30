"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setReimbursementStatus } from "@/actions/reimbursements";
import { StatusBadge } from "@/components/status-badge";
import {
  STATUS,
  STATUS_LABELS,
  STATUS_ORDER,
  type Status,
} from "@/lib/status";

export function StatusControl({
  id,
  status,
  locked = false,
}: {
  id: number;
  status: Status;
  /** Quando travado, exibe apenas o badge; alteração só pela tela de detalhe. */
  locked?: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string>();

  function onChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const next = e.target.value as Status;
    if (next === status) return;

    let reason: string | undefined;
    if (next === STATUS.RECUSADO) {
      reason = window.prompt("Motivo da recusa:") ?? undefined;
      if (!reason) {
        e.target.value = status; // cancelou
        return;
      }
    }

    startTransition(async () => {
      setError(undefined);
      const res = await setReimbursementStatus(id, next, reason);
      if (!res.ok) {
        setError(res.error ?? "Erro ao alterar status.");
        e.target.value = status;
      } else {
        router.refresh();
      }
    });
  }

  // Pago/Conciliado: estados "fechados". Para alterar, usar a tela de detalhe.
  if (locked) {
    return (
      <span title="Para alterar, abra a solicitação em “Ver”.">
        <StatusBadge status={status} />
      </span>
    );
  }

  return (
    <div>
      <select
        defaultValue={status}
        onChange={onChange}
        disabled={pending}
        className="rounded-md border border-hairline bg-surface px-2 py-1 text-xs font-medium text-ink focus:outline-none focus:ring-1 focus:ring-brand disabled:opacity-60"
      >
        {STATUS_ORDER.map((s) => (
          <option key={s} value={s}>
            {STATUS_LABELS[s]}
          </option>
        ))}
      </select>
      {error && <p className="mt-1 text-xs text-rose-600">{error}</p>}
    </div>
  );
}
