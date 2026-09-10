# BioBoock — Sprint 07: UX/UI Foundation & Healthy Lifestyle Experience

**Data:** 2026-09-10
**Escopo:** `apps/web` (design tokens, primitivos de UI, redesenho de telas) — zero mudança em `apps/api`, zero migration.
**Pré-requisitos:** Sprints 05 (`4562724`), 06 (`6b99c92`), 06.1 (`54e9bd4`).

---

## 1. Objetivo

Substituir a linguagem visual genérica (cinza `zinc`, dark-first, template padrão do `create-next-app`) por uma identidade própria do BioBoock associada a vida saudável, movimento e evolução pessoal — sem alterar nenhuma regra de negócio, autenticação ou autorização já validada.

## 2. Auditoria (Fase 1)

Encontrado antes de qualquer mudança:
- `apps/web` usava exclusivamente a paleta `zinc` do Tailwind em todo componente, com `dark:` como tratamento paralelo onipresente.
- A rota raiz `/` ainda era o **scaffold literal do `create-next-app`** ("To get started, edit the page.tsx file", logos Next.js/Vercel) — nunca substituído desde a criação do projeto. Alcançável por usuários autenticados (não está na lista de rotas públicas de `proxy.ts`).
- `packages/ui`, `packages/config`, `packages/types` (monorepo) estão **vazios** — não havia design system compartilhado para reaproveitar.
- `apps/mobile` continua **completamente vazio** — confirmado novamente nesta sprint.
- O módulo `biobook` (experiência principal/home) tem 15 componentes próprios (`BioHeader`, `EvolutionCard`, `ProgressWidget`, `AchievementTimeline`, `HealthOverview`, `CircleSummary`, `PhotoComparison`, `PhotoMoment`, `StoryHeader`, `StorySummary`, `StoryTimeline`, `ChapterCard`, `AchievementBanner`, `LoadingSkeleton`, `BioBookLayout`), todos seguindo o mesmo padrão de classes `zinc-*` — permitindo uma migração sistemática de tokens.
- Outros módulos (`biocircle`, `bioteams`, `cds`, `learning`, `oracle`, `population`, `precision`, `simulation`) não fazem parte da lista explícita de telas da especificação (home, perfil, login, cadastro, onboarding, admin); um deles (`simulation`) tem teste que depende de uma classe Tailwind específica (`border-blue-500`), confirmando que alterá-los exigiria escopo e validação próprios — não tocados nesta sprint.

## 3. Nova Direção Visual

Documentação completa em [`docs/ux/BIOBOOCK-UX-UI-DESIGN-SYSTEM.md`](../ux/BIOBOOCK-UX-UI-DESIGN-SYSTEM.md). Resumo:

- **Paleta**: verde `primary` (saúde/natureza), azul `secondary` (confiança/equilíbrio), coral `accent` (energia, moderado), neutros warm `canvas`/`surface`/`ink` (substituindo `zinc` frio), semânticas `success`/`warning`/`error`/`info`.
- **Tipografia**: Plus Jakarta Sans via `next/font/google` (zero dependência nova), substituindo Geist.
- **Forma**: radius consistente (`sm` a `xl`), sombras discretas (`shadow-soft`/`shadow-lifted`).
- **Light first**: fundo padrão claro (`canvas-50`); dark mode preservado (não removido), traduzido para os mesmos papéis semânticos.
- **Sem estética de IA**: nenhum roxo futurista, glow, partícula ou gradiente "AI dashboard" foi introduzido.

## 4. Componentes Novos

`apps/web/src/components/ui/`: `Button`, `TextField`, `Alert`, `Card`, `EmptyState`, `BrandMark` (marca em SVG inline, sem imagem externa).

## 5. Telas Alteradas

- `/` — scaffold morto do Next.js removido, agora redireciona ao `/biobook`.
- `/login`, `/signup` — redesenho completo (BrandMark + primitivos), lógica de Server Action/cookies/BFF inalterada.
- `/onboarding` — redesenho completo, mesma lógica mínima.
- `/profile` — redesenho completo, identidade (avatar/inicial + nome) em destaque no topo.
- `/admin` — realinhamento de tokens, estrutura e proteção de backend inalteradas.
- `/biobook` (`BioBookLayout`, `BioHeader` + 12 widgets) — realinhamento sistemático de tokens em todo o módulo.
- `UserMenu` (global) — realinhamento de tokens + link de marca.

## 6. Mobile

`apps/mobile` inspecionado novamente: continua vazio, nenhum arquivo além do diretório. Nenhuma funcionalidade ou componente foi inventado.

## 7. Segurança

Nenhuma alteração em autenticação, sessão, cookies, BFF, JWT, refresh, `RolesGuard`, role `ADMIN`, autorização ou isolamento entre usuários. Todas as mudanças são de apresentação (classes CSS, componentes puramente visuais, um redirect de rota). `apps/api` não foi tocado nesta sprint.

