import { describe, expect, it } from "vitest";
import {
  STATUS,
  STATUS_VALUES,
  STATUS_ORDER,
  OPEN_STATUSES,
  STATUS_LABELS,
  STATUS_BADGE,
  STATUS_COLOR,
  isStatus,
} from "@/lib/status";

describe("status", () => {
  it("expõe os cinco status do fluxo", () => {
    expect(STATUS_VALUES).toEqual([
      "PENDENTE",
      "VERIFICADO",
      "AGUARDANDO_PAGAMENTO",
      "PAGO",
      "RECUSADO",
    ]);
  });

  it("OPEN_STATUSES contém apenas status em aberto (sem PAGO/RECUSADO)", () => {
    expect(OPEN_STATUSES).toEqual([
      STATUS.PENDENTE,
      STATUS.VERIFICADO,
      STATUS.AGUARDANDO_PAGAMENTO,
    ]);
    expect(OPEN_STATUSES).not.toContain(STATUS.PAGO);
    expect(OPEN_STATUSES).not.toContain(STATUS.RECUSADO);
  });

  it("tem label, badge e cor para cada status", () => {
    for (const s of STATUS_VALUES) {
      expect(STATUS_LABELS[s]).toBeTruthy();
      expect(STATUS_BADGE[s]).toBeTruthy();
      expect(STATUS_COLOR[s]).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });

  it("STATUS_ORDER cobre todos os status sem repetição", () => {
    expect([...STATUS_ORDER].sort()).toEqual([...STATUS_VALUES].sort());
  });

  it("isStatus valida valores conhecidos e rejeita desconhecidos", () => {
    expect(isStatus("PAGO")).toBe(true);
    expect(isStatus("PENDENTE")).toBe(true);
    expect(isStatus("INEXISTENTE")).toBe(false);
    expect(isStatus("")).toBe(false);
    expect(isStatus("pago")).toBe(false);
  });
});
