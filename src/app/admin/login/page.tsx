"use client";

import { useActionState } from "react";
import { loginAction } from "@/actions/auth";
import { initialActionState } from "@/lib/action-state";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";

export default function LoginPage() {
  const [state, formAction, pending] = useActionState(
    loginAction,
    initialActionState,
  );

  return (
    <main className="flex flex-1 items-center justify-center px-4 py-16">
      <div className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-xl font-bold text-slate-900">ZapDoc</h1>
        <p className="mb-6 text-sm text-slate-500">Área do tesoureiro</p>

        <form action={formAction} className="space-y-4">
          <Field label="Email" htmlFor="email" required>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
            />
          </Field>
          <Field label="Senha" htmlFor="password" required>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
            />
          </Field>

          {state.error && (
            <p className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {state.error}
            </p>
          )}

          <Button type="submit" disabled={pending} className="w-full">
            {pending ? "Entrando…" : "Entrar"}
          </Button>
        </form>
      </div>
    </main>
  );
}
