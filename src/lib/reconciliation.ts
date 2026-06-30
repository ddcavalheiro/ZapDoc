/**
 * Casamento (conciliação) entre solicitações de reembolso e transações do extrato.
 *
 * Regra: a tabela é dirigida pela **solicitação** — cada candidata busca o melhor
 * débito do extrato (saída de dinheiro) com **valor idêntico** e data dentro de uma
 * janela de tolerância. Funções puras, reusadas no servidor e no cliente.
 */

import type { OfxTransaction } from "@/lib/ofx";
import type { Status } from "@/lib/status";

export interface ReconCandidate {
  id: number;
  requesterName: string;
  amount: number;
  expenseDate: string; // yyyy-mm-dd
  paidAt: string | null; // ISO ou null
  status: Status;
}

export type Confidence = "match" | "none";

export interface MatchRow<C extends ReconCandidate = ReconCandidate> {
  candidate: C;
  tx: OfxTransaction | null;
  confidence: Confidence;
  dayDiff: number | null; // diferença em dias entre o extrato e a data de referência
}

const DAY_MS = 24 * 60 * 60 * 1000;

function toCents(value: number): number {
  return Math.round(value * 100);
}

function dayDistance(aIso: string, bIso: string): number {
  const a = new Date(`${aIso.slice(0, 10)}T00:00:00Z`).getTime();
  const b = new Date(`${bIso.slice(0, 10)}T00:00:00Z`).getTime();
  return Math.round(Math.abs(a - b) / DAY_MS);
}

/** Data de referência da solicitação para comparar com o extrato. */
function referenceDate(c: ReconCandidate): string {
  return (c.paidAt ?? c.expenseDate).slice(0, 10);
}

/**
 * Constrói as linhas de conciliação. O casamento é por **valor** (centavos iguais);
 * a data não precisa coincidir — apenas precisa estar dentro da janela de tolerância,
 * e a diferença em dias é exposta para conferência. Apenas **débitos** do extrato são
 * considerados. Cada débito é atribuído a no máximo uma solicitação (atribuição gulosa
 * pela menor diferença de dias), evitando casar a mesma transação com duas solicitações.
 */
export function buildMatches<C extends ReconCandidate>(
  candidates: C[],
  transactions: OfxTransaction[],
  toleranceDays: number,
): MatchRow<C>[] {
  const debits = transactions.filter((t) => t.amount < 0);

  // Todos os pares viáveis (valor igual + dentro da janela), ordenados pelo melhor.
  type Pair = { ci: number; tx: OfxTransaction; dayDiff: number };
  const pairs: Pair[] = [];
  candidates.forEach((c, ci) => {
    const cents = toCents(c.amount);
    const ref = referenceDate(c);
    for (const tx of debits) {
      if (toCents(Math.abs(tx.amount)) !== cents) continue;
      const dayDiff = dayDistance(tx.date, ref);
      if (dayDiff <= toleranceDays) pairs.push({ ci, tx, dayDiff });
    }
  });
  pairs.sort((a, b) => a.dayDiff - b.dayDiff);

  const assignedCandidate = new Set<number>();
  const usedFitid = new Set<string>();
  const matchByCandidate = new Map<number, Pair>();
  for (const p of pairs) {
    if (assignedCandidate.has(p.ci) || usedFitid.has(p.tx.fitid)) continue;
    assignedCandidate.add(p.ci);
    usedFitid.add(p.tx.fitid);
    matchByCandidate.set(p.ci, p);
  }

  return candidates.map((candidate, ci) => {
    const p = matchByCandidate.get(ci);
    if (!p) return { candidate, tx: null, confidence: "none", dayDiff: null };
    return { candidate, tx: p.tx, confidence: "match", dayDiff: p.dayDiff };
  });
}
