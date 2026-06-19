"use client";

import { useState, useTransition } from "react";
import {
  createCatalogItem,
  toggleCatalogItem,
  updateCatalogItem,
} from "@/actions/catalog";
import { initialActionState } from "@/lib/action-state";
import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";

type Kind = "department" | "expenseType";
type Item = { id: number; name: string; active: boolean };

export function CatalogManager({
  kind,
  items,
  title,
  placeholder,
}: {
  kind: Kind;
  items: Item[];
  title: string;
  placeholder: string;
}) {
  const createAction = createCatalogItem.bind(null, kind);
  const [state, formAction, pending] = useActionState(
    createAction,
    initialActionState,
  );

  return (
    <div>
      <h1 className="mb-4 text-xl font-bold text-slate-900">{title}</h1>

      <form
        action={formAction}
        className="mb-6 flex flex-col gap-2 rounded-lg border border-slate-200 bg-white p-4 sm:flex-row"
      >
        <div className="flex-1">
          <Input name="name" placeholder={placeholder} />
          {state.fieldErrors?.name && (
            <p className="mt-1 text-sm text-rose-600">
              {state.fieldErrors.name}
            </p>
          )}
        </div>
        <Button type="submit" disabled={pending}>
          {pending ? "Adicionando…" : "Adicionar"}
        </Button>
      </form>

      <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200 bg-white">
        {items.map((item) => (
          <CatalogRow key={item.id} kind={kind} item={item} />
        ))}
        {items.length === 0 && (
          <li className="px-4 py-6 text-center text-sm text-slate-400">
            Nenhum item cadastrado.
          </li>
        )}
      </ul>
    </div>
  );
}

function CatalogRow({ kind, item }: { kind: Kind; item: Item }) {
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();

  // revalidatePath nas actions já atualiza a lista (server component).
  function save(formData: FormData) {
    startTransition(async () => {
      setError(undefined);
      const res = await updateCatalogItem(
        kind,
        item.id,
        initialActionState,
        formData,
      );
      if (res.ok) setEditing(false);
      else setError(res.fieldErrors?.name ?? "Erro ao salvar.");
    });
  }

  function toggle() {
    startTransition(() => toggleCatalogItem(kind, item.id));
  }

  return (
    <li className="px-4 py-3">
      {editing ? (
        <form action={save} className="flex flex-col gap-2 sm:flex-row">
          <input type="hidden" name="active" value={String(item.active)} />
          <div className="flex-1">
            <Input name="name" defaultValue={item.name} />
            {error && <p className="mt-1 text-sm text-rose-600">{error}</p>}
          </div>
          <div className="flex gap-2">
            <Button type="submit" size="sm" disabled={pending}>
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
          <span
            className={
              item.active ? "text-slate-800" : "text-slate-400 line-through"
            }
          >
            {item.name}
          </span>
          <div className="flex items-center gap-3">
            <span
              className={`rounded-full px-2 py-0.5 text-xs ${
                item.active
                  ? "bg-emerald-100 text-emerald-700"
                  : "bg-slate-100 text-slate-500"
              }`}
            >
              {item.active ? "Ativo" : "Inativo"}
            </span>
            <button
              onClick={toggle}
              disabled={pending}
              className="text-sm text-slate-500 hover:underline disabled:opacity-50"
            >
              {item.active ? "Desativar" : "Ativar"}
            </button>
            <button
              onClick={() => setEditing(true)}
              className="text-sm text-slate-700 hover:underline"
            >
              Editar
            </button>
          </div>
        </div>
      )}
    </li>
  );
}
