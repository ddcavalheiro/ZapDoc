"use client";

import { useActionState } from "react";
import { updateReimbursement } from "@/actions/reimbursements";
import { initialActionState } from "@/lib/action-state";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import type { Reimbursement } from "@/db/schema";

type Option = { id: number; name: string };

export function AdminEditForm({
  reimbursement: r,
  departments,
  expenseTypes,
}: {
  reimbursement: Reimbursement;
  departments: Option[];
  expenseTypes: Option[];
}) {
  const action = updateReimbursement.bind(null, r.id);
  const [state, formAction, pending] = useActionState(
    action,
    initialActionState,
  );
  const fe = state.fieldErrors ?? {};

  return (
    <form action={formAction} className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Nome" error={fe.requesterName} required>
          <Input name="requesterName" defaultValue={r.requesterName} />
        </Field>
        <Field label="Data da despesa" error={fe.expenseDate} required>
          <Input type="date" name="expenseDate" defaultValue={r.expenseDate} />
        </Field>
        <Field label="Departamento" error={fe.departmentId} required>
          <Select name="departmentId" defaultValue={String(r.departmentId)}>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Tipo de despesa" error={fe.expenseTypeId} required>
          <Select name="expenseTypeId" defaultValue={String(r.expenseTypeId)}>
            {expenseTypes.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Nome do fornecedor" error={fe.supplierName} required>
          <Input name="supplierName" defaultValue={r.supplierName} />
        </Field>
        <Field label="Nº documento fiscal" error={fe.fiscalDocNumber} required>
          <Input name="fiscalDocNumber" defaultValue={r.fiscalDocNumber} />
        </Field>
        <Field label="Valor (R$)" error={fe.amount} required>
          <Input
            type="number"
            step="0.01"
            min="0"
            name="amount"
            defaultValue={r.amount}
          />
        </Field>
        <Field label="Nome do recebedor" error={fe.payeeName} required>
          <Input name="payeeName" defaultValue={r.payeeName} />
        </Field>
      </div>

      <Field label="Descrição" error={fe.description} required>
        <Textarea name="description" defaultValue={r.description} />
      </Field>
      <Field label="Dados bancários / PIX" error={fe.paymentDetails} required>
        <Input name="paymentDetails" defaultValue={r.paymentDetails} />
      </Field>

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Salvando…" : "Salvar alterações"}
        </Button>
        {state.ok && !pending && (
          <span className="text-sm text-emerald-600">Alterações salvas.</span>
        )}
      </div>
    </form>
  );
}
