"use client";

import { useActionState, useState, useTransition } from "react";
import {
  createUser,
  updateUser,
  resetUserAccess,
  toggleUserActive,
  type UserActionState,
} from "@/actions/users";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/field";

type Role = { id: number; name: string };
type UserRow = {
  id: number;
  name: string;
  email: string;
  roleId: number;
  roleName: string | null;
  active: boolean;
  mfaEnabled: boolean;
  mustChangePassword: boolean;
};

const initial: UserActionState = { ok: false };

export function UsersManager({
  users,
  roles,
}: {
  users: UserRow[];
  roles: Role[];
}) {
  const [state, formAction, pending] = useActionState(createUser, initial);
  const [showForm, setShowForm] = useState(false);

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-bold text-ink">Usuários</h1>
        <Button size="sm" onClick={() => setShowForm((v) => !v)}>
          {showForm ? "Fechar" : "Novo usuário"}
        </Button>
      </div>

      {showForm && (
        <form
          action={formAction}
          className="mb-6 grid gap-3 rounded-2xl border border-hairline bg-surface p-4 sm:grid-cols-3"
        >
          <Field label="Nome" htmlFor="name" required error={state.fieldErrors?.name}>
            <Input id="name" name="name" required />
          </Field>
          <Field
            label="Email"
            htmlFor="email"
            required
            error={state.fieldErrors?.email}
          >
            <Input id="email" name="email" type="email" required />
          </Field>
          <Field
            label="Papel"
            htmlFor="roleId"
            required
            error={state.fieldErrors?.roleId}
          >
            <Select id="roleId" name="roleId" required defaultValue="">
              <option value="" disabled>
                Selecione…
              </option>
              {roles.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </Select>
          </Field>
          <div className="sm:col-span-3">
            <Button type="submit" disabled={pending}>
              {pending ? "Criando…" : "Criar usuário"}
            </Button>
          </div>
        </form>
      )}

      {state.ok && state.tempPassword && (
        <TempPasswordBanner password={state.tempPassword} />
      )}

      <ul className="divide-y divide-hairline rounded-2xl border border-hairline bg-surface">
        {users.map((u) => (
          <UserRowItem key={u.id} user={u} roles={roles} />
        ))}
        {users.length === 0 && (
          <li className="px-4 py-6 text-center text-sm text-ink-faint">
            Nenhum usuário cadastrado.
          </li>
        )}
      </ul>
    </div>
  );
}

function statusBadge(u: UserRow) {
  if (!u.active)
    return { label: "Inativo", cls: "bg-[#eef1e9] text-ink-muted" };
  if (u.mustChangePassword || !u.mfaEnabled)
    return { label: "Pendente (1º acesso)", cls: "bg-amber-100 text-amber-700" };
  return { label: "Ativo", cls: "bg-emerald-100 text-emerald-700" };
}

function UserRowItem({ user, roles }: { user: UserRow; roles: Role[] }) {
  const [editing, setEditing] = useState(false);
  const [pending, startTransition] = useTransition();
  const [tempPassword, setTempPassword] = useState<string>();
  const [error, setError] = useState<string>();
  const [editState, editAction, editPending] = useActionState(
    updateUser.bind(null, user.id),
    initial,
  );

  const badge = statusBadge(user);

  function reset() {
    setError(undefined);
    startTransition(async () => {
      const res = await resetUserAccess(user.id);
      if (res.ok) setTempPassword(res.tempPassword);
      else setError(res.error ?? "Erro ao resetar.");
    });
  }

  function toggle() {
    setError(undefined);
    startTransition(async () => {
      const res = await toggleUserActive(user.id);
      if (!res.ok) setError(res.error);
    });
  }

  return (
    <li className="px-4 py-3">
      {editing ? (
        <form action={editAction} className="grid gap-3 sm:grid-cols-3">
          <Field label="Nome" required error={editState.fieldErrors?.name}>
            <Input name="name" defaultValue={user.name} required />
          </Field>
          <Field label="Papel" required error={editState.fieldErrors?.roleId}>
            <Select name="roleId" defaultValue={String(user.roleId)} required>
              {roles.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </Select>
          </Field>
          <div className="flex items-end gap-2 sm:col-span-3">
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
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate font-medium text-ink">{user.name}</p>
            <p className="truncate text-sm text-ink-muted">{user.email}</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <span className="rounded-full bg-[#eef1e9] px-2 py-0.5 text-xs text-ink-muted">
              {user.roleName ?? "—"}
            </span>
            <span className={`rounded-full px-2 py-0.5 text-xs ${badge.cls}`}>
              {badge.label}
            </span>
            <button
              onClick={() => setEditing(true)}
              className="text-sm text-brand hover:underline"
            >
              Editar
            </button>
            <button
              onClick={reset}
              disabled={pending}
              className="text-sm text-ink-muted hover:underline disabled:opacity-50"
            >
              Resetar acesso
            </button>
            <button
              onClick={toggle}
              disabled={pending}
              className="text-sm text-ink-muted hover:underline disabled:opacity-50"
            >
              {user.active ? "Desativar" : "Ativar"}
            </button>
          </div>
        </div>
      )}

      {error && <p className="mt-2 text-sm text-rose-600">{error}</p>}
      {tempPassword && (
        <div className="mt-2">
          <TempPasswordBanner password={tempPassword} />
        </div>
      )}
    </li>
  );
}

function TempPasswordBanner({ password }: { password: string }) {
  return (
    <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
      Senha temporária (mostrada só agora — repasse ao usuário):{" "}
      <span className="font-mono font-semibold tracking-wider">{password}</span>
    </div>
  );
}
