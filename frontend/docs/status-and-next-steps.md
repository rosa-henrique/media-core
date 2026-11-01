# Status e próximos passos

Legenda das marcas: [README](../README.md#legenda-de-evidências). Estado verificado em 28/10/2026.

## O que funciona e foi testado

| Área                 | Resultado                                                                                                                                                                        | Evidência   |
| -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------- |
| Instalação           | `pnpm install --frozen-lockfile` com lockfile atualizado; 6 projetos no workspace; `nvm use` → Node 26.12.1                                                                      | [Testado]   |
| Qualidade estática   | `pnpm typecheck` e `pnpm lint` passam (5/5 tarefas); `--filter` por app e por pacote                                                                                             | [Testado]   |
| Build                | `pnpm build` gera web, admin e proxy                                                                                                                                             | [Testado]   |
| Dev local            | `pnpm dev` (tudo) e `pnpm --filter web\|admin\|proxy dev` (cada um isolado); `/`, `/web`, `/admin` → 200; `@frontend/api` renderizado em `/web`                                  | [Testado]   |
| Produção             | Somente pelas imagens Docker (standalone, `node apps/<app>/server.js`); as apps não têm script `start`. `dev`, `build`, `lint` e `typecheck` continuam configurados.             | [Testado]   |
| Proxy                | Repasse de status e corpo; 500 repassado; redirect externo preservado; reescrita de `Location` interno (em dev); 502 e recuperação; 504 por timeout; 404 fora de `/web`/`/admin` | [Testado]   |
| Imagens Docker       | As imagens anteriores (`frontend-{web,admin,proxy}:local`) foram construídas; as tags atuais são `media-core-{web,admin,proxy}:local`                                              | [Histórico] |
| `docker run` isolado | Os fluxos foram testados com as tags e nomes anteriores; os exemplos atualizados para Media Core ainda não foram reexecutados                                                        | [Histórico] |
| Docker Compose       | O fluxo foi testado antes da renomeação; `compose.yaml` agora define o projeto `media-core` e usa novas tags, ainda sem reexecução de validação                                        | [Histórico] |
| Histórico anterior   | Imagens e Compose já haviam sido testados, incluindo proxy com `web` parado e recuperação                                                                                        | [Histórico] |

## O que **não** foi testado ou validado

- `pnpm format` e `pnpm exec eslint . --fix` (reescrevem arquivos), `cp .env.example .env` (não sobrescrevi o `.env` existente) e `nvm install 26.12.1`.
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
| 4   | **Sobras do scaffold em `apps/web` e `apps/admin`**                                | `pnpm-workspace.yaml` e `pnpm-lock.yaml` próprios; o pnpm avisa que as configurações não se aplicam **[Testado]**; README/AGENTS/.gitignore padrão **[Arquivo]**.                                                                                                                                            | Não se sabe se alguma configuração (`allowBuilds`) é intencional.                                                                                                                          | Decidir manter, mover ou remover.                                                                                                                 |
| 5   | **`@frontend/ui` está incompleto**                                                 | `tokens` é exportado e `theme.ts` usa `tokens.spacing`/`tokens.radius`; `tokens.shadows` não é ligado ao tema (escala de sombras do MUI intacta **[Testado]**). `AppButton` é `<button>` simples sem MUI; não há layouts **[Arquivo]**. `@frontend/api` só tem `getApiStatus()`.                             | Aparência no navegador não verificada.                                                                                                                                                     | Usar `tokens.shadows` (ex.: em componentes), criar layouts e componentes MUI; dar função real à API.                                              |
| 6   | **Além das 4 rotas de teste do contexto, existem as páginas `proxy-test`**         | `apps/web/src/app/proxy-test/page.tsx` e `apps/admin/src/app/proxy-test/page.tsx` respondem 200 via proxy **[Testado]**. Todas as 6 estão listadas em [proxy.md](proxy.md#rotas-de-teste-temporárias) e preservadas.                                                                                         | —                                                                                                                                                                                          | Decidir o destino das rotas de teste (hoje preservadas).                                                                                          |

Decisão registrada: a produção é executada **exclusivamente** pelas imagens Docker (standalone); o script `start` foi removido das três apps e não há suporte a iniciar a produção localmente com `pnpm start`/`next start` ([decisions.md](decisions.md), nº 15). As melhorias opcionais da análise de execução (por exemplo, copiar `public` no Dockerfile do proxy, `HEALTHCHECK`, `env` no `turbo.json`) **não** foram aplicadas e permanecem como ideias futuras.

## Registro de validação desta documentação

- **Executados** (resultado em cada guia, marca [Testado]): instalação, `typecheck`, `lint`, `build`, `format:check`, `dev` (tudo e cada app), `nvm use`, `docker build` das 3 imagens, `docker run` isolado, Compose completo (`config`, `up`, `ps`, `logs`, `stop/start/restart`, `--force-recreate`, `down`), cenários de proxy (200, 404, 500, redirects, 502, 504) e verificação de scripts, rotas e links por script.
- **Apenas inspecionados nos arquivos** ([Arquivo]): `pnpm --filter <app> build` individual, `docker compose up -d --build admin|proxy`, regras de lint, `.dockerignore`, `turbo.json` (`outputs`), comentários dos Dockerfiles.
- **Requerem validação manual:** itens da seção "não foi testado" acima.

## Pendências e decisões em aberto

1. **Estratégia de deploy** — não fechada.
2. **Autenticação/autorização** — não decidida; nada implementado.
3. **Biblioteca de UI** — faltam usar `tokens.shadows`, layouts e componentes MUI (hoje `AppButton` é um `<button>` simples); `@frontend/api` tem só uma função de exemplo.
4. **Rotas de teste do proxy** — preservadas; destino futuro não decidido.
5. **Sobras do scaffold** em `apps/web` e `apps/admin` (`pnpm-workspace.yaml`, `pnpm-lock.yaml`, README, AGENTS) — decidir.
6. **Páginas iniciais** de `web` e `admin` ainda são o template do `create-next-app`.
7. **Git** — o repositório não tem commits; não há histórico versionado.
8. **Formatação** — `context/project-context.md` e `prompts/documentation-agent.md` fora do padrão do Prettier.
9. **Kubernetes** — adiado para uma etapa posterior (acesso externo e automação). Não documentado nesta etapa.

## Próximas etapas sugeridas

1. Resolver as pendências 1, 2, 4 e 5 acima conforme a prioridade do projeto.
2. Fazer o primeiro commit para versionar a base (e esta documentação).
3. Em etapa posterior e separada: Kubernetes — documentação da configuração e acesso externo e, depois, automação de implantação.
