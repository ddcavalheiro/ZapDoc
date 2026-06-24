"use server";

import { revalidatePath } from "next/cache";
import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { roles, users } from "@/db/schema";
import { roleSchema } from "@/lib/validators";
import {
  requireUser,
  zodFieldErrors,
  type ActionState,
} from "@/lib/action-utils";

const PATH = "/admin/roles";

export async function createRole(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireUser();
  const parsed = roleSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description"),
  });
  if (!parsed.success) {
    return {
      ok: false,
      fieldErrors: zodFieldErrors(parsed.error.flatten().fieldErrors),
    };
  }
  const name = parsed.data.name.toUpperCase();
  const existing = (
    await db.select({ id: roles.id }).from(roles).where(eq(roles.name, name)).limit(1)
  )[0];
  if (existing) {
    return { ok: false, fieldErrors: { name: "Papel já existe." } };
  }
  await db
    .insert(roles)
    .values({ name, description: parsed.data.description || null });
  revalidatePath(PATH);
  return { ok: true };
}

export async function updateRole(
  id: number,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireUser();
  const parsed = roleSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description"),
  });
  if (!parsed.success) {
    return {
      ok: false,
      fieldErrors: zodFieldErrors(parsed.error.flatten().fieldErrors),
    };
  }
  await db
    .update(roles)
    .set({
      name: parsed.data.name.toUpperCase(),
      description: parsed.data.description || null,
    })
    .where(eq(roles.id, id));
  revalidatePath(PATH);
  return { ok: true };
}

export async function deleteRole(
  id: number,
): Promise<{ ok: boolean; error?: string }> {
  await requireUser();
  const role = (
    await db.select().from(roles).where(eq(roles.id, id)).limit(1)
  )[0];
  if (!role) return { ok: false, error: "Papel não encontrado." };
  if (role.name === "ADMIN") {
    return { ok: false, error: "O papel ADMIN não pode ser removido." };
  }
  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(users)
    .where(eq(users.roleId, id));
  if (count > 0) {
    return { ok: false, error: "Há usuários vinculados a este papel." };
  }
  await db.delete(roles).where(eq(roles.id, id));
  revalidatePath(PATH);
  return { ok: true };
}
