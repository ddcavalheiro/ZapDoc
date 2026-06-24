import { describe, expect, it } from "vitest";
import { cn, formatBRL, formatDate, formatDateTime } from "@/lib/utils";

// Intl usa espaço não-quebrável (U+00A0/U+202F) entre "R$" e o número.
// Normaliza para espaço comum para comparações estáveis entre plataformas.
const brl = (v: Parameters<typeof formatBRL>[0]) =>
  formatBRL(v).replace(/\s/g, " ");

describe("cn", () => {
  it("junta classes e resolve conflitos do tailwind (última vence)", () => {
    expect(cn("px-2", "px-4")).toBe("px-4");
    expect(cn("text-sm", false && "hidden", "font-bold")).toBe(
      "text-sm font-bold",
    );
  });
});

describe("formatBRL", () => {
  it("formata números como moeda BRL", () => {
    expect(brl(1234.5)).toBe("R$ 1.234,50");
    expect(brl(0)).toBe("R$ 0,00");
  });

  it("aceita string numérica (vinda do banco)", () => {
    expect(brl("99.90")).toBe("R$ 99,90");
  });

  it("trata null/undefined/NaN como zero", () => {
    expect(brl(null)).toBe("R$ 0,00");
    expect(brl(undefined)).toBe("R$ 0,00");
    expect(brl("abc")).toBe("R$ 0,00");
  });
});

describe("formatDate", () => {
  it("formata ISO date como dd/mm/aaaa (UTC)", () => {
    expect(formatDate("2026-06-23")).toBe("23/06/2026");
  });

  it("formata objeto Date", () => {
    expect(formatDate(new Date("2026-01-05T00:00:00Z"))).toBe("05/01/2026");
  });

  it("retorna em branco para valores ausentes ou inválidos", () => {
    expect(formatDate(null)).toBe("—");
    expect(formatDate(undefined)).toBe("—");
    expect(formatDate("não-é-data")).toBe("—");
  });
});

describe("formatDateTime", () => {
  it("retorna em branco para valores ausentes ou inválidos", () => {
    expect(formatDateTime(null)).toBe("—");
    expect(formatDateTime("xpto")).toBe("—");
  });

  it("formata data e hora para um valor válido", () => {
    const out = formatDateTime("2026-06-23T14:30:00");
    expect(out).toMatch(/2026/);
    expect(out).toMatch(/14:30/);
  });
});
