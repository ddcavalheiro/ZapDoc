import Link from "next/link";

export default async function EnviadoPage({
  searchParams,
}: {
  searchParams: Promise<{ protocolo?: string }>;
}) {
  const { protocolo } = await searchParams;

  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col items-center justify-center px-4 py-16 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-2xl">
        ✓
      </div>
      <h1 className="mt-4 text-2xl font-bold text-slate-900">
        Solicitação enviada!
      </h1>
      <p className="mt-2 text-slate-600">
        Recebemos sua solicitação de reembolso. Ela está{" "}
        <strong>pendente</strong> de conferência pelo tesoureiro.
      </p>
      {protocolo && (
        <p className="mt-3 rounded-md bg-slate-100 px-4 py-2 text-sm text-slate-700">
          Protocolo: <strong>#{protocolo}</strong>
        </p>
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
