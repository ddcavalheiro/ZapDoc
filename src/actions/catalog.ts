"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { departments, expenseTypes } from "@/db/schema";
import { catalogSchema } from "@/lib/validators";
import {
  requireUser,
  zodFieldErrors,
  type ActionState,
} from "@/lib/action-utils";

const tables = { department: departments, expenseType: expenseTypes } as const;
type CatalogKind = keyof typeof tables;

function pathFor(kind: CatalogKind) {
  return kind === "department"
    ? "/admin/departamentos"
    : "/admin/tipos-despesa";
}

export async function createCatalogItem(
  kind: CatalogKind,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireUser();
  const parsed = catalogSchema.safeParse({
    name: formData.get("name"),
    active: true,
  });
  if (!parsed.success) {
    return {
      ok: false,
      fieldErrors: zodFieldErrors(parsed.error.flatten().fieldErrors),
    };
  }
  await db.insert(tables[kind]).values({ name: parsed.data.name });
  revalidatePath(pathFor(kind));
  return { ok: true };
}

export async function updateCatalogItem(
  kind: CatalogKind,
  id: number,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireUser();
  const parsed = catalogSchema.safeParse({
    name: formData.get("name"),
    active: formData.get("active") === "on" || formData.get("active") === "true",
  });
  if (!parsed.success) {
    return {
      ok: false,
      fieldErrors: zodFieldErrors(parsed.error.flatten().fieldErrors),
    };
  }
  await db
    .update(tables[kind])
    .set({ name: parsed.data.name, active: parsed.data.active })
    .where(eq(tables[kind].id, id));
  revalidatePath(pathFor(kind));
  return { ok: true };
}

export async function toggleCatalogItem(kind: CatalogKind, id: number) {
  await requireUser();
  const table = tables[kind];
  const current = (
    await db.select().from(table).where(eq(table.id, id)).limit(1)
  )[0];
  if (!current) return;
  await db
    .update(table)
    .set({ active: !current.active })
    .where(eq(table.id, id));
  revalidatePath(pathFor(kind));
}
