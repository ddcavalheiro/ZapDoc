import { beforeEach, describe, expect, it, vi } from "vitest";
import type { DbCall } from "./helpers/db-mock";

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
  return { db: builder, calls, queue, auth: vi.fn(), revalidatePath: vi.fn() };
});

vi.mock("@/db", () => ({ db: h.db, schema: {} }));
vi.mock("@/lib/auth", () => ({ auth: h.auth }));
vi.mock("next/cache", () => ({ revalidatePath: h.revalidatePath }));

const { createCatalogItem, updateCatalogItem, toggleCatalogItem } =
  await import("@/actions/catalog");

const argsOf = (method: string, index = 0) =>
  h.calls.filter((c) => c.method === method)[index]?.args;

beforeEach(() => {
  h.calls.length = 0;
  h.queue.length = 0;
  vi.clearAllMocks();
  h.auth.mockResolvedValue({ user: { email: "tesoureiro@example.com" } });
});

function fd(entries: Record<string, string>) {
  const f = new FormData();
  for (const [k, v] of Object.entries(entries)) f.set(k, v);
  return f;
}

describe("createCatalogItem", () => {
  it("exige autenticação", async () => {
    h.auth.mockResolvedValueOnce(null);
    await expect(
      createCatalogItem("department", { ok: false }, fd({ name: "EBD" })),
    ).rejects.toThrow(/autorizado/i);
  });

  it("rejeita nome vazio sem inserir", async () => {
    const res = await createCatalogItem(
      "department",
      { ok: false },
      fd({ name: "  " }),
    );
    expect(res.ok).toBe(false);
    expect(res.fieldErrors?.name).toBeTruthy();
    expect(h.calls.some((c) => c.method === "insert")).toBe(false);
  });

  it("insere o item e revalida a rota de departamentos", async () => {
    const res = await createCatalogItem(
      "department",
      { ok: false },
      fd({ name: "EBD" }),
    );
    expect(res.ok).toBe(true);
    expect(argsOf("values", 0)?.[0]).toMatchObject({ name: "EBD" });
    expect(h.revalidatePath).toHaveBeenCalledWith("/admin/departamentos");
  });

  it("usa a rota de tipos de despesa para kind=expenseType", async () => {
    await createCatalogItem(
      "expenseType",
      { ok: false },
      fd({ name: "Serviços" }),
    );
    expect(h.revalidatePath).toHaveBeenCalledWith("/admin/tipos-despesa");
  });
});

describe("updateCatalogItem", () => {
  it("interpreta o checkbox 'active' (on => true)", async () => {
    await updateCatalogItem(
      "department",
      5,
      { ok: false },
      fd({ name: "EBD", active: "on" }),
    );
    expect(argsOf("set", 0)?.[0]).toMatchObject({ name: "EBD", active: true });
  });

  it("ausência de 'active' resulta em false", async () => {
    await updateCatalogItem("department", 5, { ok: false }, fd({ name: "EBD" }));
    expect(argsOf("set", 0)?.[0]).toMatchObject({ active: false });
  });
});

describe("toggleCatalogItem", () => {
  it("inverte o estado atual do item", async () => {
    h.queue.push([{ id: 5, name: "EBD", active: true }]);
    await toggleCatalogItem("department", 5);
    expect(argsOf("set", 0)?.[0]).toMatchObject({ active: false });
  });

  it("não faz nada se o item não existe", async () => {
    h.queue.push([]); // select vazio
    await toggleCatalogItem("department", 999);
    expect(h.calls.some((c) => c.method === "update")).toBe(false);
  });
});
