# Aplicando o redesign do ZapDoc no código

O redesign vive numa única linguagem visual. Em vez de tocar tela por tela, você
centraliza tudo em **tokens + componentes compartilhados** e o estilo cascateia.
Ordem sugerida: 1 → 6. Os passos 1–5 já mudam ~80% da aparência.

Stack: Next.js + Tailwind **v4** (tokens via `@theme` no CSS, sem `tailwind.config`).

---

## 1. Tokens de cor + fontes — `src/app/globals.css`

Substitua o arquivo inteiro:

```css
@import "tailwindcss";

@theme {
  /* superfícies */
  --color-paper: #f4f2ec;      /* fundo da app (substitui o slate frio) */
  --color-surface: #ffffff;    /* cards */
  --color-hairline: #e7e3d8;   /* bordas */

  /* texto */
  --color-ink: #16150f;        /* títulos / texto forte */
  --color-ink-muted: #6e6b5e;  /* secundário */
  --color-ink-faint: #8a877a;  /* rótulos / placeholders */

  /* marca */
  --color-brand: #0b6e55;      /* ações, links, destaque */
  --color-brand-600: #0a604a;  /* hover */
  --color-brand-50: #dcede6;   /* tint */
  --color-sidebar: #15140e;    /* fundo da barra lateral */

  /* tipografia */
  --font-sans: var(--font-instrument-sans);
  --font-display: var(--font-space-grotesk); /* números e títulos */
}

body {
  background: var(--color-paper);
  color: var(--color-ink);
}

/* números tabulares para valores em R$ */
.tnum { font-feature-settings: "tnum" 1; }
```

Isso cria utilitários `bg-paper`, `bg-surface`, `border-hairline`, `text-ink`,
`text-ink-muted`, `bg-brand`, `text-brand`, `font-display` etc.

---

## 2. Fontes — `src/app/layout.tsx`

Troque Geist por **Instrument Sans** (corpo) + **Space Grotesk** (números/títulos):

```tsx
import type { Metadata } from "next";
import { Instrument_Sans, Space_Grotesk } from "next/font/google";
import "./globals.css";

const sans = Instrument_Sans({
  variable: "--font-instrument-sans",
  subsets: ["latin"],
});

const display = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ZapDoc — Reembolsos",
  description: "Envio e gestão de solicitações de reembolso",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="pt-BR"
      className={`${sans.variable} ${display.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-paper text-ink">
        {children}
      </body>
    </html>
  );
}
```

> Use `font-display tnum` nos números grandes (valores, contadores do dashboard).

---

## 3. Badges de status — `src/lib/status.ts`

Troque os dois mapas de cor (mantêm os mesmos status, só esquenta a paleta):

```ts
/** Classes Tailwind para o badge de cada status. */
export const STATUS_BADGE: Record<Status, string> = {
  PENDENTE: "bg-[#f8edd3] text-[#8a6410]",
  VERIFICADO: "bg-[#e2ecf7] text-[#1f4e86]",
  AGUARDANDO_PAGAMENTO: "bg-[#e8e6f7] text-[#433ba0]",
  PAGO: "bg-[#dcede6] text-[#0b6e55]",
  RECUSADO: "bg-[#f7e2de] text-[#9b2f24]",
};

/** Cor base (hex) para gráficos e o ponto do badge. */
export const STATUS_COLOR: Record<Status, string> = {
  PENDENTE: "#c9921f",
  VERIFICADO: "#235fa8",
  AGUARDANDO_PAGAMENTO: "#574fbc",
  PAGO: "#0b6e55",
  RECUSADO: "#b23a2e",
};
```

E adicione o **pontinho** no badge — `src/components/status-badge.tsx`:

```tsx
import { cn } from "@/lib/utils";
import {
  STATUS_BADGE,
  STATUS_COLOR,
  STATUS_LABELS,
  type Status,
} from "@/lib/status";

