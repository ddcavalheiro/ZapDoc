/**
 * Parser de OFX 1.x (SGML) — extrato bancário.
 *
 * Executa no browser (sem `server-only`): o arquivo é lido só para conferência
 * e descartado após o uso, sem persistir o XML bruto.
 *
 * Particularidades do OFX brasileiro tratadas aqui:
 * - valor com vírgula decimal (`2206,95`) → normalizado para número;
 * - moeda `BRC` (inválida) tolerada como `BRL`;
 * - tags SGML não fechadas (`<TRNAMT>10,00` sem `</TRNAMT>`);
 * - data `YYYYMMDDHHMMSS[-3:GMT]` → `yyyy-mm-dd`;
 * - `MEMO` com espaços de preenchimento → colapsados.
 */

export interface OfxTransaction {
  type: string; // CREDIT | DEBIT | ...
  date: string; // yyyy-mm-dd
  amount: number; // com sinal (débitos negativos)
  fitid: string;
  checknum?: string;
  memo: string;
}

export interface OfxStatement {
  bankId?: string; // BANKID (ex.: 033)
  org?: string; // <ORG> (ex.: SANTANDER)
  bankName: string; // nome amigável resolvido
  acctId?: string;
  currency: string;
  start?: string; // yyyy-mm-dd (DTSTART)
  end?: string; // yyyy-mm-dd (DTEND)
  generatedAt?: string; // yyyy-mm-dd (DTSERVER)
  transactions: OfxTransaction[];
}

/** Mapa de bancos conhecidos (BANKID → nome). Adicionar conforme novos bancos. */
const BANK_NAMES: Record<string, string> = {
  "033": "Santander",
  "001": "Banco do Brasil",
  "104": "Caixa Econômica Federal",
  "237": "Bradesco",
  "341": "Itaú",
  "260": "Nubank",
  "077": "Inter",
};

/** Resolve o nome amigável do banco a partir de BANKID/ORG. */
function resolveBankName(bankId?: string, org?: string): string {
  if (bankId && BANK_NAMES[bankId]) return BANK_NAMES[bankId];
  if (org) {
    // Title-case simples do ORG (ex.: "SANTANDER" → "Santander").
    return org
      .toLowerCase()
      .replace(/\b\w/g, (c) => c.toUpperCase())
      .trim();
  }
  return "Banco não identificado";
}

/** Lê o valor de uma tag SGML (`<TAG>valor` até o próximo `<` ou quebra de linha). */
function tag(block: string, name: string): string | undefined {
  const m = block.match(new RegExp(`<${name}>([^<\\r\\n]*)`, "i"));
  return m ? m[1].trim() : undefined;
}

/** `20260504000000[-3:GMT]` → `2026-05-04`. */
function parseOfxDate(raw?: string): string | undefined {
  if (!raw) return undefined;
  const m = raw.match(/^(\d{4})(\d{2})(\d{2})/);
  if (!m) return undefined;
  return `${m[1]}-${m[2]}-${m[3]}`;
}

/** `2206,95` ou `-8432,95` → número. */
function parseOfxAmount(raw?: string): number {
  if (!raw) return NaN;
  return Number(raw.replace(/\s/g, "").replace(",", "."));
}

/** Colapsa os espaços de preenchimento do MEMO. */
function cleanMemo(raw?: string): string {
  return (raw ?? "").replace(/\s+/g, " ").trim();
}

export class OfxParseError extends Error {}

/** Faz o parse de um conteúdo OFX. Lança `OfxParseError` se inválido. */
export function parseOfx(content: string): OfxStatement {
  if (!content || !/<OFX>/i.test(content)) {
    throw new OfxParseError(
      "Arquivo não parece um extrato OFX válido (tag <OFX> ausente).",
    );
  }

  const bankId = tag(content, "BANKID");
  const org = tag(content, "ORG");
  const acctId = tag(content, "ACCTID");
  const currencyRaw = tag(content, "CURDEF");
  // BRC é um código inválido emitido por alguns bancos; trata como BRL.
  const currency =
    currencyRaw && currencyRaw.toUpperCase() !== "BRC"
      ? currencyRaw.toUpperCase()
      : "BRL";

  const start = parseOfxDate(tag(content, "DTSTART"));
  const end = parseOfxDate(tag(content, "DTEND"));
  const generatedAt = parseOfxDate(tag(content, "DTSERVER"));

  const transactions: OfxTransaction[] = [];
  const blocks = content.match(/<STMTTRN>[\s\S]*?<\/STMTTRN>/gi) ?? [];
  for (const block of blocks) {
    const date = parseOfxDate(tag(block, "DTPOSTED"));
    const amount = parseOfxAmount(tag(block, "TRNAMT"));
    const fitid = tag(block, "FITID");
    if (!date || Number.isNaN(amount) || !fitid) continue; // transação incompleta
    const checknum = tag(block, "CHECKNUM");
    transactions.push({
      type: (tag(block, "TRNTYPE") ?? "").toUpperCase(),
      date,
      amount,
      fitid,
      checknum: checknum && checknum !== "00000000" ? checknum : undefined,
      memo: cleanMemo(tag(block, "MEMO")),
    });
  }

  if (transactions.length === 0) {
    throw new OfxParseError("Nenhuma transação encontrada no arquivo OFX.");
  }

  return {
    bankId,
    org,
    bankName: resolveBankName(bankId, org),
    acctId,
    currency,
    start,
    end,
    generatedAt,
    transactions,
  };
}
