import "server-only";
import { db } from "@/db";
import {
  departments,
  expenseTypes,
  reimbursements,
  reimbursementAttachments,
  statusHistory,
} from "@/db/schema";
import { and, asc, desc, eq, gte, ilike, lte, or, sql } from "drizzle-orm";
import { isStatus, type Status } from "@/lib/status";

export async function getActiveDepartments() {
  return db
    .select()
    .from(departments)
    .where(eq(departments.active, true))
    .orderBy(asc(departments.name));
}

export async function getAllDepartments() {
  return db.select().from(departments).orderBy(asc(departments.name));
}

export async function getActiveExpenseTypes() {
  return db
    .select()
    .from(expenseTypes)
    .where(eq(expenseTypes.active, true))
    .orderBy(asc(expenseTypes.name));
}

export async function getAllExpenseTypes() {
  return db.select().from(expenseTypes).orderBy(asc(expenseTypes.name));
}

export interface ReimbursementFilters {
  status?: Status;
  departmentId?: number;
  expenseTypeId?: number;
  from?: string; // yyyy-mm-dd (expense_date)
  to?: string;
  search?: string;
}

/** Converte query params (page/route) em filtros tipados. */
export function filtersFromParams(
  sp: Record<string, string | undefined> | URLSearchParams,
): ReimbursementFilters {
  const get = (k: string) =>
    sp instanceof URLSearchParams ? sp.get(k) ?? undefined : sp[k];
  const status = get("status");
  return {
    status: status && isStatus(status) ? (status as Status) : undefined,
    departmentId: get("departmentId") ? Number(get("departmentId")) : undefined,
    expenseTypeId: get("expenseTypeId")
      ? Number(get("expenseTypeId"))
      : undefined,
    from: get("from") || undefined,
    to: get("to") || undefined,
    search: get("search") || undefined,
  };
}

function buildWhere(f: ReimbursementFilters) {
  const conds = [];
  if (f.status) conds.push(eq(reimbursements.status, f.status));
  if (f.departmentId)
    conds.push(eq(reimbursements.departmentId, f.departmentId));
  if (f.expenseTypeId)
    conds.push(eq(reimbursements.expenseTypeId, f.expenseTypeId));
  if (f.from) conds.push(gte(reimbursements.expenseDate, f.from));
  if (f.to) conds.push(lte(reimbursements.expenseDate, f.to));
  if (f.search) {
    const term = `%${f.search}%`;
    conds.push(
      or(
        ilike(reimbursements.requesterName, term),
        ilike(reimbursements.supplierName, term),
        ilike(reimbursements.payeeName, term),
        ilike(reimbursements.fiscalDocNumber, term),
      ),
    );
  }
  return conds.length ? and(...conds) : undefined;
}

/** Tamanho padrão da página na listagem. */
export const PER_PAGE = 20;

/** Colunas pelas quais a tabela de solicitações pode ser ordenada. */
export type SortKey =
  | "id"
  | "requester"
  | "department"
  | "type"
  | "date"
  | "amount"
  | "status"
  | "attachments";

const SORT_KEYS: SortKey[] = [
  "id",
  "requester",
  "department",
  "type",
  "date",
  "amount",
  "status",
  "attachments",
];

function isSortKey(v: string): v is SortKey {
  return (SORT_KEYS as string[]).includes(v);
}

export interface ListOptions {
  sort?: SortKey;
  dir?: "asc" | "desc";
  page?: number;
  perPage?: number;
}

/** Lê ordenação/página dos query params, com defaults seguros. */
export function listOptionsFromParams(
  sp: Record<string, string | undefined> | URLSearchParams,
): { sort?: SortKey; dir: "asc" | "desc"; page: number; perPage: number } {
  const get = (k: string) =>
    sp instanceof URLSearchParams ? sp.get(k) ?? undefined : sp[k];
  const sortRaw = get("sort");
  return {
    sort: sortRaw && isSortKey(sortRaw) ? sortRaw : undefined,
    dir: get("dir") === "asc" ? "asc" : "desc",
    page: Math.max(1, Number(get("page")) || 1),
    perPage: PER_PAGE,
  };
}

/** Subconsulta de contagem de anexos (reusada no select e na ordenação). */
const attachmentCountSql = sql<number>`(
  select count(*) from ${reimbursementAttachments}
  where ${reimbursementAttachments.reimbursementId} = ${reimbursements.id}
)`;

function sortExpr(sort?: SortKey) {
  switch (sort) {
    case "id":
      return reimbursements.id;
    case "requester":
      return reimbursements.requesterName;
    case "department":
      return departments.name;
    case "type":
      return expenseTypes.name;
    case "date":
      return reimbursements.expenseDate;
    case "amount":
      return reimbursements.amount;
    case "status":
      return reimbursements.status;
    case "attachments":
      return attachmentCountSql;
    default:
      return null;
  }
}

