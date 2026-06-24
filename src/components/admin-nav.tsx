"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const NAV = [
  {
    group: "Gestão",
    items: [
      { href: "/admin", label: "Dashboard", icon: "grid" },
      { href: "/admin/solicitacoes", label: "Solicitações", icon: "list" },
      { href: "/admin/relatorios", label: "Relatórios", icon: "chart" },
    ],
  },
  {
    group: "Cadastros",
    items: [
      { href: "/admin/departamentos", label: "Departamentos", icon: "building" },
      { href: "/admin/tipos-despesa", label: "Tipos de despesa", icon: "tag" },
      { href: "/admin/usuarios", label: "Usuários", icon: "users" },
      { href: "/admin/roles", label: "Perfis de Acesso", icon: "shield" },
    ],
  },
] as const;

const ICONS: Record<string, React.ReactNode> = {
  grid: (
    <>
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
    </>
  ),
  list: (
    <>
      <path d="M8 6h12M8 12h12M8 18h12" />
      <circle cx="4" cy="6" r="0.9" />
      <circle cx="4" cy="12" r="0.9" />
      <circle cx="4" cy="18" r="0.9" />
    </>
  ),
  chart: <path d="M4 20V10M10 20V4M16 20v-7M2 20h20" />,
  building: (
    <>
      <rect x="5" y="3" width="14" height="18" rx="1.5" />
      <path d="M9 7h2M13 7h2M9 11h2M13 11h2M9 15h6" />
    </>
  ),
  tag: (
    <>
      <path d="M3 3h7l11 11-7 7L3 10V3z" />
      <circle cx="7.5" cy="7.5" r="1.3" />
    </>
  ),
  users: (
    <>
      <circle cx="9" cy="8" r="3.2" />
      <path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6" />
      <path d="M16 5.6a3.2 3.2 0 0 1 0 5M18.5 14c2 .6 3.5 2.5 3.5 5" />
    </>
  ),
  shield: <path d="M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6l7-3z" />,
};

function NavIcon({ name }: { name: string }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {ICONS[name]}
    </svg>
  );
}

function isActive(pathname: string, href: string) {
  if (href === "/admin") return pathname === "/admin";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AdminNav() {
  const pathname = usePathname();

  return (
    <nav className="mt-5 flex flex-col gap-0.5">
      {NAV.map((section) => (
        <div key={section.group}>
          <div className="px-3 pb-2 pt-4 text-[10.5px] font-semibold uppercase tracking-wider text-[#5f5d52]">
            {section.group}
          </div>
          {section.items.map((item) => {
            const active = isActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-center gap-3 rounded-[10px] px-3 py-2.5 text-sm font-medium",
                  active
                    ? "bg-white/[0.08] text-white shadow-[inset_2px_0_0_#1fb089]"
                    : "text-[#b4b1a4] hover:bg-white/5 hover:text-white",
                )}
              >
                <NavIcon name={item.icon} />
                {item.label}
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
}
