import Link from "next/link";
import { auth } from "@/lib/auth";
import { logoutAction } from "@/actions/auth";

const NAV = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/solicitacoes", label: "Solicitações" },
  { href: "/admin/relatorios", label: "Relatórios" },
  { href: "/admin/departamentos", label: "Departamentos" },
  { href: "/admin/tipos-despesa", label: "Tipos de despesa" },
];

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  // Sem sessão (ex.: página de login): renderiza sem o shell.
  if (!session?.user) {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-full flex-col">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <Link href="/admin" className="text-lg font-bold text-slate-900">
              ZapDoc
            </Link>
            <span className="hidden text-xs text-slate-400 sm:inline">
              {session.user.email}
            </span>
          </div>
          <form action={logoutAction}>
            <button
              type="submit"
              className="text-sm text-slate-500 hover:text-slate-800 hover:underline"
            >
              Sair
            </button>
          </form>
        </div>
        <nav className="mx-auto max-w-6xl px-4">
          <ul className="flex gap-1 overflow-x-auto pb-px">
            {NAV.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="inline-block whitespace-nowrap border-b-2 border-transparent px-3 py-2 text-sm font-medium text-slate-600 hover:border-slate-300 hover:text-slate-900"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">
        {children}
      </main>
    </div>
  );
}
