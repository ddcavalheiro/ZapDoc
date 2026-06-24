# Levantamento de Requisitos — ZapDoc

> Documento **vivo**. Registra o entendimento, as decisões e as dúvidas em aberto
> antes da implementação. Atualizado à medida que amadurecemos cada requisito.
> Nada aqui é implementação — é alinhamento.

**Legenda de status de cada requisito**
`🔎 Levantamento` · `✅ Decidido` · `🚧 Em implementação` · `🟢 Entregue`

| ID | Tema | Status |
|----|------|--------|
| [REQ1](#req1--conciliação-bancária) | Conciliação bancária | 🔎 Levantamento |
| [REQ2](#req2--login-com-roles) | Login + MFA (fundação de identidade) | 🟢 Entregue (reformulado) |
| [REQ3](#req3--auditoria) | Auditoria | ✅ Decidido (próximo) |
| [REQ4](#req4--segurança-de-dados-sensíveis) | Segurança de dados sensíveis | 🔎 Levantamento |

---

## Contexto atual do sistema (baseline)

Estado de hoje, para servir de referência ao que vamos evoluir:

- **Stack:** Next.js 16 (App Router), Drizzle ORM + Postgres (Supabase), next-auth v5 (beta), Vercel Blob para anexos, deploy na Vercel.
- **Autenticação:** **(atualizado 2026-06-23)** login com **papéis** (`roles`, só
  `ADMIN` hoje) e **MFA TOTP obrigatório**. Usuários são criados pelo admin com senha
  temporária; no 1º acesso trocam a senha e configuram o autenticador. Ver [REQ2](#req2--login-com-roles).
- **Solicitação de reembolso:** formulário **público** (`/`), sem login (mantido).
- **Fluxo de status atual:** `PENDENTE → VERIFICADO → AGUARDANDO_PAGAMENTO → PAGO`
  (+ `RECUSADO`). `PAGO` é o estado final do reembolso.
- **Auditoria existente (parcial):** tabela `status_history` registra apenas mudanças de status.
- **Dados sensíveis já trafegados/armazenados:** `payment_details` (conta/PIX),
  `payee_name`, `requester_name`, e anexos de nota fiscal em Vercel Blob
  (`note_attachments`).

---

## Visão geral e sequência recomendada

Os quatro requisitos são interdependentes. Sequência lógica sugerida — cada um
habilita o seguinte:

```
REQ2 (roles) → REQ3 (auditoria) → REQ4 (segurança) → REQ1 (conciliação)
```

- **Auditoria (REQ3)** só faz sentido com "quem fez" definido → depende de **roles (REQ2)**.
- **Segurança (REQ4)** molda como a conciliação armazena/descarta o extrato → precede **REQ1**.
- **Conciliação (REQ1)** é a de maior valor visível, mas a que mais se apoia nas outras três.

> A entrega pode ser fatiada, mas essa é a espinha de dependência. Decisão de
> fatiamento está nas dúvidas abertas (ver [Decisões pendentes](#decisões-pendentes-transversais)).

---

## [REQ1] — Conciliação bancária

**Objetivo:** conferir o que está marcado como `PAGO` no app contra o que consta nos
extratos bancários.

### Entendimento
- **3 bancos.** Cliente mencionou extrato em **Excel**; verificar disponibilidade de
  **OFX** para padronização (preferível).
- **MVP (fase 1):** relacionar **visualmente** app × extrato (casamento manual,
  lado a lado).
- **Evolução (fase 2):** verificação **automática com confirmação visual** do tesoureiro.

### Considerações técnicas
- **OFX vs Excel:**
  - OFX é padronizado entre bancos e traz `FITID` (id único da transação → permite
    deduplicação ao reimportar). É o caminho **preferível**.
  - Excel **não** é padronizado — cada banco monta a planilha de um jeito (colunas,
    cabeçalho/rodapé com saldo, formato de data e valor). Exige **1 amostra de cada
    banco** para mapear. Proposta: **mapeador de colunas configurável** em vez de
    3 parsers chumbados.
- **Status de conciliação como dimensão separada:** **não** misturar no enum de status
  atual. Conciliação é ortogonal ao fluxo do reembolso. Proposta de campo próprio
  `reconciliation_status`:
  `NAO_CONCILIADO → PRE_CONCILIADO (pelo app) → CONCILIADO (confirmado pelo tesoureiro)`.
- **Casamento automático (candidato):** valor (`abs(TRNAMT) == amount`) + proximidade
  de data (`DTPOSTED` vs `paidAt`, janela de ± N dias) + opcionalmente similaridade do
  `payeeName` no `MEMO`/`NAME`. Classifica em: casado automático / sugestão / sem match.
- **Liga ao REQ4:** a decisão "armazenar ou descartar extrato" define se há tabela
  `bank_transactions` persistente ou fluxo efêmero (parse em memória → confere →
  descarta, guardando só o vínculo/resultado).

### Dúvidas / decisões em aberto
- [ ] Os 3 bancos oferecem OFX? (coletar 1 amostra de cada — OFX e/ou Excel)
- [ ] Extrato é **descartado** após conciliar ou guardamos histórico? (ver REQ4)
- [ ] `reconciliation_status` separado (recomendado) ou novos valores no enum atual?
- [ ] Janela de tolerância de data para casamento automático (± quantos dias?)
- [ ] Como tratar 1 pagamento que cobre N reembolsos (ou vice-versa)?

---

## [REQ2] — Login + MFA (fundação de identidade) · 🟢 Entregue (reformulado)

> **Decisão (2026-06-23):** a ideia original de **3 papéis** (TESOUREIRO / CONSELHO /
> SOLICITANTE + ADMIN) foi **cancelada**. O cliente definiu que **todos com acesso ao
> backend têm o mesmo acesso**. Entregamos uma **fundação de identidade** enxuta, que
> é o pré-requisito real para a auditoria (REQ3).

**Objetivo (revisado):** identidade confiável de quem opera o backend, com 2º fator.

### O que foi entregue
- **`roles`** (cadastro): só existe `ADMIN` hoje; tabela e tela mínima existem só por
  extensibilidade — papéis adicionais **ainda não diferenciam permissões**.
- **`users`** estendida: `roleId`, `mustChangePassword`, `mfaEnabled`, `totpSecret`
  (cifrado em repouso, AES-256-GCM via `MFA_SECRET_KEY`), `mfaConfirmedAt`, `active`.
- **MFA TOTP obrigatório** (Google/Microsoft Authenticator).
- **1º acesso:** admin cria o usuário com **senha temporária** → no 1º login o usuário
  troca a senha e configura o MFA (QR Code) em `/admin/onboarding` → relogin com
  senha + código TOTP.
- **Telas:** `/admin/usuarios` (criar com senha temporária exibida 1×, editar, resetar
  acesso, ativar/desativar) e `/admin/roles` (mínimo).
- **Proteção de rotas:** Next 16 usa **`src/proxy.ts`** (não `middleware.ts`) — ver
  memória do projeto. Guarda só age em GETs (não redireciona POST de server action).
- **Solicitação pública** (`/`) **mantida** sem login.

### Em aberto (futuro, se voltar a haver diferenciação de acesso)
- [ ] Se um dia houver papéis com permissões distintas, reabrir a matriz de permissões.
- [ ] Auto-cadastro/convite de usuário por e-mail (hoje é só admin define senha temporária).

---

## [REQ3] — Auditoria · ✅ Decidido (próximo a implementar)

**Objetivo:** logs e auditoria para investigar divergências em dados financeiros
(saber se foi erro humano e de quem). **Destravado:** a identidade do ator já existe
(REQ2-fundação entregue).

### Entendimento
- Auditar **manipulação de registros após entrada:** alteração de valores, categorias
  e status.
- **Log de:** solicitações criadas e conciliações.

### Considerações técnicas
- **Generalizar:** hoje só existe `status_history`. Propor tabela única `audit_log`
  (`ator`, `ação`, `entidade`, `entidade_id`, `valor_antes`, `valor_depois`, `timestamp`).
  Avaliar aposentar `status_history` migrando para o log único (evitar dois mecanismos).
- **Append-only:** sem update/delete. Idealmente protegido por **RLS no Supabase** para
  que nem a aplicação consiga reescrever — log inviolável é pré-requisito para
  responsabilização.
- **Ator:** usar `session.user.id` (já disponível) nos pontos de mutação. Pontos a
  instrumentar: `src/actions/reimbursements.ts` (criar, editar, mudar status, notas) e
  `src/actions/catalog.ts`.

### Dúvidas / decisões em aberto
- [ ] Migrar `status_history` para `audit_log` ou manter ambos?
- [ ] Granularidade: por campo alterado (antes/depois) ou só o evento?
- [ ] Retenção: por quanto tempo guardar logs?
- [ ] Quem pode consultar a auditoria? (hoje acesso é uniforme → todos os admins)

---

## [REQ4] — Segurança de dados sensíveis

**Objetivo:** proteger dados bancários armazenados e em trânsito.

### Perguntas do cliente e posições propostas
- **Descartar extratos após conferência?**
  → **Recomendado: fluxo efêmero** — parsear, conciliar e **não persistir o extrato
  bruto**; guardar só o resultado (valor, data, vínculo). Reduz superfície de risco e
  simplifica LGPD.
- **Criptografia de conta/PIX (`payment_details`)?**
  → Viável criptografar em repouso (app-level, chave fora do banco). Trade-off: não dá
  para buscar/filtrar por esses campos depois — mas só servem ao pagamento, então
  costuma valer a pena.
- **Quais outros dados sensíveis?**
  → Além de conta/PIX: `payee_name`, `requester_name` e os **anexos de nota fiscal**
  (Vercel Blob — verificar se o storage está **público ou privado**; NF traz CNPJ/valores).
- **MFA?**
  → **TOTP** (Google/Microsoft Authenticator), compatível com next-auth. Recomendado
  **obrigatório** para quem vê dado bancário (tesoureiro/conselho).

### Considerações técnicas
- **LGPD** é o pano de fundo: base legal, retenção definida e minimização de dados —
  reforça a decisão de descartar o extrato.
- Revisar visibilidade dos blobs de anexo (privado + URL assinada de curta duração).

### Dúvidas / decisões em aberto
- [ ] Confirmar descarte de extrato (recomendado) vs histórico persistido.
- [ ] Criptografar `payment_details`? Quais campos exatamente?
- [ ] Anexos de NF estão públicos hoje? Migrar para privado + URL assinada?
- [x] ~~MFA obrigatório para quais roles?~~ → **Resolvido:** MFA TOTP obrigatório para
  todo usuário do backend (entregue na REQ2). Segredo já cifrado em repouso.
- [ ] Há requisito formal de LGPD/retenção definido pelo cliente?

---

## Decisões pendentes (transversais)

Decisões que destravam o planejamento de várias frentes:

1. **Solicitação:** continua pública ou passa a exigir login? *(impacta REQ2, REQ4)*
2. **Extrato:** descartar após conciliar (recomendado) ou guardar histórico?
   *(impacta REQ1, REQ4)*
3. **Conciliação:** dimensão `reconciliation_status` separada (recomendado) ou novos
   valores no enum atual? *(impacta REQ1, REQ3)*
4. **Fatiamento de entrega:** REQ a REQ, ou a fatia "fundação" (roles + auditoria +
   segurança) antes da conciliação?

---

## Modelo de dados — esboço (a validar)

> Rascunho conceitual, **não** é migration. Apenas para visualizar impacto.

- `users`: **+ `role`** (`ADMIN_GERAL` | `TESOUREIRO` | `CONSELHO` | `SOLICITANTE`),
  campos de MFA (TOTP secret), vínculo opcional a um solicitante.
- `reimbursements`: **+ `reconciliation_status`** (enum próprio), possivelmente
  `payment_details` criptografado.
- `bank_transactions` *(somente se optarmos por persistir)*: `bank_id`, `fitid`,
  `amount`, `posted_at`, `memo`, `matched_reimbursement_id`. Dedup por `(bank_id, fitid)`.
- `audit_log`: `actor_id`, `action`, `entity`, `entity_id`, `before`, `after`,
  `created_at`. Append-only (RLS).

---

## Histórico do documento

- **2026-06-22** — Criação. Levantamento inicial dos 4 REQs a partir de `docs/TODO.MD`,
  com considerações técnicas, matriz de roles (rascunho) e dúvidas em aberto.
