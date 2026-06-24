import { config } from "dotenv";
config({ path: ".env.local" });

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import * as schema from "../src/db/schema";

const { users, roles, departments, expenseTypes } = schema;

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL não definida.");

  const client = postgres(url, { prepare: false });
  const db = drizzle(client, { schema });

  // Papel ADMIN (único papel hoje; acesso uniforme no backend).
  let adminRole = (
    await db.select().from(roles).where(eq(roles.name, "ADMIN")).limit(1)
  )[0];
  if (!adminRole) {
    adminRole = (
      await db
        .insert(roles)
        .values({ name: "ADMIN", description: "Acesso administrativo completo" })
        .returning()
    )[0];
    console.log("Papel ADMIN criado.");
  }

  // Admin
  const email = (process.env.ADMIN_EMAIL ?? "").toLowerCase().trim();
  const password = process.env.ADMIN_PASSWORD ?? "";
  const name = process.env.ADMIN_NAME ?? "Tesoureiro";
  if (!email || !password) {
    throw new Error("Defina ADMIN_EMAIL e ADMIN_PASSWORD no .env.local.");
  }

  const existing = (
    await db.select().from(users).where(eq(users.email, email)).limit(1)
  )[0];

  if (existing) {
    console.log(`Admin já existe: ${email}`);
  } else {
    const passwordHash = await bcrypt.hash(password, 10);
    // mustChangePassword=true: a senha do seed é temporária; troca + MFA no 1º acesso.
    await db.insert(users).values({
      email,
      passwordHash,
      name,
      roleId: adminRole.id,
      mustChangePassword: true,
    });
    console.log(`Admin criado: ${email}`);
  }

  // Cadastros iniciais (apenas se vazios)
  const deptCount = (await db.select().from(departments)).length;
  if (deptCount === 0) {
    await db.insert(departments).values([
      { name: "Administrativo" },
      { name: "Eventos" },
      { name: "Projetos Sociais" },
    ]);
    console.log("Departamentos iniciais criados.");
  }

  const typeCount = (await db.select().from(expenseTypes)).length;
  if (typeCount === 0) {
    await db.insert(expenseTypes).values([
      { name: "Alimentação" },
      { name: "Transporte" },
      { name: "Material de escritório" },
      { name: "Hospedagem" },
      { name: "Outros" },
    ]);
    console.log("Tipos de despesa iniciais criados.");
  }

  console.log("Seed concluído.");
  await client.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
