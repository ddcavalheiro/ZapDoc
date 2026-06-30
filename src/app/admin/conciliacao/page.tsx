import { getReconciliationCandidates } from "@/db/queries";
import {
  ReconciliationManager,
  type CandidateDTO,
} from "@/components/reconciliation-manager";
import type { Status } from "@/lib/status";

export const dynamic = "force-dynamic";

export default async function ConciliacaoPage() {
  const rows = await getReconciliationCandidates();

  // Serializa para o cliente (amount numérico, paidAt como ISO/string).
  const candidates: CandidateDTO[] = rows.map((r) => ({
    id: r.id,
    requesterName: r.requesterName,
    amount: Number(r.amount),
    expenseDate: r.expenseDate,
    paidAt: r.paidAt ? r.paidAt.toISOString() : null,
    status: r.status as Status,
    departmentName: r.departmentName,
    expenseTypeName: r.expenseTypeName,
  }));

  return <ReconciliationManager candidates={candidates} />;
}
