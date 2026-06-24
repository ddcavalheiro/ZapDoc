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
  };
});

vi.mock("@/db", () => ({ db: h.db, schema: {} }));
vi.mock("@/lib/auth", () => ({ auth: h.auth }));
vi.mock("next/cache", () => ({ revalidatePath: h.revalidatePath }));
vi.mock("@vercel/blob", () => ({ del: h.del }));

const {
  createReimbursement,
  updateReimbursement,
  changeStatus,
  setReimbursementStatus,
  addNoteAttachments,
  deleteNoteAttachment,
} = await import("@/actions/reimbursements");

const argsOf = (method: string, index = 0) =>
  h.calls.filter((c) => c.method === method)[index]?.args;

beforeEach(() => {
  h.calls.length = 0;
  h.queue.length = 0;
  vi.clearAllMocks();
  // Sessão autenticada por padrão.
  h.auth.mockResolvedValue({ user: { email: "tesoureiro@example.com" } });
});

const validInput = {
  requesterName: "João da Silva",
  expenseDate: "2026-06-23",
  departmentId: 1,
  expenseTypeId: 2,
  description: "Material de escritório",
  amount: 50,
  payeeName: "João da Silva",
  paymentDetails: "PIX: joao@example.com",
  notes: [
    {
      supplierName: "Papelaria Central",
      fiscalDocNumber: "12345",
      amount: 50,
      attachments: [{ url: "https://blob/x.jpg", pathname: "x.jpg" }],
    },
  ],
};

describe("createReimbursement (envio público)", () => {
  it("rejeita payload inválido sem tocar no banco", async () => {
    const res = await createReimbursement({ ...validInput, notes: [] });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.fieldErrors).toBeTruthy();
    expect(h.calls.some((c) => c.method === "insert")).toBe(false);
  });

  it("persiste solicitação, notas e histórico e retorna o id", async () => {
    h.queue.push([{ id: 1 }], [{ id: 10 }]); // reimbursement.id, note.id
    const res = await createReimbursement(validInput);

    expect(res).toEqual({ ok: true, id: 1 });

    // Primeira gravação: a própria solicitação, com status inicial e valor formatado.
    const reimbursementValues = argsOf("values", 0)?.[0] as Record<
      string,
      unknown
    >;
    expect(reimbursementValues.status).toBe("PENDENTE");
    expect(reimbursementValues.amount).toBe("50.00");

    // Histórico inicial: de null para PENDENTE.
    const historyValues = h.calls
      .filter((c) => c.method === "values")
      .map((c) => c.args[0] as Record<string, unknown>)
      .find((v) => v.fromStatus === null && v.toStatus === "PENDENTE");
    expect(historyValues).toBeTruthy();

    expect(h.revalidatePath).toHaveBeenCalledWith("/admin/solicitacoes");
  });
});

describe("updateReimbursement (edição pelo tesoureiro)", () => {
  it("exige autenticação", async () => {
    h.auth.mockResolvedValueOnce(null);
    await expect(
      updateReimbursement(1, { ok: false }, new FormData()),
    ).rejects.toThrow(/autorizado/i);
  });

  it("retorna fieldErrors quando o formulário é inválido", async () => {
    const res = await updateReimbursement(1, { ok: false }, new FormData());
    expect(res.ok).toBe(false);
    expect(res.fieldErrors).toBeTruthy();
    expect(h.calls.some((c) => c.method === "update")).toBe(false);
  });
});

describe("mudança de status", () => {
  it("ao marcar PAGO define paidAt e limpa statusReason", async () => {
    h.queue.push([{ status: "AGUARDANDO_PAGAMENTO" }]); // status atual
    const res = await setReimbursementStatus(1, "PAGO");

    expect(res.ok).toBe(true);
    const setArgs = argsOf("set", 0)?.[0] as Record<string, unknown>;
    expect(setArgs.status).toBe("PAGO");
    expect(setArgs.paidAt).toBeInstanceOf(Date);
    expect(setArgs.statusReason).toBeNull();

    // Histórico registra a transição a partir do status atual.
    const hist = h.calls
      .filter((c) => c.method === "values")
      .map((c) => c.args[0] as Record<string, unknown>)[0];
    expect(hist.fromStatus).toBe("AGUARDANDO_PAGAMENTO");
    expect(hist.toStatus).toBe("PAGO");
  });

  it("ao RECUSAR com motivo grava statusReason e não define paidAt", async () => {
    h.queue.push([{ status: "PENDENTE" }]);
    const res = await setReimbursementStatus(1, "RECUSADO", "Falta nota.");

    expect(res.ok).toBe(true);
    const setArgs = argsOf("set", 0)?.[0] as Record<string, unknown>;
    expect(setArgs.statusReason).toBe("Falta nota.");
    expect(setArgs.paidAt).toBeNull();
  });

  it("RECUSADO sem motivo é rejeitado pela validação", async () => {
    const res = await setReimbursementStatus(1, "RECUSADO");
    expect(res.ok).toBe(false);
    expect(res.error).toBeTruthy();
    expect(h.calls.some((c) => c.method === "update")).toBe(false);
  });

  it("retorna erro quando a solicitação não existe", async () => {
    h.queue.push([]); // select não encontra nada
    const res = await setReimbursementStatus(1, "PAGO");
    expect(res).toEqual({ ok: false, error: "Solicitação não encontrada." });
    expect(h.calls.some((c) => c.method === "update")).toBe(false);
  });

  it("changeStatus exige autenticação", async () => {
    h.auth.mockResolvedValueOnce(null);
    const fd = new FormData();
    fd.set("status", "PAGO");
    await expect(changeStatus(1, { ok: false }, fd)).rejects.toThrow(
      /autorizado/i,
    );
  });
});

describe("anexos de notas", () => {
  it("addNoteAttachments rejeita lista vazia", async () => {
    const res = await addNoteAttachments(10, 1, []);
    expect(res).toEqual({ ok: false, error: "Nenhuma foto enviada." });
    expect(h.calls.some((c) => c.method === "insert")).toBe(false);
  });

  it("deleteNoteAttachment impede remover a última foto", async () => {
    h.queue.push([{ url: "https://blob/u1.jpg", id: 1 }]); // só uma foto
    const res = await deleteNoteAttachment(1, 10, 1);
    expect(res).toEqual({
      ok: false,
      error: "A nota precisa ter ao menos uma foto.",
    });
    expect(h.del).not.toHaveBeenCalled();
    expect(h.calls.some((c) => c.method === "delete")).toBe(false);
  });

  it("deleteNoteAttachment remove a foto alvo do banco e do Blob", async () => {
    h.queue.push([
      { url: "https://blob/u1.jpg", id: 1 },
      { url: "https://blob/u2.jpg", id: 2 },
    ]);
    const res = await deleteNoteAttachment(2, 10, 1);
    expect(res.ok).toBe(true);
    expect(h.del).toHaveBeenCalledWith(["https://blob/u2.jpg"]);
    expect(h.calls.some((c) => c.method === "delete")).toBe(true);
  });
});
