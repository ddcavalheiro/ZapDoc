import "server-only";
import { auth } from "@/lib/auth";

export type { ActionState } from "@/lib/action-state";

/** Garante que há sessão de tesoureiro; lança se não houver. */
export async function requireUser() {
  const session = await auth();
  if (!session?.user) {
    throw new Error("Não autorizado.");
  }
  return session.user;
}

/** Nome do perfil com acesso às operações destrutivas (ver seed). */
export const ADMIN_ROLE = "ADMIN";

/**
 * Garante sessão **e** perfil ADMIN. Usar em operações destrutivas — o
 * `requireUser` sozinho só checa se existe sessão, o que liberaria qualquer
 * usuário logado.
 */
export async function requireAdmin() {
  const user = await requireUser();
  if (user.role !== ADMIN_ROLE) {
    throw new Error("Não autorizado.");
  }
  return user;
}

/** Converte os erros do zod (flatten) no formato de fieldErrors. */
export function zodFieldErrors(
  flattened: Record<string, string[] | undefined>,
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, msgs] of Object.entries(flattened)) {
    if (msgs && msgs.length) out[key] = msgs[0];
  }
  return out;
}
