# BioBoock — UX/UI Design System

**Sprint:** 07 — UX/UI Foundation & Healthy Lifestyle Experience
**Data:** 2026-09-10

---

## 1. Conceito Visual

O BioBoock deve ser reconhecível como um produto de **vida saudável, movimento e evolução pessoal** antes mesmo de o usuário ler qualquer texto — não como um dashboard corporativo, um ERP ou uma ferramenta de IA.

Princípios:
- **Profissional + Humano**: sofisticado sem ser frio.
- **Light first**: base clara, off-white, que "respira" — nunca preto ou cinza-frio como padrão.
- **Cor com função**: verde (saúde/natureza), azul (confiança/equilíbrio), laranja/coral (energia, usado com moderação) — nunca decorativa sem propósito, nunca como único significado (sempre acompanhada de texto/ícone).
- **Sem estética de IA**: nada de roxo futurista, glow, partículas, hologramas ou gradientes "AI dashboard".

## 2. Estado Anterior (Auditoria)

Antes desta sprint, `apps/web` usava exclusivamente a paleta neutra `zinc` do Tailwind (cinza frio), com `dark:` como tratamento paralelo em praticamente todo componente, tipografia padrão do template `create-next-app` (Geist) sem hierarquia de marca, e a rota raiz `/` ainda era o scaffold literal gerado pelo Next.js ("To get started, edit the page.tsx file", com o logo do Next.js/Vercel) — nunca substituído desde a criação do projeto. `packages/ui`, `packages/config` e `packages/types` (monorepo) estão vazios — não havia nenhum design system compartilhado para reaproveitar; a fundação teve que ser criada em `apps/web`.

## 3. Paleta

Definida como CSS custom properties + Tailwind v4 `@theme` em `apps/web/src/app/globals.css`.

| Papel | Token | Uso |
|---|---|---|
| Canvas (fundo) | `--color-canvas`, `-50`, `-100`, `-200` | fundo de página, off-white natural |
| Superfície | `--color-surface`, `--color-surface-muted` | cards, inputs |
| Borda | `--color-line`, `--color-line-strong` | divisórias, contornos |
| Texto | `--color-ink`, `--color-ink-soft`, `--color-ink-faint` | hierarquia de texto (não zinc) |
| Primária (verde) | `--color-primary-50`…`-900` | saúde, ações principais, marca |
| Secundária (azul) | `--color-secondary-50`…`-900` | confiança, tags de contexto |
| Acento (coral) | `--color-accent-50`…`-700` | energia, conquistas — moderado |
| Semânticas | `--color-success`, `-warning`, `-error`, `-info` (+ `-bg`) | estado, sempre com texto/ícone junto |

Dark mode foi **preservado** (não removido), traduzindo os mesmos papéis semânticos para superfícies escuras verde-carvão (não preto puro, não cinza frio) — mas light é o padrão e a prioridade desta sprint, conforme §24 da especificação.

## 4. Tipografia

Fonte única: **Plus Jakarta Sans** (via `next/font/google`, mesma técnica já usada para Geist — nenhuma dependência nova instalada), pesos 400–800. Humanista, legível, moderna, sem conotação "tech/futurista".

Hierarquia aplicada nas telas redesenhadas: título de tela (`text-2xl font-bold`), seções (`text-sm font-medium uppercase tracking-wide`), corpo (`text-sm`), legendas (`text-xs`).

## 5. Forma

- Radius: `--radius-sm` (0.5rem) a `--radius-xl` (1.5rem), botões usam `rounded-full` (pílula).
- Sombra: `--shadow-soft` (cards) e `--shadow-lifted` (elementos elevados) — discretas, nunca dramáticas.

## 6. Componentes Novos (`apps/web/src/components/ui/`)

- **`Button`** — variantes `primary` (verde sólido, pílula) e `secondary` (contorno); substitui os botões pretos/brancos duplicados em cada formulário.
- **`TextField`** — label + input padronizado, substitui as classes `inputClass`/`labelClass` repetidas manualmente em login, signup, onboarding e perfil.
- **`Alert`** — banners de erro/sucesso/info/aviso com `role="alert"`/`role="status"` corretos.
- **`Card`** — superfície com borda, radius e sombra padronizados.
- **`EmptyState`** — estado vazio motivador (título + descrição + ação), conforme §22.
- **`BrandMark`** — marca própria do BioBoock em SVG inline (sem dependência de imagem externa), usada nas telas de autenticação.

