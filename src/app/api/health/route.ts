import { sql } from "drizzle-orm";
import { db } from "@/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Healthcheck + keepalive do banco.
 *
 * O plano free do Supabase pausa o projeto após ~7 dias sem atividade, e a
 * volta exige clicar em "Restore" no dashboard — enquanto isso toda página que
 * consulta dados devolve 500. Um cron diário batendo aqui executa uma query
 * trivial e zera esse contador de inatividade (ver `crons` no vercel.json).
 *
 * A Vercel envia `Authorization: Bearer $CRON_SECRET` automaticamente nas
 * chamadas de cron quando a env var `CRON_SECRET` existe no projeto. Sem ela
 * configurada o endpoint recusa tudo (fail closed) — assim uma env var
 * esquecida nunca deixa a rota aberta executando query a cada requisição.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return Response.json(
      { ok: false, error: "CRON_SECRET não configurada" },
      { status: 503 },
    );
  }
  if (request.headers.get("authorization") !== `Bearer ${secret}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  const startedAt = Date.now();
  try {
    await db.execute(sql`select 1`);
    return Response.json({
      ok: true,
      db: "up",
      latencyMs: Date.now() - startedAt,
      checkedAt: new Date().toISOString(),
    });
  } catch (error) {
    // O corpo do erro do driver pode conter a connection string; logamos só a
    // mensagem no servidor e devolvemos algo genérico.
    console.error("[health] falha ao consultar o banco:", error);
    return Response.json(
      { ok: false, db: "down", latencyMs: Date.now() - startedAt },
      { status: 503 },
    );
  }
}