export function StatusBadge({
  status,
  className,
}: {
  status: Status;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap",
        STATUS_BADGE[status],
        className,
      )}
    >
      <span
        className="h-1.5 w-1.5 rounded-full"
        style={{ background: STATUS_COLOR[status] }}
      />
      {STATUS_LABELS[status]}
    </span>
  );
}
```

---

## 4. Botões — `src/components/ui/button.tsx`

Troque `variants`, `sizes` e o raio base:

```ts
const variants: Record<Variant, string> = {
  primary: "bg-brand text-white hover:bg-brand-600 disabled:bg-[#9bbcb1]",
  secondary: "bg-[#eef1e9] text-ink hover:bg-[#e4e8dd]",
  outline: "border border-hairline bg-surface text-ink hover:bg-[#fbfaf6]",
  ghost: "text-ink-muted hover:bg-[#eef1e9]",
  danger: "bg-[#b23a2e] text-white hover:bg-[#9b2f24] disabled:bg-[#d9b0aa]",
};

const sizes: Record<Size, string> = {
  sm: "h-9 px-3.5 text-sm",
  md: "h-10 px-4 text-sm",
};
```

E no `className` base do `<button>`: troque `rounded-md` → `rounded-[10px]` e
`focus-visible:ring-slate-400` → `focus-visible:ring-brand`.

---

## 5. Inputs / selects — `src/components/ui/field.tsx`

Troque a constante `base`:

```ts
const base =
  "w-full rounded-[10px] border border-[#e0dbcb] bg-surface px-3 py-2.5 text-sm text-ink shadow-sm placeholder:text-[#a8a496] focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand disabled:bg-paper";
```

E no `Label`: `text-slate-700` → `text-ink` (e `font-medium` → `font-semibold`).

---

## 6. Barra lateral — `src/app/admin/layout.tsx`

Substitui a nav de abas por uma sidebar escura agrupada. Arquivo completo:

```tsx
import Link from "next/link";
import { auth } from "@/lib/auth";
import { logoutAction } from "@/actions/auth";

const NAV = [
  { group: "Gestão", items: [
    { href: "/admin", label: "Dashboard", icon: "grid" },
    { href: "/admin/solicitacoes", label: "Solicitações", icon: "list" },
    { href: "/admin/relatorios", label: "Relatórios", icon: "chart" },
  ]},
  { group: "Cadastros", items: [
    { href: "/admin/departamentos", label: "Departamentos", icon: "building" },
    { href: "/admin/tipos-despesa", label: "Tipos de despesa", icon: "tag" },
    { href: "/admin/usuarios", label: "Usuários", icon: "users" },
    { href: "/admin/roles", label: "Papéis", icon: "shield" },
  ]},
] as const;

const ICONS: Record<string, React.ReactNode> = {
  grid: <><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></>,
  list: <><path d="M8 6h12M8 12h12M8 18h12"/><circle cx="4" cy="6" r="0.9"/><circle cx="4" cy="12" r="0.9"/><circle cx="4" cy="18" r="0.9"/></>,
  chart: <path d="M4 20V10M10 20V4M16 20v-7M2 20h20"/>,
  building: <><rect x="5" y="3" width="14" height="18" rx="1.5"/><path d="M9 7h2M13 7h2M9 11h2M13 11h2M9 15h6"/></>,
  tag: <><path d="M3 3h7l11 11-7 7L3 10V3z"/><circle cx="7.5" cy="7.5" r="1.3"/></>,
  users: <><circle cx="9" cy="8" r="3.2"/><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6"/><path d="M16 5.6a3.2 3.2 0 0 1 0 5M18.5 14c2 .6 3.5 2.5 3.5 5"/></>,
  shield: <path d="M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6l7-3z"/>,
};

