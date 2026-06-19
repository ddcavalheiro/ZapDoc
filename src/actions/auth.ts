"use server";

import { AuthError } from "next-auth";
import { signIn, signOut } from "@/lib/auth";
import type { ActionState } from "@/lib/action-utils";

export async function loginAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    await signIn("credentials", {
      email: formData.get("email"),
      password: formData.get("password"),
      redirectTo: "/admin",
    });
  } catch (error) {
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
