"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { logoutAction } from "@/actions/auth";
import { AdminNav } from "@/components/admin-nav";

/** Rotas que não usam o shell (barra lateral), mesmo com sessão ativa. */
const BARE_ROUTES = ["/admin/login", "/admin/onboarding"];

type ShellUser = { name?: string | null; email?: string | null };

function SidebarContent({ user }: { user: ShellUser }) {
  const initials = (user.name ?? user.email ?? "?").slice(0, 2).toUpperCase();
  return (
    <>
      <div className="flex items-center gap-3 px-2 py-1">
        <div className="flex h-8 w-8 items-center justify-center rounded-[9px] bg-gradient-to-br from-[#19a079] to-brand font-display text-base font-bold text-white">
          Z
        </div>
        <span className="font-display text-lg font-semibold text-white">
          ZapDoc
        </span>
      </div>

      <AdminNav />

      <form action={logoutAction} className="mt-auto">
        <div className="flex items-center gap-3 rounded-xl bg-white/5 p-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#2c2a20] font-display text-xs font-semibold text-[#e8e5d8]">
            {initials}
          </div>
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold text-[#ece9dd]">
              {user.name ?? "Tesouraria"}
            </div>
            <button
              type="submit"
              className="text-xs text-[#7a786c] hover:text-white"
            >
              Sair
            </button>
          </div>
        </div>
      </form>
    </>
  );
}

export function AdminShell({
  user,
  children,
}: {
  user: ShellUser;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // Fecha o drawer ao navegar (ajuste de estado durante a render, sem effect).
  const [lastPath, setLastPath] = useState(pathname);
  if (pathname !== lastPath) {
    setLastPath(pathname);
    setOpen(false);
  }

  // Sem shell nas telas de login/onboarding.
  if (BARE_ROUTES.includes(pathname)) {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-full bg-paper">
      {/* Sidebar (desktop) */}
      <aside className="hidden w-60 flex-none flex-col bg-sidebar p-4 md:flex">
        <SidebarContent user={user} />
      </aside>

      {/* Drawer (mobile) */}
      {open && (
        <div className="fixed inset-0 z-40 md:hidden">
          <button
            type="button"
            aria-label="Fechar menu"
            className="absolute inset-0 bg-black/40"
            onClick={() => setOpen(false)}
          />
          <aside className="absolute left-0 top-0 flex h-full w-64 flex-col bg-sidebar p-4 shadow-xl">
            <SidebarContent user={user} />
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Barra superior (mobile) com botão de menu */}
        <header className="flex items-center gap-3 border-b border-hairline bg-surface px-4 py-3 md:hidden">
          <button
            type="button"
            aria-label="Abrir menu"
            onClick={() => setOpen(true)}
            className="-ml-1 inline-flex h-9 w-9 items-center justify-center rounded-[10px] text-ink hover:bg-[#eef1e9]"
          >
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            >
              <path d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <span className="font-display text-lg font-semibold text-ink">
            ZapDoc
          </span>
        </header>

        <main
          className={`mx-auto w-full flex-1 px-5 py-7 md:px-8 ${
            // Conciliação usa largura total (tabela larga); demais telas, max-w-6xl.
            pathname.startsWith("/admin/conciliacao") ? "max-w-none" : "max-w-6xl"
          }`}
        >
          {children}
        </main>
      </div>
    </div>
  );
}