## 7. Telas Alteradas

| Tela | Mudança |
|---|---|
| `/` (raiz) | Scaffold morto do Next.js removido; agora redireciona ao `/biobook` (única rota real que um usuário autenticado deveria ver). |
| `/login` | Redesenho completo com `BrandMark`, `TextField`, `Button`, `Alert`. Lógica de autenticação (Server Action, cookies, BFF) inalterada. |
| `/signup` | Redesenho completo, mesmo padrão do login. Validação e auto-login inalterados. |
| `/onboarding` | Redesenho completo, mesma lógica mínima (só nome). |
| `/profile` | Redesenho completo — avatar/inicial e nome em destaque no topo ("Minha história"), formulário dentro de `Card`. Lógica de fetch/PATCH inalterada. |
| `/admin` | Realinhamento de tokens (cores, radius, sombra) — estrutura e proteção de backend inalteradas. |
| `/biobook` (BioBookLayout, BioHeader + 12 widgets) | Realinhamento sistemático de tokens em todos os componentes do módulo `biobook` (cards, texto, estados de tendência, skeleton de carregamento) — nenhuma lógica de negócio alterada. |
| `UserMenu` (global) | Realinhamento de tokens + link de marca "BioBoock" apontando para `/biobook`. |

## 8. Componentes Fora de Escopo (documentado, não alterado)

Os módulos `biocircle`, `bioteams`, `cds`, `learning`, `oracle`, `population`, `precision` e `simulation` **não foram tocados** nesta sprint — não estão na lista explícita de telas da especificação (home, perfil, login, cadastro, onboarding, admin) e um deles (`simulation`) tem um teste que depende de uma classe Tailwind específica (`border-blue-500`), confirmando que alterações nesses módulos exigiriam escopo e validação própria. Ficam para uma sprint futura de extensão do design system.

## 9. Mobile

`apps/mobile` continua **completamente vazio** (nenhum arquivo além do diretório) — confirmado nesta sprint. Nenhum componente foi inventado. Os design tokens vivem em CSS/Tailwind (`apps/web`), portanto não são diretamente portáveis a um futuro app mobile (React Native não consome Tailwind CSS da mesma forma) — quando o app mobile for iniciado, a paleta/hierarquia tipográfica documentada aqui deve ser recriada no sistema de estilos escolhido para mobile, mantendo os mesmos valores de cor.

## 10. Acessibilidade

- Nenhuma informação depende só de cor: estados de tendência (`HealthOverview`, `EvolutionCard`) combinam cor + texto/ícone (setas `↑`/`↓`, rótulos "Melhorando"/"Piorando").
- Contraste: `--color-ink` (`#1c2a22`) sobre `--color-canvas` (`#fefdfb`) e `--color-primary-700` sobre `--color-primary-50`/branco atendem a AA para texto normal.
- Alertas usam `role="alert"`/`role="status"` corretamente (preservado de antes da sprint).
- Labels de formulário continuam associados via `htmlFor`/`id` em todos os campos (`TextField`).

## 11. Validação Visual

Não havia ferramenta de automação de browser/E2E (Playwright ou similar) instalada no projeto antes desta sprint, e a especificação explicitamente proíbe instalar uma ferramenta grande só para produzir evidência. **Não foi realizada captura de screenshot automatizada.** A validação real foi feita via:
- Testes de componente (Vitest + Testing Library) cobrindo os elementos acessíveis (labels, roles, textos) das telas redesenhadas — 385/385 passando.
- Validação funcional real via HTTP contra a aplicação rodando (`next dev`) e a API em Docker (ver relatório da sprint, seção Regressão).

Isso é uma limitação real, documentada aqui como pedido pela especificação — não uma comparação visual pixel-a-pixel "antes/depois".

## 12. Decisões Importantes

- **Reaproveitamento, não invenção**: nenhuma nova funcionalidade de negócio foi criada. Toda mudança é de apresentação (classes CSS, componentes de UI puramente visuais, um redirect na rota raiz).
- **Dark mode preservado, não removido**: a especificação pede "light first", não "light only" — os tokens escuros foram mantidos e traduzidos para os novos papéis semânticos.
- **Fonte via `next/font/google`**: zero dependência npm nova, mesma técnica já usada no projeto para a fonte anterior (Geist).
- **Sem imagens externas**: toda identidade visual nova (marca, avatares) é CSS/SVG inline — nenhuma URL externa quebrável foi introduzida (§13 da especificação).
