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
      <h1 className="mt-4 text-2xl font-bold text-slate-900">
        Solicitação enviada!
      </h1>
      <p className="mt-2 text-slate-600">
        Recebemos sua solicitação de reembolso. Ela está <strong>nova</strong>,
        aguardando conferência pelo tesoureiro.
      </p>

      {protocolo && (
        <div className="mt-4 w-full rounded-lg border border-slate-200 bg-slate-50 px-5 py-4 text-left text-sm">
          <div className="flex justify-between gap-3 py-1">
            <span className="text-slate-500">Protocolo</span>
            <span className="font-semibold text-slate-800">#{protocolo}</span>
          </div>
          {valor && (
            <div className="flex justify-between gap-3 py-1">
              <span className="text-slate-500">Valor solicitado</span>
              <span className="font-semibold text-slate-800">
                {formatBRL(valor)}
              </span>
            </div>
          )}
          {data && (
            <div className="flex justify-between gap-3 py-1">
              <span className="text-slate-500">Data de envio</span>
              <span className="font-semibold text-slate-800">
                {formatDateTime(data)}
              </span>
            </div>
          )}
          <p className="mt-2 text-xs text-slate-400">
            Guarde este comprovante (você pode tirar um print desta tela).
          </p>
        </div>
      )}

      <Link
        href="/"
        className="mt-8 inline-flex h-10 items-center rounded-md bg-slate-900 px-4 text-sm font-medium text-white hover:bg-slate-800"
      >
        Enviar outra solicitação
      </Link>
    </main>
  );
}
