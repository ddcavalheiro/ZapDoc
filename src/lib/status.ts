/** Status do fluxo de reembolso. Mantido em um único lugar para reuso. */
export const STATUS = {
  PENDENTE: "PENDENTE",
  VERIFICADO: "VERIFICADO",
  AGUARDANDO_PAGAMENTO: "AGUARDANDO_PAGAMENTO",
  PAGO: "PAGO",
  CONCILIADO: "CONCILIADO",
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
  STATUS.CONCILIADO,
  STATUS.RECUSADO,
];

/**
 * Status "em aberto" — tudo que ainda não foi pago nem recusado.
 * Usado pelo filtro customizado "Pendentes" (padrão da listagem).
 */
export const OPEN_STATUSES: Status[] = [
  STATUS.PENDENTE,
  STATUS.VERIFICADO,
  STATUS.AGUARDANDO_PAGAMENTO,
];

export const STATUS_LABELS: Record<Status, string> = {
  PENDENTE: "Novo",
  VERIFICADO: "Verificando",
  AGUARDANDO_PAGAMENTO: "Pendente de pagamento",
  PAGO: "Pago",
  CONCILIADO: "Conciliado",
  RECUSADO: "Recusado",
};

/** Classes Tailwind para o badge de cada status. */
export const STATUS_BADGE: Record<Status, string> = {
  PENDENTE: "bg-[#f8edd3] text-[#8a6410]",
  VERIFICADO: "bg-[#e2ecf7] text-[#1f4e86]",
  AGUARDANDO_PAGAMENTO: "bg-[#e8e6f7] text-[#433ba0]",
  PAGO: "bg-[#dcede6] text-[#0b6e55]",
  CONCILIADO: "bg-[#d3e9ec] text-[#0a5e6e]",
  RECUSADO: "bg-[#f7e2de] text-[#9b2f24]",
};

/** Cor base (hex) para gráficos e o ponto do badge. */
export const STATUS_COLOR: Record<Status, string> = {
  PENDENTE: "#c9921f",
  VERIFICADO: "#235fa8",
  AGUARDANDO_PAGAMENTO: "#574fbc",
  PAGO: "#0b6e55",
  CONCILIADO: "#0e7d90",
  RECUSADO: "#b23a2e",
};

export function isStatus(value: string): value is Status {
  return (STATUS_VALUES as string[]).includes(value);
}
