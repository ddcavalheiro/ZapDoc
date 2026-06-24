"use server";

import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import QRCode from "qrcode";
import { db } from "@/db";
import { users } from "@/db/schema";
import { auth } from "@/lib/auth";
import {
  encryptSecret,
  decryptSecret,
  generateTotpSecret,
  totpUri,
  verifyTotp,
} from "@/lib/mfa";
import { changePasswordSchema } from "@/lib/validators";
import {
  zodFieldErrors,
  type ActionState,
} from "@/lib/action-utils";

async function currentUser() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Não autorizado.");
  const user = (
    await db
      .select()
      .from(users)
      .where(eq(users.id, Number(session.user.id)))
      .limit(1)
  )[0];
  if (!user) throw new Error("Usuário não encontrado.");
  return user;
}

/** Passo 1 do onboarding: troca a senha temporária pela definitiva. */
export async function changePasswordAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const user = await currentUser();

    const parsed = changePasswordSchema.safeParse({
      currentPassword: formData.get("currentPassword"),
      newPassword: formData.get("newPassword"),
      confirmPassword: formData.get("confirmPassword"),
    });
    if (!parsed.success) {
      return {
        ok: false,
        fieldErrors: zodFieldErrors(parsed.error.flatten().fieldErrors),
      };
    }

    const ok = await bcrypt.compare(
      parsed.data.currentPassword,
      user.passwordHash,
    );
    if (!ok) {
      return {
        ok: false,
        fieldErrors: { currentPassword: "Senha atual incorreta." },
      };
    }

    const passwordHash = await bcrypt.hash(parsed.data.newPassword, 10);
    await db
      .update(users)
      .set({ passwordHash, mustChangePassword: false })
      .where(eq(users.id, user.id));

    // Sem refresh de token aqui: o onboarding continua na mesma sessão e a página
    // decide os passos pelo estado fresco do banco. O token é regenerado no
    // relogin ao final (após o MFA).
    return { ok: true };
  } catch (err) {
    console.error("changePasswordAction falhou:", err);
    return { ok: false, error: "Não foi possível salvar a senha. Tente novamente." };
  }
}

/**
 * Passo 2 do onboarding: gera (ou reaproveita) o segredo TOTP e devolve o QR Code.
 * O segredo é cifrado e persistido, mas o MFA só é ativado após a confirmação.
 */
export async function startMfaSetup(): Promise<{
  qr: string;
  secret: string;
}> {
  const user = await currentUser();
  if (user.mfaEnabled) {
    throw new Error("MFA já está configurado.");
  }

  let secret: string;
  let uri: string;
  if (user.totpSecret) {
    // Reaproveita o segredo pendente para o QR ficar estável entre recargas.
    secret = decryptSecret(user.totpSecret);
    uri = totpUri(secret, user.email);
  } else {
    ({ secret, uri } = generateTotpSecret(user.email));
    await db
      .update(users)
      .set({ totpSecret: encryptSecret(secret) })
      .where(eq(users.id, user.id));
  }

  const qr = await QRCode.toDataURL(uri);
  return { qr, secret };
}

/** Passo 2 (confirmação): valida o código e ativa o MFA. */
export async function confirmMfaAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const user = await currentUser();
    if (!user.totpSecret) {
      return { ok: false, error: "Gere o QR Code antes de confirmar." };
    }

    const code = String(formData.get("totp") ?? "").trim();
    const valid = verifyTotp(decryptSecret(user.totpSecret), code);
    if (!valid) {
      return {
        ok: false,
        fieldErrors: { totp: "Código inválido. Tente novamente." },
      };
    }

    await db
      .update(users)
      .set({ mfaEnabled: true, mfaConfirmedAt: new Date() })
      .where(eq(users.id, user.id));

    // Onboarding concluído. NÃO chamamos signOut aqui (ele faz fetch interno +
    // redirect e quebra dentro de uma action via useActionState). O cliente
    // redireciona para o login; o token defasado é descartado no novo login,
    // que já exigirá senha + código TOTP.
    return { ok: true };
  } catch (err) {
    console.error("confirmMfaAction falhou:", err);
    return { ok: false, error: "Não foi possível ativar o MFA. Tente novamente." };
  }
}