function NavIcon({ name }: { name: string }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      {ICONS[name]}
    </svg>
  );
}

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) return <>{children}</>;

  return (
    <div className="flex min-h-full bg-paper">
      <aside className="hidden w-60 flex-none flex-col bg-sidebar p-4 md:flex">
        <div className="flex items-center gap-3 px-2 py-1">
          <div className="flex h-8 w-8 items-center justify-center rounded-[9px] bg-gradient-to-br from-[#19a079] to-brand font-display text-base font-bold text-white">
            Z
          </div>
          <span className="font-display text-lg font-semibold text-white">ZapDoc</span>
        </div>

        <nav className="mt-5 flex flex-col gap-0.5">
          {NAV.map((section) => (
            <div key={section.group}>
              <div className="px-3 pb-2 pt-4 text-[10.5px] font-semibold uppercase tracking-wider text-[#5f5d52]">
                {section.group}
              </div>
              {section.items.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex items-center gap-3 rounded-[10px] px-3 py-2.5 text-sm font-medium text-[#b4b1a4] hover:bg-white/5 hover:text-white"
                >
                  <NavIcon name={item.icon} />
                  {item.label}
                </Link>
              ))}
            </div>
          ))}
        </nav>

        <form action={logoutAction} className="mt-auto">
          <div className="flex items-center gap-3 rounded-xl bg-white/5 p-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#2c2a20] font-display text-xs font-semibold text-[#e8e5d8]">
              {(session.user.name ?? session.user.email ?? "?").slice(0, 2).toUpperCase()}
            </div>
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold text-[#ece9dd]">
                {session.user.name ?? "Tesouraria"}
              </div>
              <button type="submit" className="text-xs text-[#7a786c] hover:text-white">
                Sair
              </button>
            </div>
          </div>
        </form>
      </aside>

      <main className="mx-auto w-full max-w-6xl flex-1 px-5 py-7 md:px-8">
        {children}
      </main>
    </div>
  );
}
```

> **Ativo:** para marcar o item da rota atual, torne o `AdminLayout` capaz de ler
> o pathname. Como o layout é server component, a forma mais simples é extrair a
> `<nav>` para um client component (`"use client"` + `usePathname()`) e aplicar,
> no item ativo: `bg-white/[0.08] text-white shadow-[inset_2px_0_0_#1fb089]`.

---

## 7. Cheatsheet — find/replace nas páginas restantes

Nas páginas (`admin/page.tsx`, `solicitacoes/page.tsx`, `page.tsx` público,
detalhe, etc.) faça estas substituições para alinhar com o sistema:

| Procurar | Trocar por |
| --- | --- |
| `border-slate-200` / `border-slate-300` | `border-hairline` |
| `bg-white` | `bg-surface` |
| `text-slate-900` | `text-ink` |
| `text-slate-500` / `text-slate-600` | `text-ink-muted` |
| `text-slate-400` | `text-ink-faint` |
| `rounded-lg` / `rounded-xl` (cards) | `rounded-2xl` |
| `bg-slate-50` (cabeçalho de tabela) | `bg-[#faf9f4]` |
| números grandes (valores, KPIs) | adicionar `font-display tnum` |
| links de ação ("Ver →") | `text-brand` |

**Dashboard** (`admin/page.tsx`): nos cards, troque `rounded-lg border border-slate-200 bg-white p-4`
por `rounded-2xl border border-hairline bg-surface p-5`; nos valores grandes use
`font-display tnum`. As cores `text-amber-600` etc. podem virar as do `STATUS_COLOR`
(ou deixar — já harmonizam). Opcional: faça o card "A pagar" invertido
(`bg-ink text-white`) como na proposta.

**Form público** (`page.tsx`): troque o container `rounded-xl border border-slate-200 bg-white`
por `rounded-2xl border border-hairline bg-surface`, e a área de upload por uma
caixa tracejada (`border-2 border-dashed border-[#cfc9b7] rounded-xl bg-[#fbfaf6]`).

---

## Resultado esperado

- Fundo papel quente no lugar do cinza-azulado.
- Navegação lateral escura com agrupamento (Gestão / Cadastros).
- Verde institucional como única cor de ação; status com pílula + ponto.
- Números em Space Grotesk com alinhamento tabular.

A referência visual de cada tela está no arquivo **`ZapDoc Redesign.dc.html`**.
