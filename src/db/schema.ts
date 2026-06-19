import {
  pgTable,
  pgEnum,
  serial,
  integer,
  text,
  varchar,
  numeric,
  boolean,
  timestamp,
  date,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { STATUS_VALUES } from "@/lib/status";

export const statusEnum = pgEnum(
  "reimbursement_status",
  STATUS_VALUES as [string, ...string[]],
);

/** Usuários da área do tesoureiro (login). */
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

/** Cadastro de departamentos (alimenta o select do formulário). */
export const departments = pgTable("departments", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 160 }).notNull(),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

/** Cadastro de tipos de despesa (alimenta o select do formulário). */
export const expenseTypes = pgTable("expense_types", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 160 }).notNull(),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

/** Solicitação de reembolso. */
export const reimbursements = pgTable("reimbursements", {
  id: serial("id").primaryKey(),
  requesterName: varchar("requester_name", { length: 255 }).notNull(),
  expenseDate: date("expense_date").notNull(),
  departmentId: integer("department_id")
    .notNull()
    .references(() => departments.id),
  expenseTypeId: integer("expense_type_id")
    .notNull()
    .references(() => expenseTypes.id),
  description: text("description").notNull(),
  supplierName: varchar("supplier_name", { length: 255 }).notNull(),
  fiscalDocNumber: varchar("fiscal_doc_number", { length: 120 }).notNull(),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  payeeName: varchar("payee_name", { length: 255 }).notNull(),
  paymentDetails: text("payment_details").notNull(),
  status: statusEnum("status").notNull().default("PENDENTE"),
  statusReason: text("status_reason"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  paidAt: timestamp("paid_at", { withTimezone: true }),
});

/** Anexos (fotos das notas) de cada solicitação. */
export const reimbursementAttachments = pgTable("reimbursement_attachments", {
  id: serial("id").primaryKey(),
  reimbursementId: integer("reimbursement_id")
    .notNull()
    .references(() => reimbursements.id, { onDelete: "cascade" }),
  blobUrl: text("blob_url").notNull(),
  pathname: text("pathname").notNull(),
  contentType: varchar("content_type", { length: 120 }),
  size: integer("size"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

/** Histórico de mudanças de status (auditoria). */
export const statusHistory = pgTable("status_history", {
  id: serial("id").primaryKey(),
  reimbursementId: integer("reimbursement_id")
    .notNull()
    .references(() => reimbursements.id, { onDelete: "cascade" }),
  fromStatus: statusEnum("from_status"),
  toStatus: statusEnum("to_status").notNull(),
  note: text("note"),
  changedAt: timestamp("changed_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const reimbursementsRelations = relations(
  reimbursements,
  ({ one, many }) => ({
    department: one(departments, {
      fields: [reimbursements.departmentId],
      references: [departments.id],
    }),
    expenseType: one(expenseTypes, {
      fields: [reimbursements.expenseTypeId],
      references: [expenseTypes.id],
    }),
    attachments: many(reimbursementAttachments),
    history: many(statusHistory),
  }),
);

export const attachmentsRelations = relations(
  reimbursementAttachments,
  ({ one }) => ({
    reimbursement: one(reimbursements, {
      fields: [reimbursementAttachments.reimbursementId],
      references: [reimbursements.id],
    }),
  }),
);

export const statusHistoryRelations = relations(statusHistory, ({ one }) => ({
  reimbursement: one(reimbursements, {
    fields: [statusHistory.reimbursementId],
    references: [reimbursements.id],
  }),
}));

export type Department = typeof departments.$inferSelect;
export type ExpenseType = typeof expenseTypes.$inferSelect;
export type Reimbursement = typeof reimbursements.$inferSelect;
export type ReimbursementAttachment =
  typeof reimbursementAttachments.$inferSelect;
export type StatusHistoryRow = typeof statusHistory.$inferSelect;
export type User = typeof users.$inferSelect;