## 8. Testes

- `apps/web`: `npx vitest run` → **385/385 testes, 50/50 arquivos** (idêntico ao baseline da Sprint 06.1 — nenhum teste apagado, nenhum novo necessário para mudanças puramente de estilo).
- `apps/web`: `npx tsc --noEmit` → zero erros.
- `apps/api`: `npx jest --silent` → **3973/3973 testes, 261/261 suítes** (backend não tocado, resultado idêntico ao baseline).

## 9. Build

`apps/web`: `npx next build` → sucesso. **18 rotas** (mesmo total da Sprint 06.1 — nenhuma rota nova, `/` deixou de ser scaffold e passou a ser redirect).

## 10. Regressão Funcional (infraestrutura real: Docker + `next dev`)

Executada contra a mesma API/Postgres já em uso neste ambiente (containers já estavam de pé desde o atendimento anterior ao usuário, que envolveu recriar a conta administrativa real dele — **não recriei o banco do zero nesta sprint para não apagar essa conta**):

1. `GET /login` renderizado → campos `name="email"`, `name="password"`, `name="rememberMe"` e texto "Entrar" presentes.
2. `GET /signup` renderizado → campos `name="name"`, `name="email"`, `name="password"`, `name="confirmPassword"` e texto "Criar conta" presentes.
3. `POST /auth/register` real (usuário de teste novo) → `201`, `role: PATIENT`.
4. `POST /auth/login` real → `200`, tokens emitidos.
5. `GET /onboarding` com cookie de sessão → `200` (shell de carregamento client-side correto).
6. `POST /api/proxy/profiles` (conclusão do onboarding) → `201`, perfil criado.
7. `GET /profile` com cookie → `200`.
8. `GET /api/proxy/users` com usuário comum (`PATIENT`) → `403`, sem vazamento.
9. `POST /auth/refresh` real → `200`, novos tokens.
10. `DELETE /auth/logout` real → `204`.
11. `GET /admin` sem cookie → `307` redirect para `/login?from=%2Fadmin` (proteção de rota via `proxy.ts` intacta).
12. Login real como o administrador do sistema (conta já existente) → `GET /api/proxy/users` → `200` com dados reais (lista de usuários, incluindo a role `ADMIN` corretamente identificada).

Todos os itens da lista de regressão da especificação (login, logout, refresh, registro, onboarding, perfil, admin, role ADMIN, usuário normal, proteção `/admin`) foram exercidos com HTTP real.

## 11. Validação Visual

Não há ferramenta de automação de browser/E2E (Playwright ou similar) instalada no projeto, e a especificação proíbe instalar uma ferramenta grande só para produzir evidência — **nenhum screenshot automatizado foi capturado**. Validação real feita via testes de componente (Testing Library, que renderiza e consulta o DOM real) e via HTTP contra a aplicação rodando (seção 10). Isso é uma limitação documentada, não uma comparação visual "antes/depois" pixel-a-pixel.

## 12. Documentação

- Criado: `docs/ux/BIOBOOCK-UX-UI-DESIGN-SYSTEM.md`.
- Criado: este relatório.

## 13. Git

- Commit: ver hash abaixo (preenchido após commit).
- Push: `origin/master`.
- Working tree: limpo após commit.

## 14. Reservas

1. Validação visual automatizada (screenshots) não foi realizada — sem ferramenta de browser instalada, conforme documentado na seção 11. A validação foi funcional/estrutural (DOM real via Testing Library + HTTP real), não pixel-a-pixel.
2. Os módulos fora do escopo explícito da especificação (`biocircle`, `bioteams`, `cds`, `learning`, `oracle`, `population`, `precision`, `simulation`) ainda usam a paleta `zinc` antiga — ficam para uma sprint futura de extensão do design system, conforme já indicado pela própria especificação (§34 menciona academia como só uma parte do universo do produto; esses módulos representam funcionalidades ainda a integrar visualmente).
3. Um usuário de teste descartável (`sprint07-user@example.com`, role `PATIENT`) foi criado durante a validação e permanece no banco — dado inofensivo, mas não removido (não há endpoint de exclusão de usuário exposto/usado neste fluxo).
4. A infraestrutura Docker (`db`+`api`) foi deliberadamente **mantida rodando** ao final desta sprint, e não recriada do zero, porque contém a conta administrativa real do usuário — evitar repetir o incidente da Sprint 06.1 em que `docker compose down -v` apagou essa conta.

## 15. Bloqueios

Nenhum.

## 16. Status Final

**PASS.** Nova identidade visual estabelecida (paleta, tipografia, componentes, tokens), fundação funcional e de segurança intacta (zero mudança em `apps/api`, autenticação/sessão/autorização inalteradas), zero regressão de testes, TypeScript e build limpos, regressão funcional real validada ponta a ponta.
