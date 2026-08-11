import { beforeEach, describe, expect, it, vi } from "vitest";
import type { DbCall } from "./helpers/db-mock";

// Mocks içados acima dos imports (exigência dos factories de vi.mock).
const h = vi.hoisted(() => {
  const calls: DbCall[] = [];
  const queue: unknown[] = [];
  const builder: unknown = new Proxy(function () {}, {
    get(_t, prop) {
      if (typeof prop === "symbol") return undefined;
      if (prop === "then") {
        return (resolve: (v: unknown) => void) =>
          resolve(queue.length ? queue.shift() : undefined);
      }
      return (...args: unknown[]) => {
        calls.push({ method: prop, args });
        return builder;
      };
    },
    apply: () => builder,
  });
  return {
    db: builder,
    calls,
    queue,
    auth: vi.fn(),
    revalidatePath: vi.fn(),
    del: vi.fn(),
    getWipeableCounts: vi.fn(),
  };
});

vi.mock("@/db", () => ({ db: h.db, schema: {} }));
vi.mock("@/lib/auth", () => ({ auth: h.auth }));
vi.mock("next/cache", () => ({ revalidatePath: h.revalidatePath }));
vi.mock("@vercel/blob", () => ({ del: h.del }));
vi.mock("@/db/queries", () => ({ getWipeableCounts: h.getWipeableCounts }));

const { wipeTransactionalData } = await import("@/actions/manutencao");
const { WIPE_CONFIRMATION } = await import("@/lib/wipe");
const { PgDialect } = await import("drizzle-orm/pg-core");

const dialect = new PgDialect();

/** Renderiza o SQL passado ao `db.execute` (o objeto do Drizzle é circular). */
function sqlExecutado(): string {
  const arg = h.calls.find((c) => c.method === "execute")?.args[0];
  if (!arg) return "";
  return dialect.sqlToQuery(arg as Parameters<typeof dialect.sqlToQuery>[0]).sql;
}

const form = (confirmacao: string) => {
  const fd = new FormData();
  fd.set("confirmacao", confirmacao);
  return fd;
};

/** Só o TRUNCATE passa por `execute`; serve de sentinela de "apagou algo". */
const truncou = () => h.calls.some((c) => c.method === "execute");

const COUNTS = {
  reimbursements: 6,
  notes: 7,
  attachments: 7,
  statusHistory: 12,
};

beforeEach(() => {
  h.calls.length = 0;
  h.queue.length = 0;
  vi.clearAllMocks();
  h.auth.mockResolvedValue({
    user: { email: "tesoureiro@example.com", role: "ADMIN" },
  });
  h.getWipeableCounts.mockResolvedValue(COUNTS);
});

describe("wipeTransactionalData — autorização", () => {
  it("recusa quando não há sessão", async () => {
    h.auth.mockResolvedValue(null);
    await expect(
      wipeTransactionalData({ ok: false }, form(WIPE_CONFIRMATION)),
    ).rejects.toThrow("Não autorizado.");
    expect(truncou()).toBe(false);
    expect(h.del).not.toHaveBeenCalled();
  });

  it("recusa usuário logado que não é ADMIN", async () => {
    h.auth.mockResolvedValue({
      user: { email: "aux@example.com", role: "TESOUREIRO" },
    });
    await expect(
      wipeTransactionalData({ ok: false }, form(WIPE_CONFIRMATION)),
    ).rejects.toThrow("Não autorizado.");
    expect(truncou()).toBe(false);
    expect(h.del).not.toHaveBeenCalled();
  });
});

describe("wipeTransactionalData — confirmação", () => {
  it("não apaga nada quando a palavra está errada", async () => {
    const out = await wipeTransactionalData({ ok: false }, form("limpar"));
    expect(out.ok).toBe(false);
    expect(out.fieldErrors?.confirmacao).toContain(WIPE_CONFIRMATION);
    expect(truncou()).toBe(false);
    expect(h.del).not.toHaveBeenCalled();
  });

  it("não apaga nada quando o campo vem vazio", async () => {
    const out = await wipeTransactionalData({ ok: false }, form(""));
    expect(out.ok).toBe(false);
    expect(truncou()).toBe(false);
    expect(h.del).not.toHaveBeenCalled();
  });
});

describe("wipeTransactionalData — execução", () => {
  it("apaga as tabelas transacionais e as fotos do storage", async () => {
    h.queue.push([{ url: "https://blob/a.jpg" }, { url: "https://blob/b.jpg" }]);
    const out = await wipeTransactionalData(
      { ok: false },
      form(WIPE_CONFIRMATION),
    );

    expect(out.ok).toBe(true);
    expect(truncou()).toBe(true);
    expect(h.del).toHaveBeenCalledWith([
      "https://blob/a.jpg",
      "https://blob/b.jpg",
    ]);
    expect(out.summary).toEqual({
      ...COUNTS,
      blobsDeleted: 2,
      blobsFailed: 0,
    });
  });

  it("preserva os cadastros: o TRUNCATE não cita as tabelas de cadastro", async () => {
    h.queue.push([]);
    await wipeTransactionalData({ ok: false }, form(WIPE_CONFIRMATION));

    const query = sqlExecutado();
    for (const t of ["departments", "expense_types", "users", "roles"]) {
      expect(query).not.toContain(`"${t}"`);
    }
    for (const t of [
      "reimbursements",
      "notes",
      "note_attachments",
      "status_history",
    ]) {
      expect(query).toContain(`"${t}"`);
    }
  });

  it("reinicia a numeração (restart identity)", async () => {
    h.queue.push([]);
    await wipeTransactionalData({ ok: false }, form(WIPE_CONFIRMATION));
    expect(sqlExecutado().toLowerCase()).toContain("restart identity");
  });

  it("limpa o banco mesmo se a remoção dos blobs falhar", async () => {
    h.queue.push([{ url: "https://blob/a.jpg" }]);
    h.del.mockRejectedValue(new Error("blob fora do ar"));

    const out = await wipeTransactionalData(
      { ok: false },
      form(WIPE_CONFIRMATION),
    );

    expect(out.ok).toBe(true);
    expect(truncou()).toBe(true);
    expect(out.summary?.blobsFailed).toBe(1);
    expect(out.summary?.blobsDeleted).toBe(0);
  });

  it("não chama o storage quando não há fotos", async () => {
    h.queue.push([]);
    const out = await wipeTransactionalData(
      { ok: false },
      form(WIPE_CONFIRMATION),
    );
    expect(h.del).not.toHaveBeenCalled();
    expect(out.summary?.blobsDeleted).toBe(0);
  });
});
