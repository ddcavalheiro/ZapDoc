"use client";

import { useActionState, useState } from "react";
import { changeStatus } from "@/actions/reimbursements";
import { initialActionState } from "@/lib/action-state";
import { Button } from "@/components/ui/button";
import { Field, Select, Textarea } from "@/components/ui/field";
import {
  STATUS,
  STATUS_LABELS,
  STATUS_ORDER,
  type Status,
} from "@/lib/status";

export function StatusForm({
  id,
  current,
}: {
  id: number;
  current: Status;
}) {
  const action = changeStatus.bind(null, id);
  const [state, formAction, pending] = useActionState(
    action,
    initialActionState,
  );
  const [selected, setSelected] = useState<Status>(current);

  return (
    <form action={formAction} className="space-y-3">
      <Field label="Alterar status" error={state.fieldErrors?.status}>
        <Select
          name="status"
          value={selected}
          onChange={(e) => setSelected(e.target.value as Status)}
        >
          {STATUS_ORDER.map((s) => (
            <option key={s} value={s}>
              {STATUS_LABELS[s]}
            </option>
          ))}
        </Select>
      </Field>

      {selected === STATUS.RECUSADO && (
        <Field
          label="Motivo da recusa"
          error={state.fieldErrors?.reason}
          required
        >
          <Textarea name="reason" placeholder="Explique o motivo" />
        </Field>
      )}

      {state.error && <p className="text-sm text-rose-600">{state.error}</p>}

      <Button type="submit" disabled={pending}>
        {pending ? "Aplicando…" : "Aplicar status"}
      </Button>
    </form>
  );
}
