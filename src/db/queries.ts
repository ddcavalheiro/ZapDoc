import "server-only";
import { db } from "@/db";
import {
  departments,
  expenseTypes,
  reimbursements,
  notes,
  noteAttachments,
  statusHistory,
  users,
  roles,
} from "@/db/schema";
import {
  and,
  asc,
  desc,
  eq,
  gte,
  ilike,
  inArray,
  lte,
  or,
  sql,
} from "drizzle-orm";
import { isStatus, OPEN_STATUSES, type Status } from "@/lib/status";

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

export async function getAllUsers() {
  return db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      roleId: users.roleId,
      roleName: roles.name,
      active: users.active,
      mfaEnabled: users.mfaEnabled,
      mustChangePassword: users.mustChangePassword,
      createdAt: users.createdAt,
    })
    .from(users)
    .leftJoin(roles, eq(users.roleId, roles.id))
    .orderBy(asc(users.name));
}

export async function getAllRoles() {
  return db.select().from(roles).orderBy(asc(roles.name));
}

/** Valor especial do filtro de status: tudo que está "em aberto". */
export const STATUS_FILTER_OPEN = "PENDENTES";
/** Valor especial do filtro de status: todos (sem filtro). */
export const STATUS_FILTER_ALL = "ALL";

export interface ReimbursementFilters {
  status?: Status;
  openOnly?: boolean; // filtro "Pendentes" (não pago nem recusado)
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
    openOnly: status === STATUS_FILTER_OPEN,
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
  if (f.openOnly) conds.push(inArray(reimbursements.status, OPEN_STATUSES));
  else if (f.status) conds.push(eq(reimbursements.status, f.status));
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
        ilike(reimbursements.payeeName, term),
        sql`exists (
          select 1 from ${notes}
          where ${notes.reimbursementId} = ${reimbursements.id}
            and (
              ${notes.supplierName} ilike ${term}
              or ${notes.fiscalDocNumber} ilike ${term}
            )
        )`,
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
  | "notes";

const SORT_KEYS: SortKey[] = [
  "id",
  "requester",
  "department",
  "type",
  "date",
  "amount",
  "status",
  "notes",
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

/** Contagem de notas da solicitação (reusada no select e na ordenação). */
const noteCountSql = sql<number>`(
  select count(*) from ${notes}
  where ${notes.reimbursementId} = ${reimbursements.id}
)`;

/** Contagem total de fotos (através das notas da solicitação). */
const attachmentCountSql = sql<number>`(
  select count(*) from ${noteAttachments}
  join ${notes} on ${noteAttachments.noteId} = ${notes.id}
  where ${notes.reimbursementId} = ${reimbursements.id}
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
    case "notes":
      return noteCountSql;
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
      noteCount: noteCountSql.mapWith(Number),
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

  const noteRows = await db
    .select()
    .from(notes)
    .where(eq(notes.reimbursementId, id))
    .orderBy(asc(notes.id));

  const noteIds = noteRows.map((n) => n.id);
  const atts = noteIds.length
    ? await db
        .select()
        .from(noteAttachments)
        .where(inArray(noteAttachments.noteId, noteIds))
        .orderBy(asc(noteAttachments.id))
    : [];

  const notesWithAttachments = noteRows.map((n) => ({
    ...n,
    attachments: atts.filter((a) => a.noteId === n.id),
  }));

  const notesTotal = noteRows.reduce((s, n) => s + Number(n.amount), 0);

  const history = await db
    .select()
    .from(statusHistory)
    .where(eq(statusHistory.reimbursementId, id))
    .orderBy(desc(statusHistory.changedAt));

  return {
    ...row.r,
    departmentName: row.departmentName,
    expenseTypeName: row.expenseTypeName,
    notes: notesWithAttachments,
    notesTotal,
    history,
  };
}

export type ReimbursementDetail = NonNullable<
  Awaited<ReturnType<typeof getReimbursement>>
>;
export type NoteWithAttachments = ReimbursementDetail["notes"][number];

/** Notas de um conjunto de solicitações (usado nas exportações). */
export async function getNotesByReimbursementIds(ids: number[]) {
  if (!ids.length) return [];
  return db
    .select()
    .from(notes)
    .where(inArray(notes.reimbursementId, ids))
    .orderBy(asc(notes.id));
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
