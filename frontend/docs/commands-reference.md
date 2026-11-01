# Referência rápida de comandos

Legenda das marcas: [README](../README.md#legenda-de-evidências). Os comandos Docker foram testados antes da renomeação; os novos nomes de imagem e de projeto Compose ainda precisam ser executados para validação.

**[Testado]** = executado com sucesso durante a elaboração desta documentação; **[Arquivo]** = o script/serviço existe, mas o comando não foi executado; **[A testar]** = coerente com os arquivos/Docker, sem execução. Diretório de execução: **raiz do repositório**, salvo indicação. Node `26.12.1` ativo (`nvm use`).

## Matriz: monorepo inteiro e cada aplicação

Os comandos exatos, com o estado de validação de cada um, estão nas seções seguintes. `<app>` = `web`, `admin` ou `proxy` (porta 3000, 3001, 3002). Ressalvas da matriz: o build individual `pnpm --filter <app> build` foi coberto só indiretamente por `pnpm build` (Turborepo); `docker compose up -d --build <serviço>` foi testado apenas com `web`; `docker run` isolado foi testado para as três imagens.

| Alvo                                | Desenvolvimento                    | Build                       | Lint / typecheck                                               | Imagem Docker                                                     | Contêiner isolado                                                                                                                        | Compose                                                            |
| ----------------------------------- | ---------------------------------- | --------------------------- | -------------------------------------------------------------- | ----------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| **Monorepo inteiro**                | `pnpm dev`                         | `pnpm build`                | `pnpm lint` · `pnpm typecheck`                                 | 3 comandos `docker build` (um por app)                            | —                                                                                                                                        | `docker compose up -d --build`                                     |
| **`web`**                           | `pnpm --filter web dev`            | `pnpm --filter web build`   | `pnpm --filter web lint` · `… typecheck`                       | `docker build -f apps/web/Dockerfile -t media-core-web:local .`     | `docker run -d -p 3000:3000 media-core-web:local`                                                                                          | `docker compose up -d --build web`                                 |
| **`admin`**                         | `pnpm --filter admin dev`          | `pnpm --filter admin build` | `pnpm --filter admin lint` · `… typecheck`                     | `docker build -f apps/admin/Dockerfile -t media-core-admin:local .` | `docker run -d -p 3001:3001 media-core-admin:local`                                                                                        | `docker compose up -d --build admin`                               |
| **`proxy`**                         | `pnpm --filter proxy dev`          | `pnpm --filter proxy build` | `pnpm --filter proxy lint` · `… typecheck`                     | `docker build -f apps/proxy/Dockerfile -t media-core-proxy:local .` | `docker run -d -p 3002:3002 -e WEB_ORIGIN=… -e ADMIN_ORIGIN=… -e PROXY_PUBLIC_ORIGIN=… media-core-proxy:local` (em rede com `web`/`admin`) | `docker compose up -d --build proxy` (sobe/espera `web` e `admin`) |
| **`@frontend/ui`, `@frontend/api`** | — (compilados pela app que os usa) | — (sem build próprio)       | `pnpm --filter @frontend/ui lint` · `… typecheck` (idem `api`) | — (copiados nas imagens via `COPY packages/ packages/`)           | —                                                                                                                                        | —                                                                  |

**Produção:** exclusivamente pelas imagens Docker, que executam o `server.js` gerado pelo `output: "standalone"` (`node apps/<app>/server.js`). As apps **não têm** script `start`: não há suporte a iniciar a produção localmente com `pnpm start` ou `next start`. Veja [decisions.md](decisions.md) (decisão nº 15).

Execução isolada com `docker run`: [docker.md](docker.md#executar-cada-aplicação-isoladamente). Operação de um serviço no Compose: [docker-compose.md](docker-compose.md#operar-um-serviço).

## Instalação e verificação

| Comando                                   | Efeito / resultado esperado                                          | Estado     |
| ----------------------------------------- | -------------------------------------------------------------------- | ---------- |
| `nvm use`                                 | Ativa Node `26.12.1` (de `.nvmrc`)                                   | [Testado]  |
| `pnpm install --frozen-lockfile`          | Instala o workspace sem alterar o lockfile; `Lockfile is up to date` | [Testado]  |
| `pnpm install`                            | Instala e pode atualizar o lockfile (use ao mudar dependências)      | [A testar] |
| `pnpm ls -r --depth -1`                   | Lista os 6 projetos do workspace                                     | [Testado]  |
| `pnpm exec turbo --version`               | `2.11.10`                                                            | [Testado]  |
| `pnpm --filter proxy exec next --version` | `Next.js v16.4.3`                                                    | [Testado]  |

## Scripts do monorepo (raiz)

| Comando             | Executa               | Estado                                       |
| ------------------- | --------------------- | -------------------------------------------- |
| `pnpm dev`          | `turbo run dev`       | [Testado] (web 3000, admin 3001, proxy 3002) |
| `pnpm build`        | `turbo run build`     | [Testado] (3 tarefas; ~6 s)                  |
| `pnpm lint`         | `turbo run lint`      | [Testado] (5 tarefas)                        |
| `pnpm typecheck`    | `turbo run typecheck` | [Testado] (5 tarefas)                        |
| `pnpm format:check` | `prettier . --check`  | [Testado] (acusou 2 arquivos de insumo)      |
| `pnpm format`       | `prettier . --write`  | [Arquivo] — reescreve arquivos               |

## Por projeto

| Comando                                   | Efeito                                              | Estado    |
| ----------------------------------------- | --------------------------------------------------- | --------- |
| `pnpm --filter web dev`                   | Só web (`next dev -p 3000`)                         | [Testado] |
| `pnpm --filter admin dev`                 | Só admin (`next dev -p 3001`)                       | [Testado] |
| `pnpm --filter proxy dev`                 | Só proxy (`next dev -p 3002`)                       | [Testado] |
| `pnpm --filter <app> build`               | `next build` da app (`web`, `admin`, `proxy`)       | [Arquivo] |
| `pnpm --filter web typecheck`             | `tsc --noEmit`                                      | [Testado] |
| `pnpm --filter @frontend/ui lint`         | `eslint .` no pacote                                | [Testado] |
| `pnpm --filter @frontend/api typecheck`   | `tsc --noEmit` no pacote                            | [Arquivo] |
| `pnpm exec turbo run lint --filter=admin` | Lint de admin **e** suas dependências (`api`, `ui`) | [Testado] |
| `pnpm -r exec <cmd>`                      | Executa `<cmd>` em cada projeto (ex.: `pwd`)        | [Testado] |

Nomes de projeto: `web`, `admin`, `proxy`, `@frontend/ui`, `@frontend/api`. Pacotes **não** têm `dev`, `build` nem `start`; as apps têm `dev`, `build`, `lint` e `typecheck` (sem `start`).

## Verificação HTTP (com os serviços de pé)

| Comando                                                           | Esperado                                                  | Estado    |
| ----------------------------------------------------------------- | --------------------------------------------------------- | --------- |
| `curl -s -o /dev/null -w '%{http_code}\n' http://localhost:3002/` | `200`                                                     | [Testado] |
| `… http://localhost:3002/web` / `/admin`                          | `200`                                                     | [Testado] |
| `… http://localhost:3000/web` e `http://localhost:3001/admin`     | `200` (somente `pnpm dev`; no Compose não são publicadas) | [Testado] |
| `… http://localhost:3000/` (dev)                                  | `404` (`basePath`)                                        | [Testado] |
| `curl -i http://localhost:3002/web/proxy-test-error`              | `500` JSON                                                | [Testado] |
| `curl -i http://localhost:3002/web/proxy-redirect-test`           | `302` → `http://localhost:3002/web/proxy-redirect-target` | [Testado] |
| `curl -i http://localhost:3002/web/proxy-external-redirect-test`  | `302` → `https://example.com/`                            | [Testado] |

## Docker

| Comando                                                                                                                                  | Efeito                                  | Estado    |
| ---------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------- | --------- |
| `docker build -f apps/web/Dockerfile -t media-core-web:local .`                                                                          | Constrói a imagem web (contexto = raiz) | [A testar após a renomeação] |
| `docker build -f apps/admin/Dockerfile -t media-core-admin:local .`                                                                      | Constrói a imagem admin                 | [A testar após a renomeação] |
| `docker build -f apps/proxy/Dockerfile -t media-core-proxy:local .`                                                                      | Constrói a imagem proxy                 | [A testar após a renomeação] |
| `docker images \| grep '^media-core-'`                                                                                                   | Lista as imagens locais                 | [A testar após a renomeação] |
| `docker network create <rede>`                                                                                                           | Rede para execução isolada              | [Testado] |
| `docker run -d --name <n> --network <rede> media-core-web:local`                                                                         | Executa web/admin sem publicar porta    | [A testar após a renomeação] |
| `docker run -d --name <n> --network <rede> -p 3002:3002 -e PROXY_PUBLIC_ORIGIN=… -e WEB_ORIGIN=… -e ADMIN_ORIGIN=… media-core-proxy:local` | Executa o proxy                         | [A testar após a renomeação] |
| `docker run -d --name <n> -p 3000:3000 media-core-web:local`                                                                             | Web com porta publicada                 | [A testar após a renomeação] |
| `docker logs <n>` / `docker logs -f --tail 50 <n>`                                                                                       | Logs (a segunda forma: seguir)          | [Testado] |
| `docker inspect <n> -f '{{.Config.User}} {{.Config.Cmd}}'`                                                                               | Usuário e comando do contêiner          | [Testado] |
| `docker exec <n> id`                                                                                                                     | Comando dentro do contêiner             | [Testado] |
| `docker stop <n>` / `docker start <n>`                                                                                                   | Parar / iniciar                         | [Testado] |
| `docker rm -f <n> …` / `docker network rm <rede>`                                                                                        | Remover contêineres / rede              | [Testado] |

## Docker Compose

| Comando                                             | Efeito                                                  | Estado    |
| --------------------------------------------------- | ------------------------------------------------------- | --------- |
| `docker compose config --quiet`                     | Valida `compose.yaml` e o `.env` (sem imprimir valores) | [A testar após a renomeação] |
| `docker compose config --services`                  | `admin`, `web`, `proxy`                                 | [Testado] |
| `docker compose up -d`                              | Sobe tudo com as imagens existentes                     | [A testar após a renomeação] |
| `docker compose up -d --build`                      | Reconstrói e sobe tudo                                  | [A testar após a renomeação] |
| `docker compose up -d --build web`                  | Reconstrói e recria só o `web`                          | [A testar após a renomeação] |
| `docker compose ps`                                 | Estado e health                                         | [Testado] |
| `docker compose logs [--tail N] [serviço…]`         | Logs                                                    | [Testado] |
| `docker compose logs -f <serviço>`                  | Seguir logs                                             | [Testado] |
| `docker compose stop web` / `start web`             | Parar / iniciar só um serviço                           | [Testado] |
| `docker compose restart proxy`                      | Reiniciar um serviço                                    | [Testado] |
| `docker compose up -d --force-recreate web`         | Recria o contêiner de um serviço                        | [Testado] |
| `docker compose up -d --no-deps proxy`              | Aplica mudanças só ao proxy (no-op se nada mudou)       | [Testado] |
| `docker compose ls`                                 | Projeto Compose `media-core` (após subir o ambiente)    | [A testar após a renomeação] |
| `docker network inspect media-core_frontend-network` | Contêineres da rede                                     | [A testar após a renomeação] |
| `docker compose exec -T proxy <cmd>`                | Executar comando no serviço                             | [Testado] |
| `docker compose down`                               | Remove contêineres e rede (mantém imagens)              | [Testado] |

## Fluxos comuns

**Primeiro uso, sem Docker**

```bash
nvm use && pnpm install --frozen-lockfile && pnpm dev
# em outro terminal
curl -I http://localhost:3002/web
```

**Antes de abrir um PR / commit**

```bash
pnpm typecheck && pnpm lint && pnpm format:check && pnpm build
```

**Primeiro uso, com Compose**

```bash
cp .env.example .env
docker compose up -d --build
docker compose ps          # aguardar 3x (healthy)
curl -I http://localhost:3002/admin
docker compose down
```

**Depois de alterar uma app e querer ver no contêiner**

```bash
docker compose up -d --build web      # ou admin / proxy
```

**Depois de alterar um pacote compartilhado (`packages/*`)**

```bash
pnpm typecheck && pnpm lint           # valida os consumidores
docker compose up -d --build          # as três imagens copiam packages/
```

Arquivos citados: [file-map.md](file-map.md). Problemas: [troubleshooting.md](troubleshooting.md).
