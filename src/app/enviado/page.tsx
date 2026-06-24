import Link from "next/link";
import { formatBRL, formatDateTime } from "@/lib/utils";

export default async function EnviadoPage({
  searchParams,
}: {
  searchParams: Promise<{ protocolo?: string; valor?: string; data?: string }>;
}) {
  const { protocolo, valor, data } = await searchParams;

  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col items-center justify-center px-4 py-16 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-2xl">
        ✓
      </div>
      <h1 className="mt-4 text-2xl font-bold text-ink">
        Solicitação enviada!
      </h1>
      <p className="mt-2 text-ink-muted">
        Recebemos sua solicitação de reembolso. Ela está <strong>nova</strong>,
        aguardando conferência pelo tesoureiro.
      </p>

      {protocolo && (
        <div className="mt-4 w-full rounded-2xl border border-hairline bg-[#faf9f4] px-5 py-4 text-left text-sm">
          <div className="flex justify-between gap-3 py-1">
            <span className="text-ink-muted">Protocolo</span>
            <span className="font-semibold text-ink">#{protocolo}</span>
          </div>
          {valor && (
            <div className="flex justify-between gap-3 py-1">
              <span className="text-ink-muted">Valor solicitado</span>
              <span className="font-semibold text-ink">
                {formatBRL(valor)}
              </span>
            </div>
          )}
          {data && (
            <div className="flex justify-between gap-3 py-1">
              <span className="text-ink-muted">Data de envio</span>
              <span className="font-semibold text-ink">
                {formatDateTime(data)}
              </span>
            </div>
          )}
          <p className="mt-2 text-xs text-ink-faint">
            Guarde este comprovante (você pode tirar um print desta tela).
          </p>
        </div>
      )}

      <Link
        href="/"
        className="mt-8 inline-flex h-10 items-center rounded-md bg-brand px-4 text-sm font-medium text-white hover:bg-brand-600"
      >
        Enviar outra solicitação
      </Link>
    </main>
  );
}
