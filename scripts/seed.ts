import { config } from "dotenv";
config({ path: ".env.local" });

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import * as schema from "../src/db/schema";

const { users, departments, expenseTypes } = schema;

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL não definida.");

  const client = postgres(url, { prepare: false });
  const db = drizzle(client, { schema });

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
    await db.insert(users).values({ email, passwordHash, name });
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
