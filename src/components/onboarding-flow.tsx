"use client";

import Image from "next/image";
import { useActionState, useEffect, useState } from "react";
import {
  changePasswordAction,
  confirmMfaAction,
  startMfaSetup,
} from "@/actions/onboarding";
import { initialActionState } from "@/lib/action-state";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";

export function OnboardingFlow({
  needsPassword,
  needsMfa,
}: {
  needsPassword: boolean;
  needsMfa: boolean;
}) {
  const [step, setStep] = useState<"password" | "mfa">(
    needsPassword ? "password" : "mfa",
  );

  if (step === "password") {
    return (
      <PasswordStep
        onDone={() => (needsMfa ? setStep("mfa") : finish())}
      />
    );
  }
  return <MfaStep />;
}

function finish() {
  // Recarrega para o middleware reavaliar os claims já atualizados.
  window.location.href = "/admin";
}

function PasswordStep({ onDone }: { onDone: () => void }) {
  const [state, formAction, pending] = useActionState(
    changePasswordAction,
    initialActionState,
  );

  useEffect(() => {
    if (state.ok) onDone();
  }, [state.ok, onDone]);

  return (
    <form action={formAction} className="space-y-4">
      <p className="text-sm font-medium text-ink">
        1. Defina uma nova senha
      </p>
      <Field
        label="Senha temporária"
        htmlFor="currentPassword"
        required
        error={state.fieldErrors?.currentPassword}
      >
        <Input
          id="currentPassword"
          name="currentPassword"
          type="password"
          autoComplete="current-password"
          required
        />
      </Field>
      <Field
        label="Nova senha"
        htmlFor="newPassword"
        required
        error={state.fieldErrors?.newPassword}
      >
        <Input
          id="newPassword"
          name="newPassword"
          type="password"
          autoComplete="new-password"
          required
        />
      </Field>
      <Field
        label="Confirme a nova senha"
        htmlFor="confirmPassword"
        required
        error={state.fieldErrors?.confirmPassword}
      >
        <Input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          required
        />
      </Field>
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "Salvando…" : "Salvar senha"}
      </Button>
    </form>
  );
}

function MfaStep() {
  const [setup, setSetup] = useState<{ qr: string; secret: string } | null>(
    null,
  );
  const [loadError, setLoadError] = useState<string>();
  const [state, formAction, pending] = useActionState(
    confirmMfaAction,
    initialActionState,
  );

  useEffect(() => {
    let active = true;
    startMfaSetup()
      .then((data) => {
        if (active) setSetup(data);
      })
      .catch(() => {
        if (active) setLoadError("Não foi possível gerar o QR Code.");
      });
    return () => {
      active = false;
    };
  }, []);

  // MFA confirmado: vai para o login (o token atual está defasado; o novo login
  // já virá com os claims certos e exigirá senha + código TOTP).
  useEffect(() => {
    if (state.ok) window.location.href = "/admin/login?setup=ok";
  }, [state.ok]);

  return (
    <div className="space-y-4">
      <p className="text-sm font-medium text-ink">
        2. Configure o aplicativo autenticador
      </p>
      <p className="text-sm text-ink-muted">
        Escaneie o QR Code no Google Authenticator (ou Microsoft Authenticator) e
        informe o código gerado.
      </p>

      {loadError && (
        <p className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {loadError}
        </p>
      )}

      {setup ? (
        <>
          <div className="flex justify-center">
            <Image
              src={setup.qr}
              alt="QR Code do autenticador"
              width={200}
              height={200}
              unoptimized
              className="rounded-2xl border border-hairline"
            />
          </div>
          <p className="text-center text-xs text-ink-muted">
            Não consegue escanear? Use este código:
            <br />
            <span className="font-mono text-sm tracking-wider text-ink">
              {setup.secret}
            </span>
          </p>

          <form action={formAction} className="space-y-3">
            <Field
              label="Código do autenticador"
              htmlFor="totp"
              required
              error={state.fieldErrors?.totp}
            >
              <Input
                id="totp"
                name="totp"
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="\d{6}"
                maxLength={6}
                placeholder="000000"
                required
              />
            </Field>
            {state.error && (
              <p className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700">
                {state.error}
              </p>
            )}
            <Button type="submit" disabled={pending} className="w-full">
              {pending ? "Confirmando…" : "Ativar MFA e entrar"}
            </Button>
          </form>
        </>
      ) : (
        !loadError && (
          <p className="text-center text-sm text-ink-faint">Gerando QR Code…</p>
        )
      )}
    </div>
  );
}
