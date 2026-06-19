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
