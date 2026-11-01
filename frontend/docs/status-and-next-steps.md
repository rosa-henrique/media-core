# Status e próximos passos

Legenda das marcas: [README](../README.md#legenda-de-evidências). Validações técnicas locais verificadas em 28/10/2026; informações sobre implantação Vercel recebidas em 31/10/2026, sem revalidação independente.

## O que funciona e foi testado

| Área                 | Resultado                                                                                                                                                                        | Evidência   |
| -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------- |
| Instalação           | `pnpm install --frozen-lockfile` com lockfile atualizado; 6 projetos no workspace; `nvm use` → Node 26.12.1                                                                      | [Testado]   |
| Qualidade estática   | `pnpm typecheck` e `pnpm lint` passam (5/5 tarefas); `--filter` por app e por pacote                                                                                             | [Testado]   |
| Build                | `pnpm build` gera web, admin e proxy                                                                                                                                             | [Testado]   |
| Quality Gate         | `quality:check` executa ESLint e Prettier `--check`; `//#quality:check` está sem cache e é dependência de `build` no Turbo. Execução e bloqueio de falhas após a mudança não foram revalidados nesta tarefa. | [Arquivo] / [A testar] |
| Dev local            | `pnpm dev` (tudo) e `pnpm --filter web\|admin\|proxy dev` (cada um isolado); `/`, `/web`, `/admin` → 200; `@frontend/api` renderizado em `/web`                                  | [Testado]   |
| Execução via Docker  | Imagens usam standalone (`node apps/<app>/server.js`); as apps não têm script `start`. O deploy Vercel é registrado separadamente abaixo.                                         | [Testado]   |
| Proxy                | Repasse de status e corpo; 500 repassado; redirect externo preservado; reescrita de `Location` interno (em dev); 502 e recuperação; 504 por timeout; 404 fora de `/web`/`/admin` | [Testado]   |
| Imagens Docker       | As imagens anteriores (`frontend-{web,admin,proxy}:local`) foram construídas; as tags atuais são `media-core-{web,admin,proxy}:local`                                              | [Histórico] |
| `docker run` isolado | Os fluxos foram testados com as tags e nomes anteriores; os exemplos atualizados para Media Core ainda não foram reexecutados                                                        | [Histórico] |
| Docker Compose       | O fluxo foi testado antes da renomeação; `compose.yaml` agora define o projeto `media-core` e usa novas tags, ainda sem reexecução de validação                                        | [Histórico] |
| Histórico anterior   | Imagens e Compose já haviam sido testados, incluindo proxy com `web` parado e recuperação                                                                                        | [Histórico] |
| Deploy Vercel        | Foi informado que a instalação congelada e os builds de Web, Admin e Proxy passaram e que o deploy por Vercel Services está funcionando 100%. A execução do Quality Gate pelo build Vercel ainda não foi confirmada. | [Relato] / [Pendente] |

## O que **não** foi testado ou validado

- `pnpm format` e `pnpm exec eslint . --fix` (reescrevem arquivos), `cp .env.example .env` (não sobrescrevi o `.env` existente) e `nvm install 26.12.1`.
- Execução de `pnpm quality:check`, a ordem/falha do Quality Gate no pipeline do Turbo após a alteração recente e integração desse pipeline nos builds Vercel de `web`, `admin` e `proxy`.
- `docker build --no-cache`, `docker compose down --rmi local` e remoção de imagens (destrutivos para o cache/imagens).
- `pnpm --filter <app> build` individual (só `pnpm build` via Turborepo foi executado) e `docker compose up -d --build admin|proxy` isolados (só `web`).
- Timeout 504 **dentro** do Compose (testado com `pnpm --filter proxy dev`); WebSocket/HMR através do proxy; recarga automática (hot reload) ao editar um pacote compartilhado.
- Builds sem acesso à internet; ausência/esvaziamento do `.env` no Compose.
- Navegação em navegador real (`alert` do "Testar AppButton", aparência do tema): não verificada; só `curl`.
- Nenhum pipeline de CI foi encontrado nos arquivos.
- Build e execução Docker, Compose e Kubernetes usando as novas tags `media-core-*`; validação do novo nome de projeto Compose.

## Achados registrados

Cada achado separa o que é **fato confirmado**, a **limitação dos testes** e a **melhoria futura**. Nenhuma melhoria foi aplicada nesta etapa.

| #   | Achado                                                                             | Fato confirmado                                                                                                                                                                                                                                                                                              | Limitação dos testes                                                                                                                                                                       | Melhoria futura (não aplicada)                                                                                                                    |
| --- | ---------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **Lerna descartado (decisão oficial)**                                             | pnpm é o gerenciador e Turborepo o orquestrador; o Lerna não será utilizado. Confirmado nos arquivos: sem `lerna.json`, dependência ou script **[Arquivo]**; citado só em `context/` e `prompts/`, como histórico.                                                                                           | Nenhuma: não há dúvida em aberto.                                                                                                                                                          | Nenhuma (decisão registrada em [decisions.md](decisions.md)).                                                                                     |
| 2   | **`proxy-redirect-test` não exercita a reescrita de `Location` em Docker/Compose** | O `web` não recebe `PROXY_PUBLIC_ORIGIN` nesses modos e a rota é estática (`○` no build): `Location` já sai com a origem pública e o proxy não precisa reescrever **[Arquivo] [Testado]**. A reescrita funcionou em dev com `PROXY_PUBLIC_ORIGIN=http://localhost:3000 pnpm --filter web dev` **[Testado]**. | Em Docker/Compose, só se vê o repasse; a ramificação "origem interna → pública" não foi exercitada. Barra final (`/web/x/`) não serve de teste: o Next do proxy trata antes **[Testado]**. | Definir como cobrir esse caso em Docker/Compose (ver [proxy.md](proxy.md#limitação-importante-do-teste-de-redirect-interno-testado--inferência)). |
| 3   | **O `.env` da raiz só serve ao Compose**                                           | O `next dev` carrega `.env*` do diretório da app (`apps/proxy/.env.local`), não o `.env` da raiz **[Testado]**; os valores diferem de propósito entre Compose e dev local **[Intenção]**; ambos os arquivos estão no `.gitignore` **[Testado]**. Documentado em [environment.md](environment.md).            | Os valores dos arquivos `.env` não foram lidos para a documentação (por regra; só comparação booleana). Recarga do `.env.local` com o dev server rodando não foi testada.                  | Unificar a configuração de dev local, se desejado (não aplicado).                                                                                 |
| 4   | **Lockfiles do scaffold em `apps/web` e `apps/admin`**                              | Não há `pnpm-workspace.yaml` locais; o workspace está consolidado na raiz `frontend/` **[Arquivo]**. Ainda há `pnpm-lock.yaml` próprios nas apps; README/AGENTS/.gitignore padrão **[Arquivo]**.                                                                                                        | Não foi verificado se os lockfiles próprios das apps ainda são necessários.                                                                                                                | Decidir se mantém ou remove os lockfiles próprios; não alterar o workspace consolidado.                                                             |
| 5   | **`@frontend/ui` está incompleto**                                                 | `tokens` é exportado e `theme.ts` usa `tokens.spacing`/`tokens.radius`; `tokens.shadows` não é ligado ao tema (escala de sombras do MUI intacta **[Testado]**). `AppButton` é `<button>` simples sem MUI; não há layouts **[Arquivo]**. `@frontend/api` só tem `getApiStatus()`.                             | Aparência no navegador não verificada.                                                                                                                                                     | Usar `tokens.shadows` (ex.: em componentes), criar layouts e componentes MUI; dar função real à API.                                              |
| 6   | **Além das 4 rotas de teste do contexto, existem as páginas `proxy-test`**         | `apps/web/src/app/proxy-test/page.tsx` e `apps/admin/src/app/proxy-test/page.tsx` respondem 200 via proxy **[Testado]**. Todas as 6 estão listadas em [proxy.md](proxy.md#rotas-de-teste-temporárias) e preservadas.                                                                                         | —                                                                                                                                                                                          | Decidir o destino das rotas de teste (hoje preservadas).                                                                                          |

As imagens Docker usam standalone; as apps não têm script `start` para executar o modo de produção diretamente com `pnpm start`/`next start`. O deploy frontend por Vercel Services está registrado como [Relato] em [vercel.md](vercel.md). As melhorias opcionais da análise de execução (por exemplo, copiar `public` no Dockerfile do proxy, `HEALTHCHECK`, `env` no `turbo.json`) **não** foram aplicadas e permanecem como ideias futuras.

## Registro de validação desta documentação

- **Executados** (resultado em cada guia, marca [Testado]): instalação, `typecheck`, `lint`, `build`, `format:check`, `dev` (tudo e cada app), `nvm use`, `docker build` das 3 imagens, `docker run` isolado, Compose completo (`config`, `up`, `ps`, `logs`, `stop/start/restart`, `--force-recreate`, `down`), cenários de proxy (200, 404, 500, redirects, 502, 504) e verificação de scripts, rotas e links por script.
- **Apenas inspecionados nos arquivos** ([Arquivo]): `pnpm --filter <app> build` individual, `docker compose up -d --build admin|proxy`, regras de lint, `.dockerignore`, `turbo.json` (`outputs`), comentários dos Dockerfiles.
- **Requerem validação manual:** itens da seção "não foi testado" acima.

## Pendências e decisões em aberto

1. **Autenticação/autorização** — não decidida; nada implementado.
2. **Biblioteca de UI** — existe um padrão centralizado de exportação de componentes; ainda faltam usar `tokens.shadows`, layouts e componentes MUI (hoje `AppButton` é um `<button>` simples); `@frontend/api` tem só uma função de exemplo.
3. **Rotas de teste do proxy** — preservadas; destino futuro não decidido.
4. **Sobras do scaffold** em `apps/web` e `apps/admin` (`pnpm-lock.yaml`, README, AGENTS) — decidir.
5. **Páginas iniciais** de `web` e `admin` ainda são o template do `create-next-app`.
6. **Formatação** — `context/project-context.md` e `prompts/documentation-agent.md` fora do padrão do Prettier.
7. **Kubernetes** — adiado para uma etapa posterior (acesso externo e automação). Não documentado nesta etapa.
8. **Quality Gate na Vercel** — descobrir/configurar e validar o comando de build e seu contexto para os três Services; ainda não afirmar que Vercel executa `quality:check`.
9. **AWS Amplify** — integração futura: quando adotada, o objetivo é usar o pipeline do monorepo com `quality:check` antes dos builds; ainda não há configuração no repositório.

## Próximas etapas sugeridas

1. Resolver as pendências 1, 2 e 4 acima conforme a prioridade do projeto.
2. Executar `pnpm quality:check` e validar que `pnpm build` e build direcionado pelo Turbo executam o Quality Gate e bloqueiam os builds dependentes em caso de falha.
3. Validar o comando/contexto de build da Vercel para `web`, `admin` e `proxy`, garantindo o Quality Gate sem presumir uma configuração não testada.
4. Quando houver decisão de integrar Amplify, configurar e validar seu uso do pipeline Turbo; documentar a configuração então.
5. Em etapa posterior e separada: Kubernetes — documentação da configuração e acesso externo e, depois, automação de implantação.
