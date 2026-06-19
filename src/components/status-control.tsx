"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setReimbursementStatus } from "@/actions/reimbursements";
import {
  STATUS,
  STATUS_LABELS,
  STATUS_ORDER,
  type Status,
} from "@/lib/status";

export function StatusControl({
  id,
  status,
}: {
  id: number;
  status: Status;
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

  return (
    <div>
      <select
        defaultValue={status}
        onChange={onChange}
        disabled={pending}
        className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-500 disabled:opacity-60"
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
