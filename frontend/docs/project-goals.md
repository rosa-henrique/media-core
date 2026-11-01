# Objetivos e princípios do projeto

Legenda das marcas de evidência: ver [README](../README.md#legenda-de-evidências).

## Ideia

**[Intenção]** O Media Core é uma plataforma de gerenciamento e administração de conteúdos multimídia, com foco principal no painel administrativo. O Admin deve gerir conteúdos, usuários, acessos e configurações; a Web deve oferecer autenticação, navegação e consumo dos conteúdos disponibilizados. A implementação atual é uma base em TypeScript e Next.js, organizada como monorepo, para desenvolver aplicações separadas que compartilham bibliotecas internas sem publicá-las no npm. As funcionalidades descritas são objetivos do produto, não uma afirmação de que já estão implementadas.

## Princípios informados

| Princípio                                                                                                     | Marca      | Estado na implementação                                                                                                                                                            |
| ------------------------------------------------------------------------------------------------------------- | ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Aplicações independentes e bibliotecas compartilhadas no mesmo repositório                                    | [Intenção] | **[Arquivo]** `apps/web`, `apps/admin`, `apps/proxy`, `packages/ui`, `packages/api`.                                                                                               |
| `web` e `admin` são apps Next.js distintas, com build e execução próprios                                     | [Intenção] | **[Arquivo]** Cada uma tem `package.json`, `next.config.ts`, Dockerfile, porta e `basePath` próprios.                                                                              |
| O proxy as expõe por caminhos públicos (`/web`, `/admin`)                                                     | [Intenção] | **[Arquivo]** Route Handlers em `apps/proxy/src/app/{web,admin}/[[...path]]/route.ts`.                                                                                             |
| Bibliotecas internas não publicadas; imports públicos (`@frontend/ui`, `@frontend/api`)                       | [Intenção] | **[Arquivo]** `private: true`, `exports` apontando para `src` (`.`, `./theme`, `./theme/*`, `./*`). Não há `lib/` nem build das bibliotecas.                                       |
| Evitar imports profundos (`@frontend/ui/lib/button`)                                                          | [Intenção] | **[Arquivo]** O campo `exports` só expõe os formatos definidos (`@frontend/ui`, `/theme`, `/theme/<arquivo>`, `/<Componente>`); caminhos como `@frontend/ui/src/...` não resolvem. |
| pnpm como gerenciador de pacotes e Turborepo como orquestrador de tarefas; Lerna descartado (decisão oficial) | [Intenção] | **[Arquivo]** `packageManager`, `pnpm-workspace.yaml`, `turbo.json`.                                                                                                               |
| UI compartilhada com MUI, tema, tokens, paleta, tipografia, componentes e layouts                             | [Intenção] | **Parcial** — ver abaixo.                                                                                                                                                          |
| Execução local simples e opções futuras de deploy                                                             | [Intenção] | **[Arquivo]** Dev local via `pnpm dev`; Dockerfiles e Compose existem.                                                                                                             |
| Sem autenticação/autorização no início                                                                        | [Intenção] | **[Arquivo]** Nenhum código de autenticação encontrado. `apps/proxy/proxy.example.ts` é só exemplo comentado.                                                                      |
| Documentação que permita entender e reproduzir a base                                                         | [Intenção] | Este conjunto de documentos.                                                                                                                                                       |

### UI compartilhada: planejado × existente

| Item planejado | Existe? | Detalhe **[Arquivo]**                                                                                                                                                                                                 |
| -------------- | ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| MUI            | Sim     | `@mui/material`, `@mui/material-nextjs`, Emotion em `packages/ui/package.json`; usado por `ThemeRegistry`.                                                                                                            |
| Tema           | Sim     | `theme/theme.ts` (`createTheme` com paleta, tipografia, `spacing: 8`, `borderRadius: 8`).                                                                                                                             |
| Paleta         | Sim     | `theme/palette.ts` (modo claro).                                                                                                                                                                                      |
| Tipografia     | Sim     | `theme/typography.ts` (usa `var(--font-roboto)`, definida no layout das apps).                                                                                                                                        |
| Tokens         | Sim     | `theme/tokens.ts` é exportado e `theme.ts` usa `tokens.spacing.sm` e `tokens.radius.md`. `tokens.shadows` fica disponível via `tokens`, mas **não** é ligado ao tema (a escala de sombras do MUI permanece a padrão). |
| Componentes    | Mínimo  | Apenas `AppButton` (com o tipo `AppButtonProps`), que hoje é um `<button>` HTML simples, **sem MUI**.                                                                                                                 |
| Layouts        | Não     | Não há layouts compartilhados em `packages/ui`.                                                                                                                                                                       |

## Por que monorepo

**[Intenção]** O objetivo organizacional informado é manter aplicações independentes e bibliotecas internas num único repositório, com dependências e comandos de desenvolvimento coordenados.

Benefícios esperados (**[Inferência]** a partir da estrutura; não são falas confirmadas):

- Uma só instalação (`pnpm install`) e um só lockfile para web, admin, proxy e bibliotecas.
- Mudança numa biblioteca (`packages/ui`) é refletida nas apps via `workspace:*`, sem publicar versão.
- Configuração de lint, formatação e TypeScript compartilhada em `configs/`, com versões únicas das ferramentas.
- Um comando (`pnpm lint`, `pnpm typecheck`, `pnpm build`) cobre todos os pacotes, com cache do Turborepo.

Custos e limitações:

- **[Arquivo]** Os Dockerfiles usam a raiz do repositório como contexto e instalam o workspace inteiro; builds de imagem são mais pesados que num repositório isolado por app (**[Inferência]** sobre o peso relativo).
- **[Arquivo]** `outputFileTracingRoot` e `transpilePackages` existem para que o Next.js enxergue código fora de `apps/<app>` (ver [architecture.md](architecture.md)).
- **[Arquivo]** Alterações em `packages/*` ou `pnpm-lock.yaml` invalidam o cache de instalação dos três Dockerfiles (`COPY packages/ packages/` antes do `pnpm install`).
- **[Arquivo]** `next`, `react` e `react-dom` estão fixados em versões iguais em três `package.json`; atualizá-las exige alterar os três.

## Por que apps separadas

- **[Intenção]** `web` e `admin` são aplicações distintas, com build e execução próprios, e não uma única aplicação dividida por rotas.
- **[Arquivo]** Consequência observável: duas imagens, dois Deployments e duas portas. Cada uma pode ser iniciada e parada separadamente.
- **[Histórico] [Testado]** Parar o `web` fez o proxy responder erro controlado (502) enquanto o `admin` seguia respondendo 200; ao reiniciar o `web`, o proxy voltou a responder 200.
- **[Inferência]** O motivo específico para separar `web` de `admin` (por exemplo, ciclos de release, público ou segurança distintos) **não foi confirmado**: motivação não confirmada.

## Por que bibliotecas compartilhadas

- **[Intenção]** Compartilhar UI e acesso à API sem duplicar código e sem publicar pacotes.
- **[Arquivo]** `web` usa `ThemeRegistry`, `AppButton` e `getApiStatus`; `admin` usa `ThemeRegistry`. Ambas declaram as duas bibliotecas como dependência.

## Decisões confirmadas × intenções ainda não implementadas

| Tema                                        | Situação                                                                                                                                                                                                                                                             |
| ------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Estrutura monorepo pnpm + Turborepo         | Implementada **[Arquivo]**.                                                                                                                                                                                                                                          |
| Lerna                                       | **Descartado por decisão oficial**: o projeto usa apenas pnpm + Turborepo e o Lerna não será utilizado. Confirmado nos arquivos (sem `lerna.json`, dependência ou script) **[Arquivo]**. Foi discutido antes (só aparece em `context/` e `prompts/` como histórico). |
| Biblioteca de UI completa (tokens, layouts) | Parcial (tabela acima).                                                                                                                                                                                                                                              |
| Deploy do frontend                          | Vercel Services com Web, Admin e Proxy em um projeto, conforme [vercel.md](vercel.md). Configuração confirmada em `vercel.json`; estado de Dashboard e funcionamento em produção são [Relato], não verificáveis nos arquivos. |
| Kubernetes                                  | Fora do escopo desta documentação; configuração ainda não finalizada. **[Pendente]** (etapa posterior).                                                                                                                                                              |
| Autenticação e autorização                  | **[Pendente]**: não decidido; o plano era começar sem elas.                                                                                                                                                                                                          |

Veja também [decisions.md](decisions.md) e [status-and-next-steps.md](status-and-next-steps.md).
