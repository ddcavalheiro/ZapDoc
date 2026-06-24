import { describe, expect, it, vi } from "vitest";

// action-utils importa @/lib/auth (que puxa next/server). Mockamos para
// testar zodFieldErrors de forma isolada, sem inicializar o NextAuth.
vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));

const { zodFieldErrors } = await import("@/lib/action-utils");

describe("zodFieldErrors", () => {
  it("pega a primeira mensagem de cada campo", () => {
    const out = zodFieldErrors({
      name: ["Nome é obrigatório.", "muito curto"],
      email: ["Email inválido."],
    });
    expect(out).toEqual({
      name: "Nome é obrigatório.",
      email: "Email inválido.",
    });
  });

  it("ignora campos sem mensagens (undefined ou vazio)", () => {
    const out = zodFieldErrors({
      name: ["obrigatório"],
      email: undefined,
      phone: [],
    });
    expect(out).toEqual({ name: "obrigatório" });
  });

  it("retorna objeto vazio quando não há erros", () => {
    expect(zodFieldErrors({})).toEqual({});
  });
});
