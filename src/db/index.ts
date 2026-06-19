import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

type DB = PostgresJsDatabase<typeof schema>;

let _db: DB | null = null;

function getDb(): DB {
  if (_db) return _db;
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      "DATABASE_URL não definida. Configure no .env.local / Vercel.",
    );
  }
  // Supabase: usar a connection string do pooler (Supavisor, porta 6543) em
  // ambientes serverless. `prepare: false` é necessário no modo transaction.
  const client = postgres(connectionString, { prepare: false });
  _db = drizzle(client, { schema });
  return _db;
}

/**
 * Client Drizzle inicializado de forma preguiçosa, para não exigir
 * DATABASE_URL no momento do import (ex.: durante o build).
 */
export const db = new Proxy({} as DB, {
  get(_target, prop) {
    const instance = getDb();
    const value = instance[prop as keyof DB];
    return typeof value === "function" ? value.bind(instance) : value;
  },
});

export { schema };
