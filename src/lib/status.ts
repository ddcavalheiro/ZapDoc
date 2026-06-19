/** Status do fluxo de reembolso. Mantido em um único lugar para reuso. */
export const STATUS = {
  PENDENTE: "PENDENTE",
  VERIFICADO: "VERIFICADO",
  AGUARDANDO_PAGAMENTO: "AGUARDANDO_PAGAMENTO",
  PAGO: "PAGO",
  RECUSADO: "RECUSADO",
} as const;

export type Status = (typeof STATUS)[keyof typeof STATUS];

export const STATUS_VALUES = Object.values(STATUS) as Status[];

/** Ordem do fluxo (para ordenação e dashboards). */
export const STATUS_ORDER: Status[] = [
  STATUS.PENDENTE,
  STATUS.VERIFICADO,
  STATUS.AGUARDANDO_PAGAMENTO,
  STATUS.PAGO,
  STATUS.RECUSADO,
];

export const STATUS_LABELS: Record<Status, string> = {
  PENDENTE: "Pendente",
  VERIFICADO: "Verificado",
  AGUARDANDO_PAGAMENTO: "Aguardando pagamento",
  PAGO: "Pago",
  RECUSADO: "Recusado",
};

/** Classes Tailwind para o badge de cada status. */
export const STATUS_BADGE: Record<Status, string> = {
  PENDENTE: "bg-amber-100 text-amber-800 ring-amber-600/20",
  VERIFICADO: "bg-sky-100 text-sky-800 ring-sky-600/20",
  AGUARDANDO_PAGAMENTO: "bg-violet-100 text-violet-800 ring-violet-600/20",
  PAGO: "bg-emerald-100 text-emerald-800 ring-emerald-600/20",
  RECUSADO: "bg-rose-100 text-rose-800 ring-rose-600/20",
};

/** Cor base (hex) para gráficos. */
export const STATUS_COLOR: Record<Status, string> = {
  PENDENTE: "#d97706",
  VERIFICADO: "#0284c7",
  AGUARDANDO_PAGAMENTO: "#7c3aed",
  PAGO: "#059669",
  RECUSADO: "#e11d48",
};

export function isStatus(value: string): value is Status {
  return (STATUS_VALUES as string[]).includes(value);
}
