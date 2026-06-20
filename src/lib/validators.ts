import { z } from "zod";
import { STATUS_VALUES } from "@/lib/status";

const requiredString = (label: string, max = 255) =>
  z
    .string({ message: `${label} é obrigatório.` })
    .trim()
    .min(1, `${label} é obrigatório.`)
    .max(max, `${label} deve ter no máximo ${max} caracteres.`);

/** Anexo já enviado ao Vercel Blob (metadados gravados no banco). */
export const attachmentSchema = z.object({
  url: z.string().url(),
  pathname: z.string().min(1),
  contentType: z.string().optional(),
  size: z.number().int().nonnegative().optional(),
});

export type AttachmentInput = z.infer<typeof attachmentSchema>;

const moneyAmount = (label: string) =>
  z.coerce
    .number({ message: `Informe ${label}.` })
    .positive(`${label} deve ser maior que zero.`);

/** Dados de uma nota fiscal, sem anexos (edição pelo tesoureiro). */
export const noteFieldsSchema = z.object({
  supplierName: requiredString("Fornecedor"),
  fiscalDocNumber: requiredString("Número da nota", 120),
  amount: moneyAmount("o valor da nota"),
});

export type NoteFieldsInput = z.infer<typeof noteFieldsSchema>;

/** Nota fiscal com suas fotos (envio público e adição pelo tesoureiro). */
export const noteSchema = noteFieldsSchema.extend({
  attachments: z
    .array(attachmentSchema)
    .min(1, "Envie ao menos uma foto da nota."),
});

export type NoteInput = z.infer<typeof noteSchema>;

/** Campos editáveis de uma solicitação (usado no envio público e na edição). */
export const reimbursementBaseSchema = z.object({
  requesterName: requiredString("Nome"),
  expenseDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Informe a data da despesa."),
  departmentId: z.coerce
    .number({ message: "Selecione o departamento." })
    .int()
    .positive("Selecione o departamento."),
  expenseTypeId: z.coerce
    .number({ message: "Selecione o tipo de despesa." })
    .int()
    .positive("Selecione o tipo de despesa."),
  description: requiredString("Descrição", 2000),
  amount: moneyAmount("o valor a reembolsar"),
  payeeName: requiredString("Nome do recebedor"),
  paymentDetails: requiredString("Dados bancários / PIX", 500),
});

/** Payload completo do envio público (solicitação + notas com fotos). */
export const createReimbursementSchema = reimbursementBaseSchema.extend({
  notes: z.array(noteSchema).min(1, "Adicione ao menos uma nota fiscal."),
});

export type CreateReimbursementInput = z.infer<
  typeof createReimbursementSchema
>;

/** Edição da solicitação pelo tesoureiro (campos gerais). */
export const updateReimbursementSchema = reimbursementBaseSchema;

export const statusSchema = z.enum(
  STATUS_VALUES as [string, ...string[]],
);

/** Mudança de status. RECUSADO exige motivo. */
export const changeStatusSchema = z
  .object({
    status: statusSchema,
    reason: z.string().trim().max(1000).optional(),
  })
  .refine(
    (data) => data.status !== "RECUSADO" || (data.reason?.length ?? 0) > 0,
    { message: "Informe o motivo da recusa.", path: ["reason"] },
  );

/** Cadastro simples (departamento / tipo de despesa). */
export const catalogSchema = z.object({
  name: requiredString("Nome", 160),
  active: z.coerce.boolean().optional().default(true),
});

export type CatalogInput = z.infer<typeof catalogSchema>;
