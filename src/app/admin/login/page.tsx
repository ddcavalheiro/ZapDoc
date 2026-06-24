"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { loginAction, type LoginState } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";

const initialLoginState: LoginState = { ok: false };

export default function LoginPage() {
  const [state, formAction, pending] = useActionState(
    loginAction,
    initialLoginState,
  );
  // Email/senha controlados para sobreviverem entre os passos (vão em campos
  // ocultos no passo do código).
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Lê o ?setup=ok só no cliente (pós-hidratação) para não causar mismatch.
  const [setupDone, setSetupDone] = useState(false);
  useEffect(() => {
    const ok =
      new URLSearchParams(window.location.search).get("setup") === "ok";
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (ok) setSetupDone(true);
  }, []);

  const showTotp = state.needsTotp;

  // Campo do código: foco automático ao entrar nesta etapa e validação só no blur.
  const [totp, setTotp] = useState("");
  const [totpTouched, setTotpTouched] = useState(false);
  const totpRef = useRef<HTMLInputElement>(null);

  // Limpa o campo ao entrar na etapa do código (ajuste de estado na render).
  const [lastShowTotp, setLastShowTotp] = useState(showTotp);
  if (showTotp !== lastShowTotp) {
    setLastShowTotp(showTotp);
    if (showTotp) {
      setTotp("");
      setTotpTouched(false);
    }
  }

  // Foco automático no campo do código (DOM, fora do ciclo de estado).
  useEffect(() => {
    if (showTotp) totpRef.current?.focus();
  }, [showTotp]);

  // Erro de formato só aparece depois que o usuário sai do campo.
  const totpFormatError =
    totpTouched && !/^\d{6}$/.test(totp) ? "Código inválido." : undefined;
  const totpError = totpFormatError ?? state.error;

  return (
    <main className="flex flex-1 items-center justify-center px-4 py-16">
      <div className="w-full max-w-sm rounded-2xl border border-hairline bg-surface p-6 shadow-sm">
        <h1 className="text-xl font-bold text-ink">ZapDoc</h1>
        <p className="mb-6 text-sm text-ink-muted">Área administrativa</p>

        {setupDone && !showTotp && (
          <p className="mb-4 rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
            Conta configurada! Entre com sua nova senha.
          </p>
        )}

        <form action={formAction} className="space-y-4">
          {showTotp ? (
            <>
              {/* Passo 2: apenas o código (email/senha seguem ocultos). */}
              <input type="hidden" name="email" value={email} />
              <input type="hidden" name="password" value={password} />
              <p className="text-sm text-ink-muted">
                Verificação em duas etapas para{" "}
                <span className="font-medium text-ink">{email}</span>.
              </p>
              <Field
                label="Código do autenticador"
                htmlFor="totp"
                required
                error={totpError}
              >
                <Input
                  id="totp"
                  name="totp"
                  ref={totpRef}
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  pattern="\d{6}"
                  maxLength={6}
                  placeholder="000000"
                  value={totp}
                  onChange={(e) =>
                    setTotp(e.target.value.replace(/\D/g, "").slice(0, 6))
                  }
                  onBlur={() => setTotpTouched(true)}
                  required
                />
              </Field>
              <Button type="submit" disabled={pending} className="w-full">
                {pending ? "Confirmando…" : "Confirmar código"}
              </Button>
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="w-full text-sm text-ink-muted hover:text-ink hover:underline"
              >
                Voltar
              </button>
            </>
          ) : (
            <>
              {/* Passo 1: email e senha. */}
              <Field label="Email" htmlFor="email" required>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </Field>
              <Field label="Senha" htmlFor="password" required>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
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
            </>
          )}
        </form>
      </div>
    </main>
  );
}