/** Lista solicitações com nomes de departamento/tipo e contagem de anexos. */
export async function listReimbursements(
  f: ReimbursementFilters = {},
  opts: ListOptions = {},
) {
  const expr = sortExpr(opts.sort);
  const direction = opts.dir === "asc" ? asc : desc;
  const orderBy = expr
    ? [direction(expr), desc(reimbursements.id)]
    : [desc(reimbursements.createdAt)];

  let q = db
    .select({
      id: reimbursements.id,
      requesterName: reimbursements.requesterName,
      expenseDate: reimbursements.expenseDate,
      description: reimbursements.description,
      supplierName: reimbursements.supplierName,
      fiscalDocNumber: reimbursements.fiscalDocNumber,
      amount: reimbursements.amount,
      payeeName: reimbursements.payeeName,
      paymentDetails: reimbursements.paymentDetails,
      status: reimbursements.status,
      statusReason: reimbursements.statusReason,
      createdAt: reimbursements.createdAt,
      paidAt: reimbursements.paidAt,
      departmentId: reimbursements.departmentId,
      expenseTypeId: reimbursements.expenseTypeId,
      departmentName: departments.name,
      expenseTypeName: expenseTypes.name,
      attachmentCount: attachmentCountSql.mapWith(Number),
    })
    .from(reimbursements)
    .leftJoin(departments, eq(reimbursements.departmentId, departments.id))
    .leftJoin(expenseTypes, eq(reimbursements.expenseTypeId, expenseTypes.id))
    .where(buildWhere(f))
    .orderBy(...orderBy)
    .$dynamic();

  if (opts.perPage) {
    const page = opts.page && opts.page > 0 ? opts.page : 1;
    q = q.limit(opts.perPage).offset((page - 1) * opts.perPage);
  }

  return q;
}

/** Total de solicitações e soma de valores para os filtros atuais (paginação). */
export async function countReimbursements(f: ReimbursementFilters = {}) {
  const row = (
    await db
      .select({
        count: sql<number>`count(*)`.mapWith(Number),
        total: sql<number>`coalesce(sum(${reimbursements.amount}), 0)`.mapWith(
          Number,
        ),
      })
      .from(reimbursements)
      .where(buildWhere(f))
  )[0];
  return { count: row?.count ?? 0, total: row?.total ?? 0 };
}

export type ReimbursementListItem = Awaited<
  ReturnType<typeof listReimbursements>
>[number];

export async function getReimbursement(id: number) {
  const row = (
    await db
      .select({
        r: reimbursements,
        departmentName: departments.name,
        expenseTypeName: expenseTypes.name,
      })
      .from(reimbursements)
      .leftJoin(departments, eq(reimbursements.departmentId, departments.id))
      .leftJoin(expenseTypes, eq(reimbursements.expenseTypeId, expenseTypes.id))
      .where(eq(reimbursements.id, id))
      .limit(1)
  )[0];
  if (!row) return null;

  const attachments = await db
    .select()
    .from(reimbursementAttachments)
    .where(eq(reimbursementAttachments.reimbursementId, id))
    .orderBy(asc(reimbursementAttachments.id));

  const history = await db
    .select()
    .from(statusHistory)
    .where(eq(statusHistory.reimbursementId, id))
    .orderBy(desc(statusHistory.changedAt));

  return {
    ...row.r,
    departmentName: row.departmentName,
    expenseTypeName: row.expenseTypeName,
    attachments,
    history,
  };
}

/** Agregações para o dashboard. */
export async function getDashboardData() {
  const byStatus = await db
    .select({
      status: reimbursements.status,
      count: sql<number>`count(*)`.mapWith(Number),
      total: sql<number>`coalesce(sum(${reimbursements.amount}), 0)`.mapWith(
        Number,
      ),
    })
    .from(reimbursements)
    .groupBy(reimbursements.status);

  const byDepartment = await db
    .select({
      name: departments.name,
      total: sql<number>`coalesce(sum(${reimbursements.amount}), 0)`.mapWith(
        Number,
      ),
    })
    .from(reimbursements)
    .leftJoin(departments, eq(reimbursements.departmentId, departments.id))
    .groupBy(departments.name)
    .orderBy(desc(sql`coalesce(sum(${reimbursements.amount}), 0)`));

  const byExpenseType = await db
    .select({
      name: expenseTypes.name,
      total: sql<number>`coalesce(sum(${reimbursements.amount}), 0)`.mapWith(
        Number,
      ),
    })
    .from(reimbursements)
    .leftJoin(expenseTypes, eq(reimbursements.expenseTypeId, expenseTypes.id))
    .groupBy(expenseTypes.name)
    .orderBy(desc(sql`coalesce(sum(${reimbursements.amount}), 0)`));

  const monthly = await db
    .select({
      month: sql<string>`to_char(date_trunc('month', ${reimbursements.expenseDate}), 'YYYY-MM')`,
      total: sql<number>`coalesce(sum(${reimbursements.amount}), 0)`.mapWith(
        Number,
      ),
      count: sql<number>`count(*)`.mapWith(Number),
    })
    .from(reimbursements)
    .groupBy(sql`date_trunc('month', ${reimbursements.expenseDate})`)
    .orderBy(asc(sql`date_trunc('month', ${reimbursements.expenseDate})`));

  return { byStatus, byDepartment, byExpenseType, monthly };
}
