"use server";

import { AuthError, CredentialsSignin } from "next-auth";
import { signIn, signOut } from "@/lib/auth";

export type LoginState = {
  ok: boolean;
  error?: string;
  /** Senha correta; falta o código do autenticador (revela o campo na UI). */
  needsTotp?: boolean;
};

export async function loginAction(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  try {
    await signIn("credentials", {
      email: formData.get("email"),
      password: formData.get("password"),
      totp: formData.get("totp"),
      redirectTo: "/admin",
    });
  } catch (error) {
    if (error instanceof CredentialsSignin) {
      if (error.code === "mfa_required") {
        return { ok: false, needsTotp: true };
      }
      if (error.code === "invalid_totp") {
        return { ok: false, needsTotp: true, error: "Código inválido." };
      }
      return { ok: false, error: "Email ou senha inválidos." };
    }
    if (error instanceof AuthError) {
      return { ok: false, error: "Email ou senha inválidos." };
    }
    throw error; // redirect interno do Next precisa ser repropagado
  }
  return { ok: true };
}

export async function logoutAction() {
  await signOut({ redirectTo: "/admin/login" });
}
