"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { db } from "@/db";
import { users } from "@/db/schema";
import { createUserSchema, updateUserSchema } from "@/lib/validators";
import { randomTempPassword } from "@/lib/mfa";
import { requireUser, zodFieldErrors } from "@/lib/action-utils";

const PATH = "/admin/usuarios";

export type UserActionState = {
  ok: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
  /** Senha temporária gerada — exibida uma única vez para o admin repassar. */
  tempPassword?: string;
};

export async function createUser(
  _prev: UserActionState,
  formData: FormData,
): Promise<UserActionState> {
  await requireUser();
  const parsed = createUserSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    roleId: formData.get("roleId"),
  });
  if (!parsed.success) {
    return {
      ok: false,
      fieldErrors: zodFieldErrors(parsed.error.flatten().fieldErrors),
    };
  }

  const existing = (
    await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, parsed.data.email))
      .limit(1)
  )[0];
  if (existing) {
    return { ok: false, fieldErrors: { email: "Email já cadastrado." } };
  }

  const tempPassword = randomTempPassword();
  const passwordHash = await bcrypt.hash(tempPassword, 10);
  await db.insert(users).values({
    name: parsed.data.name,
    email: parsed.data.email,
    roleId: parsed.data.roleId,
    passwordHash,
    mustChangePassword: true,
    mfaEnabled: false,
    active: true,
  });

  revalidatePath(PATH);
  return { ok: true, tempPassword };
}

export async function updateUser(
  id: number,
  _prev: UserActionState,
  formData: FormData,
): Promise<UserActionState> {
  await requireUser();
  const parsed = updateUserSchema.safeParse({
    name: formData.get("name"),
    roleId: formData.get("roleId"),
  });
  if (!parsed.success) {
    return {
      ok: false,
      fieldErrors: zodFieldErrors(parsed.error.flatten().fieldErrors),
    };
  }
  await db
    .update(users)
    .set({ name: parsed.data.name, roleId: parsed.data.roleId })
    .where(eq(users.id, id));
  revalidatePath(PATH);
  return { ok: true };
}

/** Reseta o acesso: nova senha temporária e zera o MFA (ex.: perdeu o autenticador). */
export async function resetUserAccess(id: number): Promise<UserActionState> {
  await requireUser();
  const tempPassword = randomTempPassword();
  const passwordHash = await bcrypt.hash(tempPassword, 10);
  await db
    .update(users)
    .set({
      passwordHash,
      mustChangePassword: true,
      mfaEnabled: false,
      totpSecret: null,
      mfaConfirmedAt: null,
    })
    .where(eq(users.id, id));
  revalidatePath(PATH);
  return { ok: true, tempPassword };
}

export async function toggleUserActive(
  id: number,
): Promise<{ ok: boolean; error?: string }> {
  const current = await requireUser();
  if (Number(current.id) === id) {
    return { ok: false, error: "Você não pode desativar o próprio usuário." };
  }
  const row = (
    await db
      .select({ active: users.active })
      .from(users)
      .where(eq(users.id, id))
      .limit(1)
  )[0];
  if (!row) return { ok: false, error: "Usuário não encontrado." };
  await db.update(users).set({ active: !row.active }).where(eq(users.id, id));
  revalidatePath(PATH);
  return { ok: true };
}
