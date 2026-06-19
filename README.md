# ZapDoc — Gestão de Reembolsos

App para a tesouraria de uma organização sem fins lucrativos: recebe solicitações de
reembolso (com fotos das notas), grava em banco e permite gerenciar status, gerar
dashboard e extrair relatórios para prestação de contas.

## Stack

- **Next.js 16** (App Router, TypeScript) — deploy no **Vercel**
- **Supabase** (Postgres) + **Drizzle ORM** (driver `postgres.js`)
- **Vercel Blob** — fotos das notas fiscais
- **Auth.js (NextAuth v5)** — login do tesoureiro (credenciais)
- **Tailwind CSS v4** + **Recharts**

## Fluxo

Envio público (sem login) → status **Pendente** → **Verificado** →
**Aguardando pagamento** → **Pago** (ou **Recusado**, com motivo). Toda troca de
status fica no histórico.

## Páginas

- `/` — formulário público de envio (responsivo)
- `/admin` — dashboard (cards + gráficos)
- `/admin/solicitacoes` — listagem com filtros e troca de status
- `/admin/solicitacoes/[id]` — detalhe, edição, fotos, histórico
- `/admin/relatorios` — relatório por data/status + export CSV
- `/admin/departamentos` e `/admin/tipos-despesa` — cadastros

## Setup local

1. **Variáveis de ambiente** — copie o exemplo e preencha:

   ```bash
   cp .env.example .env.local
   ```

   - `DATABASE_URL`: Supabase → Connection Pooler / **Transaction** (porta 6543)
   - `DIRECT_URL`: conexão direta/Session (porta 5432) — usada por migrations
   - `BLOB_READ_WRITE_TOKEN`: token do Vercel Blob (Storage → Blob → Tokens)
   - `AUTH_SECRET`: gere com `npx auth secret`
   - `ADMIN_EMAIL` / `ADMIN_PASSWORD` / `ADMIN_NAME`: usados só no seed

2. **Instalar dependências**

   ```bash
   npm install
   ```

3. **Criar o schema no banco** (gera/aplica migrations)

   ```bash
   npm run db:migrate
   ```

   > Em desenvolvimento rápido, pode usar `npm run db:push` (sem arquivos de
   > migration). Migrations já versionadas ficam em `./drizzle`.

4. **Seed** (cria o admin + departamentos/tipos iniciais)

   ```bash
   npm run db:seed
   ```

5. **Rodar**

   ```bash
   npm run dev
   ```

   Acesse `http://localhost:3000` (envio) e `http://localhost:3000/admin` (login).

## Scripts

| Script | Função |
| --- | --- |
| `npm run dev` | ambiente de desenvolvimento |
| `npm run build` / `start` | build e produção |
| `npm run lint` | ESLint |
| `npm run db:generate` | gera migration a partir do schema |
| `npm run db:migrate` | aplica migrations |
| `npm run db:push` | sincroniza schema direto (dev) |
| `npm run db:studio` | Drizzle Studio |
| `npm run db:seed` | cria admin + cadastros iniciais |

## Deploy no Vercel

1. Importe o repositório no Vercel.
2. No **Supabase**, copie a connection string (Transaction pooler, 6543) para
   `DATABASE_URL` nas Environment Variables da Vercel.
3. Crie um store **Blob** — injeta `BLOB_READ_WRITE_TOKEN`.
4. Defina `AUTH_SECRET` nas Environment Variables.
5. Após o primeiro deploy, rode as migrations e o seed apontando para o banco de
   produção (localmente, com `DATABASE_URL` de produção no `.env.local`):

   ```bash
   npm run db:migrate && npm run db:seed
   ```

## Roadmap (v2)

- Envio por **WhatsApp**
- Notificações automáticas ao solicitante
- Export em PDF
