import { describe, expect, it } from "vitest";
import {
  attachmentSchema,
  noteFieldsSchema,
  noteSchema,
  createReimbursementSchema,
  changeStatusSchema,
  catalogSchema,
  createUserSchema,
  changePasswordSchema,
  roleSchema,
} from "@/lib/validators";

const validAttachment = {
  url: "https://blob.example.com/nota.jpg",
  pathname: "nota.jpg",
  contentType: "image/jpeg",
  size: 1024,
};

const validNote = {
  supplierName: "Papelaria Central",
  fiscalDocNumber: "12345",
  amount: 50,
  attachments: [validAttachment],
};

const validReimbursement = {
  requesterName: "João da Silva",
  expenseDate: "2026-06-23",
  departmentId: 1,
  expenseTypeId: 2,
  description: "Compra de material de escritório",
  amount: 50,
  payeeName: "João da Silva",
  paymentDetails: "PIX: joao@example.com",
  notes: [validNote],
};

describe("attachmentSchema", () => {
  it("aceita um anexo válido", () => {
    expect(attachmentSchema.safeParse(validAttachment).success).toBe(true);
  });

  it("rejeita url inválida", () => {
    const r = attachmentSchema.safeParse({ ...validAttachment, url: "nope" });
    expect(r.success).toBe(false);
  });

  it("torna contentType e size opcionais", () => {
    const r = attachmentSchema.safeParse({
      url: "https://x.com/a.png",
      pathname: "a.png",
    });
    expect(r.success).toBe(true);
  });
});

describe("noteFieldsSchema", () => {
  it("faz trim e exige fornecedor", () => {
    const r = noteFieldsSchema.safeParse({
      supplierName: "  ",
      fiscalDocNumber: "1",
      amount: 10,
    });
    expect(r.success).toBe(false);
  });

  it("coage valor string para número e exige positivo", () => {
    const ok = noteFieldsSchema.safeParse({
      supplierName: "X",
      fiscalDocNumber: "1",
      amount: "12.5",
    });
    expect(ok.success).toBe(true);
    if (ok.success) expect(ok.data.amount).toBe(12.5);

    const bad = noteFieldsSchema.safeParse({
      supplierName: "X",
      fiscalDocNumber: "1",
      amount: 0,
    });
    expect(bad.success).toBe(false);
  });
});

describe("noteSchema", () => {
  it("exige ao menos uma foto", () => {
    const r = noteSchema.safeParse({ ...validNote, attachments: [] });
    expect(r.success).toBe(false);
  });
});

describe("createReimbursementSchema", () => {
  it("aceita um payload completo válido", () => {
    expect(createReimbursementSchema.safeParse(validReimbursement).success).toBe(
      true,
    );
  });

  it("exige ao menos uma nota", () => {
    const r = createReimbursementSchema.safeParse({
      ...validReimbursement,
      notes: [],
    });
    expect(r.success).toBe(false);
  });

  it("valida formato da data da despesa", () => {
    const r = createReimbursementSchema.safeParse({
      ...validReimbursement,
      expenseDate: "23/06/2026",
    });
    expect(r.success).toBe(false);
  });

  it("rejeita departmentId não positivo", () => {
    const r = createReimbursementSchema.safeParse({
      ...validReimbursement,
      departmentId: 0,
    });
    expect(r.success).toBe(false);
  });
});

describe("changeStatusSchema", () => {
  it("aceita status válido sem motivo", () => {
    expect(changeStatusSchema.safeParse({ status: "PAGO" }).success).toBe(true);
  });

  it("exige motivo quando status é RECUSADO", () => {
    const semMotivo = changeStatusSchema.safeParse({ status: "RECUSADO" });
    expect(semMotivo.success).toBe(false);

    const comMotivo = changeStatusSchema.safeParse({
      status: "RECUSADO",
      reason: "Falta nota fiscal.",
    });
    expect(comMotivo.success).toBe(true);
  });

  it("rejeita status fora do enum", () => {
    expect(changeStatusSchema.safeParse({ status: "QUALQUER" }).success).toBe(
      false,
    );
  });
});

describe("catalogSchema", () => {
  it("aplica default active=true", () => {
    const r = catalogSchema.safeParse({ name: "EBD" });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.active).toBe(true);
  });
});

describe("createUserSchema", () => {
  it("normaliza email (trim + lowercase)", () => {
    const r = createUserSchema.safeParse({
      name: "Maria",
      email: "  MARIA@Example.COM ",
      roleId: 1,
    });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.email).toBe("maria@example.com");
  });

  it("rejeita email inválido", () => {
    const r = createUserSchema.safeParse({
      name: "Maria",
      email: "maria",
      roleId: 1,
    });
    expect(r.success).toBe(false);
  });
});

describe("changePasswordSchema", () => {
  it("exige confirmação igual à nova senha", () => {
    const r = changePasswordSchema.safeParse({
      currentPassword: "atual123",
      newPassword: "novaSenha1",
      confirmPassword: "outraCoisa",
    });
    expect(r.success).toBe(false);
  });

  it("exige no mínimo 8 caracteres na nova senha", () => {
    const r = changePasswordSchema.safeParse({
      currentPassword: "atual123",
      newPassword: "curta",
      confirmPassword: "curta",
    });
    expect(r.success).toBe(false);
  });

  it("aceita troca válida", () => {
    const r = changePasswordSchema.safeParse({
      currentPassword: "atual123",
      newPassword: "novaSenha1",
      confirmPassword: "novaSenha1",
    });
    expect(r.success).toBe(true);
  });
});

describe("roleSchema", () => {
  it("aceita papel com nome e descrição opcional", () => {
    expect(roleSchema.safeParse({ name: "Tesoureiro" }).success).toBe(true);
    expect(
      roleSchema.safeParse({ name: "Tesoureiro", description: "Confere notas" })
        .success,
    ).toBe(true);
  });

  it("exige nome", () => {
    expect(roleSchema.safeParse({ name: "" }).success).toBe(false);
  });
});
