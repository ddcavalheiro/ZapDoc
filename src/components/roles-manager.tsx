"use client";

import { useActionState, useState, useTransition } from "react";
import { createRole, updateRole, deleteRole } from "@/actions/roles";
import { initialActionState } from "@/lib/action-state";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";

type Role = { id: number; name: string; description: string | null };

export function RolesManager({ roles }: { roles: Role[] }) {
  const [state, formAction, pending] = useActionState(
    createRole,
    initialActionState,
  );

  return (
    <div>
      <h1 className="mb-1 text-xl font-bold text-ink">Perfis de Acesso</h1>
      <p className="mb-4 text-sm text-ink-muted">
        Hoje todos os usuários do backend têm o mesmo acesso. Perfis adicionais
        servem apenas de organização — ainda não diferenciam permissões.
      </p>

      <form
        action={formAction}
        className="mb-6 grid gap-3 rounded-2xl border border-hairline bg-surface p-4 sm:grid-cols-2"
      >
        <Field label="Nome" htmlFor="name" required error={state.fieldErrors?.name}>
          <Input id="name" name="name" placeholder="Ex.: AUDITOR" required />
        </Field>
        <Field label="Descrição" htmlFor="description">
          <Input id="description" name="description" />
        </Field>
        <div className="sm:col-span-2">
          <Button type="submit" disabled={pending}>
            {pending ? "Adicionando…" : "Adicionar perfil"}
          </Button>
        </div>
      </form>

      <ul className="divide-y divide-hairline rounded-2xl border border-hairline bg-surface">
        {roles.map((r) => (
          <RoleRow key={r.id} role={r} />
        ))}
      </ul>
    </div>
  );
}

function RoleRow({ role }: { role: Role }) {
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();
  const [editState, editAction, editPending] = useActionState(
    updateRole.bind(null, role.id),
    initialActionState,
  );
  const isAdmin = role.name === "ADMIN";

  function remove() {
    setError(undefined);
    startTransition(async () => {
      const res = await deleteRole(role.id);
      if (!res.ok) setError(res.error);
    });
  }

  return (
    <li className="px-4 py-3">
      {editing ? (
        <form action={editAction} className="grid gap-3 sm:grid-cols-2">
          <Field label="Nome" required error={editState.fieldErrors?.name}>
            <Input name="name" defaultValue={role.name} required />
          </Field>
          <Field label="Descrição">
            <Input name="description" defaultValue={role.description ?? ""} />
          </Field>
          <div className="flex gap-2 sm:col-span-2">
            <Button type="submit" size="sm" disabled={editPending}>
              Salvar
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setEditing(false)}
            >
              Cancelar
            </Button>
          </div>
        </form>
      ) : (
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="font-medium text-ink">{role.name}</p>
            {role.description && (
              <p className="text-sm text-ink-muted">{role.description}</p>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setEditing(true)}
              className="text-sm text-brand hover:underline"
            >
              Editar
            </button>
            {!isAdmin && (
              <button
                onClick={remove}
                disabled={pending}
                className="text-sm text-rose-600 hover:underline disabled:opacity-50"
              >
                Remover
              </button>
            )}
          </div>
        </div>
      )}
      {error && <p className="mt-2 text-sm text-rose-600">{error}</p>}
    </li>
  );
}
