"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/field";
import { StatusBadge } from "@/components/status-badge";
import { reconcileReimbursements } from "@/actions/reimbursements";
import { parseOfx, OfxParseError, type OfxStatement } from "@/lib/ofx";
import { buildMatches, type ReconCandidate } from "@/lib/reconciliation";
import { formatBRL, formatDate } from "@/lib/utils";
import type { Status } from "@/lib/status";

/** Candidata vinda do servidor (amount/paidAt já serializados). */
export interface CandidateDTO extends ReconCandidate {
  departmentName: string | null;
  expenseTypeName: string | null;
}

const DEFAULT_DAYS = 30;

export function ReconciliationManager({
  candidates,
}: {
  candidates: CandidateDTO[];
}) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [statement, setStatement] = useState<OfxStatement | null>(null);
  const [days, setDays] = useState(DEFAULT_DAYS);
  const [confirmed, setConfirmed] = useState<Record<number, boolean>>({});
  const [onlyMatched, setOnlyMatched] = useState(true);
  const [error, setError] = useState<string>();
  const [success, setSuccess] = useState<string>();
  const [pending, startTransition] = useTransition();

  const matches = useMemo(() => {
    if (!statement) return [];
    return buildMatches(candidates, statement.transactions, days);
  }, [candidates, statement, days]);

  const matchedRows = matches.filter((m) => m.tx);
  const rows = onlyMatched ? matchedRows : matches;
  const debitCount = statement
    ? statement.transactions.filter((t) => t.amount < 0).length
    : 0;
  const confirmedCount = matchedRows.filter(
    (m) => confirmed[m.candidate.id],
  ).length;

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(undefined);
    setSuccess(undefined);
    try {
      const text = await file.text();
      const parsed = parseOfx(text);
      setStatement(parsed);
      setConfirmed({});
    } catch (err) {
      setStatement(null);
      setError(
        err instanceof OfxParseError
          ? err.message
          : "Não foi possível ler o arquivo OFX.",
      );
    } finally {
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  function discard() {
    setStatement(null);
    setConfirmed({});
    setError(undefined);
  }

  function confirmAll() {
    const next: Record<number, boolean> = {};
    for (const m of matchedRows) next[m.candidate.id] = true;
    setConfirmed(next);
  }

  function approve() {
    const items = matchedRows
      .filter((m) => confirmed[m.candidate.id] && m.tx)
      .map((m) => ({ id: m.candidate.id, paymentDate: m.tx!.date }));
    if (items.length === 0) {
      setError("Confirme ao menos uma solicitação antes de aprovar.");
      return;
    }
    setError(undefined);
    startTransition(async () => {
      const res = await reconcileReimbursements(statement!.bankName, items);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setSuccess(
        `${res.count} solicitação(ões) conciliada(s) via extrato do ${statement!.bankName}.`,
      );
      discard();
      router.refresh();
    });
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold text-ink">Conciliação bancária</h1>
        <span className="text-sm text-ink-muted">
          {candidates.length} solicitação(ões) conciliável(is)
        </span>
      </div>

      {success && (
        <div className="mb-4 rounded-xl border border-[#bfe0d3] bg-[#eef7f2] px-4 py-3 text-sm text-[#0b6e55]">
          {success}
        </div>
      )}
      {error && (
        <div className="mb-4 rounded-xl border border-[#eccac3] bg-[#fbf0ee] px-4 py-3 text-sm text-[#9b2f24]">
          {error}
        </div>
      )}

      {!statement ? (
        <Dropzone fileRef={fileRef} onFile={onFile} />
      ) : (
        <>
          {/* Cabeçalho do extrato */}
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-hairline bg-surface p-4">
            <div>
              <p className="text-sm font-semibold text-ink">
                {statement.bankName}
                {statement.acctId && (
                  <span className="font-normal text-ink-muted">
                    {" "}
                    · conta {statement.acctId}
                  </span>
                )}
              </p>
              <p className="text-xs text-ink-muted">
                {statement.start && statement.end
                  ? `Período ${formatDate(statement.start)} a ${formatDate(statement.end)}`
                  : statement.generatedAt
                    ? `Extrato de ${formatDate(statement.generatedAt)}`
                    : "Período não informado"}{" "}
                · {debitCount} débito(s) no arquivo
              </p>
            </div>
            <div className="flex items-end gap-3">
              <div>
                <Label htmlFor="days">Tolerância (dias)</Label>
                <Input
                  id="days"
                  type="number"
                  min={0}
                  max={60}
                  value={days}
                  onChange={(e) =>
                    setDays(Math.max(0, Number(e.target.value) || 0))
                  }
                  className="w-28"
                />
              </div>
              <Button type="button" variant="outline" size="sm" onClick={discard}>
                Trocar arquivo
              </Button>
            </div>
          </div>

          {/* Resumo + ações em massa */}
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2 text-sm text-ink-muted">
              <Pill className="bg-[#dcede6] text-[#0b6e55]">
                {matchedRows.length} conciliáveis
              </Pill>
              <Pill className="bg-[#d3e9ec] text-[#0a5e6e]">
                {confirmedCount} confirmados
              </Pill>
            </div>
            <label className="flex items-center gap-2 text-sm text-ink-muted">
              <input
                type="checkbox"
                checked={!onlyMatched}
                onChange={(e) => setOnlyMatched(!e.target.checked)}
                className="h-4 w-4 rounded border-hairline text-brand focus:ring-brand"
              />
              Mostrar todas as solicitações
            </label>
          </div>

          {/* Tabela (desktop) */}
          <div className="hidden overflow-x-auto rounded-2xl border border-hairline bg-surface lg:block">
            <table className="w-full text-left text-sm">
              <thead className="bg-[#faf9f4] text-xs uppercase text-ink-muted">
                <tr>
                  <th className="px-3 py-2" colSpan={4}>
                    Solicitação
                  </th>
                  <th
                    className="border-l border-hairline px-3 py-2"
                    colSpan={5}
                  >
                    Extrato
                  </th>
                  <th className="px-3 py-2 text-center">Situação</th>
                </tr>
                <tr className="text-[11px]">
                  <th className="px-3 py-2">Solicitante</th>
                  <th className="px-3 py-2 text-right">Valor</th>
                  <th className="px-3 py-2">Data solic.</th>
                  <th className="px-3 py-2">Data pgto.</th>
                  <th className="border-l border-hairline px-3 py-2 text-right">
                    Valor
                  </th>
                  <th className="px-3 py-2">Data</th>
                  <th className="px-3 py-2">Tipo</th>
                  <th className="px-3 py-2">Confiança</th>
                  <th className="px-3 py-2">Memo</th>
                  <th className="px-3 py-2 text-center"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-hairline">
                {rows.map((m) => (
                  <tr key={m.candidate.id} className="hover:bg-[#faf9f4]">
                    <td className="px-3 py-2 font-medium text-ink">
                      {m.candidate.requesterName}
                      <span className="block text-xs font-normal text-ink-faint">
                        #{m.candidate.id} · {m.candidate.departmentName}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-right font-medium text-ink">
                      {formatBRL(m.candidate.amount)}
                    </td>
                    <td className="px-3 py-2 text-ink-muted">
                      {formatDate(m.candidate.expenseDate)}
                    </td>
                    <td className="px-3 py-2 text-ink-muted">
                      {formatDate(m.candidate.paidAt)}
                    </td>
                    {m.tx ? (
                      <>
                        <td className="border-l border-hairline px-3 py-2 text-right font-medium text-ink">
                          {formatBRL(Math.abs(m.tx.amount))}
                        </td>
                        <td className="px-3 py-2 text-ink-muted">
                          {formatDate(m.tx.date)}
                        </td>
                        <td className="px-3 py-2 text-ink-muted">
                          {m.tx.type === "DEBIT" ? "Débito" : m.tx.type}
                        </td>
                        <td className="px-3 py-2">
                          <ConfidenceTag
                            confidence={m.confidence}
                            dayDiff={m.dayDiff}
                          />
                        </td>
                        <td
                          className="px-3 py-2 text-xs text-ink-muted"
                          title={m.tx.memo}
                        >
                          {m.tx.memo}
                        </td>
                        <td className="px-3 py-2 text-center">
                          <ConfirmSwitch
                            checked={!!confirmed[m.candidate.id]}
                            onChange={(v) =>
                              setConfirmed((c) => ({
                                ...c,
                                [m.candidate.id]: v,
                              }))
                            }
                          />
                        </td>
                      </>
                    ) : (
                      <>
                        <td
                          className="border-l border-hairline px-3 py-2 text-ink-faint"
                          colSpan={5}
                        >
                          — sem correspondência no extrato —
                        </td>
                        <td className="px-3 py-2 text-center">
                          <StatusBadge
                            status={m.candidate.status as Status}
                          />
                        </td>
                      </>
                    )}
                  </tr>
                ))}
                {rows.length === 0 && (
                  <tr>
                    <td
                      colSpan={10}
                      className="px-3 py-8 text-center text-ink-faint"
                    >
                      Nenhuma solicitação{onlyMatched ? " conciliável" : ""}{" "}
                      encontrada para este extrato.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Cards (mobile/tablet) */}
          <div className="space-y-3 lg:hidden">
            {rows.map((m) => (
              <div
                key={m.candidate.id}
                className="rounded-2xl border border-hairline bg-surface p-4"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-ink">
                      {m.candidate.requesterName}
                    </p>
                    <p className="text-xs text-ink-muted">
                      #{m.candidate.id} · {formatBRL(m.candidate.amount)} ·{" "}
                      {formatDate(m.candidate.expenseDate)}
                    </p>
                  </div>
                  {m.tx ? (
                    <ConfidenceTag
                      confidence={m.confidence}
                      dayDiff={m.dayDiff}
                    />
                  ) : (
                    <StatusBadge status={m.candidate.status as Status} />
                  )}
                </div>
                {m.tx ? (
                  <div className="mt-3 flex items-end justify-between gap-2">
                    <p className="text-sm text-ink-muted">
                      Extrato: {formatBRL(Math.abs(m.tx.amount))} ·{" "}
                      {formatDate(m.tx.date)}
                      <span
                        className="block max-w-[220px] truncate text-xs text-ink-faint"
                        title={m.tx.memo}
                      >
                        {m.tx.memo}
                      </span>
                    </p>
                    <ConfirmSwitch
                      checked={!!confirmed[m.candidate.id]}
                      onChange={(v) =>
                        setConfirmed((c) => ({ ...c, [m.candidate.id]: v }))
                      }
                    />
                  </div>
                ) : (
                  <p className="mt-2 text-sm text-ink-faint">
                    Sem correspondência no extrato.
                  </p>
                )}
              </div>
            ))}
            {rows.length === 0 && (
              <p className="py-8 text-center text-ink-faint">
                Nenhuma solicitação encontrada para este extrato.
              </p>
            )}
          </div>

          {/* Rodapé de ações */}
          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-hairline bg-surface p-4">
            <span className="text-sm text-ink-muted">
              {confirmedCount} confirmada(s) → marcar como Conciliado
            </span>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={confirmAll}
                disabled={matchedRows.length === 0 || pending}
              >
                Confirmar Todos
              </Button>
              <Button
                type="button"
                onClick={approve}
                disabled={confirmedCount === 0 || pending}
              >
                {pending ? "Aprovando…" : "Aprovar Confirmados"}
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function Dropzone({
  fileRef,
  onFile,
}: {
  fileRef: React.RefObject<HTMLInputElement | null>;
  onFile: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <div className="rounded-2xl border border-hairline bg-surface p-6">
      <label
        htmlFor="ofx"
        className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-[#d8d3c2] px-6 py-12 text-center hover:border-brand"
      >
        <svg
          width="28"
          height="28"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-brand"
        >
          <path d="M12 16V4M7 9l5-5 5 5M5 20h14" />
        </svg>
        <span className="text-sm font-semibold text-ink">
          Selecione o arquivo .OFX do extrato
        </span>
        <span className="max-w-md text-xs text-ink-muted">
          O arquivo é lido apenas no seu navegador para conferência. Nada é
          gravado no servidor; ao sair, os dados são descartados.
        </span>
        <input
          ref={fileRef}
          id="ofx"
          type="file"
          accept=".ofx,.txt,text/plain"
          onChange={onFile}
          className="hidden"
        />
      </label>
    </div>
  );
}

function Pill({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
        className || "bg-[#eef1e9] text-ink"
      }`}
    >
      {children}
    </span>
  );
}

function ConfidenceTag({
  confidence,
  dayDiff,
}: {
  confidence: "match" | "none";
  dayDiff: number | null;
}) {
  if (confidence === "match") {
    return (
      <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-full bg-[#dcede6] px-2 py-0.5 text-xs font-semibold text-[#0b6e55]">
        ● {dayDiff === 0 ? "mesma data" : `${dayDiff}d de diferença`}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-[#eef1e9] px-2 py-0.5 text-xs font-semibold text-ink-muted">
      ○ Sem match
    </span>
  );
}

function ConfirmSwitch({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="inline-flex items-center gap-2"
      title={checked ? "Confirmado" : "Pendente"}
    >
      <span
        className={`relative inline-block h-5 w-9 rounded-full transition-colors ${
          checked ? "bg-brand" : "bg-[#d4d0c2]"
        }`}
      >
        <span
          className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all ${
            checked ? "left-[18px]" : "left-0.5"
          }`}
        />
      </span>
      <span
        className={`text-xs font-medium ${
          checked ? "text-brand" : "text-ink-muted"
        }`}
      >
        {checked ? "Confirmado" : "Pendente"}
      </span>
    </button>
  );
}
