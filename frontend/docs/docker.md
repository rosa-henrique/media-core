# Docker

Legenda das marcas: [README](../README.md#legenda-de-evidências). Para o ambiente completo com Compose, veja [docker-compose.md](docker-compose.md).

**Estas imagens são a única forma suportada de executar as apps em produção** (standalone, `node apps/<app>/server.js`); as apps não têm script `start` ([decisions.md](decisions.md), nº 15).

Pré-requisito: Docker em execução. Versão usada nos testes: `29.9.2`. **[Testado]** Todos os comandos partem da **raiz do repositório**, porque o contexto de build é a raiz (os Dockerfiles copiam `package.json`, `pnpm-lock.yaml`, `packages/`, `configs/` e todas as apps).

## Imagens

| Serviço | Dockerfile              | Tag local              | Porta do contêiner | Comando de início           |
| ------- | ----------------------- | ---------------------- | ------------------ | --------------------------- |
| web     | `apps/web/Dockerfile`   | `media-core-web:local`   | 3000               | `node apps/web/server.js`   |
| admin   | `apps/admin/Dockerfile` | `media-core-admin:local` | 3001               | `node apps/admin/server.js` |
| proxy   | `apps/proxy/Dockerfile` | `media-core-proxy:local` | 3002               | `node apps/proxy/server.js` |

As tags atuais são definidas no `image:` do `compose.yaml` e nos comandos abaixo. Os comandos de build com `media-core-*` refletem a renomeação e ainda precisam ser executados; os tamanhos observados (~388 MB cada) são das imagens anteriores. **[Arquivo] [Histórico]**

## Como os Dockerfiles funcionam **[Arquivo]**

Os três seguem o mesmo desenho multi-estágio; só mudam o filtro do pnpm, a porta e o caminho do `server.js`.

| Estágio   | O que faz                                                                                                                                                                                                          |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `base`    | `node:26.12.1-bookworm-slim`, define `PNPM_HOME`/`PATH` e instala `pnpm@12.15.0` globalmente.                                                                                                                      |
| `deps`    | Copia os manifestos (`package.json`, `pnpm-lock.yaml`, `pnpm-workspace.yaml`, `package.json` de cada app), `packages/` e `configs/` e executa `pnpm install --frozen-lockfile`.                                    |
| `builder` | `COPY . .` e `pnpm --filter <app> build` (`web`, `admin` ou `proxy`).                                                                                                                                              |
| `runner`  | Parte de `base` (sem as dependências de build): define `NODE_ENV=production`, `PORT`, `HOSTNAME=0.0.0.0`; cria usuário sem privilégios `nextjs` (uid 1001, grupo `nodejs`); copia o resultado e inicia com `node`. |

Decisões relevantes e o que se sabe sobre cada uma:

- **Standalone.** `output: "standalone"` nos `next.config.ts` faz o Next.js gerar `apps/<app>/.next/standalone` (com `server.js` e apenas as dependências rastreadas). A imagem final copia só isso, mais `.next/static` (que o standalone não inclui — comentário no Dockerfile do `web`) e, para `web` e `admin`, `apps/<app>/public`. O `proxy` não copia `public` (a app não tem essa pasta). **[Arquivo]**
- **Caminho `apps/<app>/server.js`.** Como `outputFileTracingRoot` aponta para a raiz do monorepo, o standalone preserva a estrutura de diretórios; por isso o `CMD` é `node apps/<app>/server.js`. **[Arquivo]** **[Testado]** (os contêineres iniciam e respondem).
- **Cache de camadas.** Os manifestos são copiados antes do código para reaproveitar o `pnpm install` (comentário no Dockerfile do `web`). **[Arquivo]** Mas `COPY packages/ packages/` e `COPY configs/ configs/` entram nessa etapa: mudar um pacote reinstala as dependências **[Arquivo]**, e `COPY . .` no `builder` faz qualquer arquivo alterado fora do `.dockerignore` (inclusive `docs/`) invalidar o build da app. **[Inferência]** (as imagens ganharam novos IDs ao serem reconstruídas depois de adicionar documentação ao repositório).
- **Usuário não-root.** `USER nextjs` (uid 1001). **[Arquivo]** **[Testado]** (`docker exec ... id` → `uid=1001(nextjs)`). Motivação não confirmada; comentário no Dockerfile diz "usuário sem privilégios".
- **Versões fixas** de Node e pnpm, iguais às do desenvolvimento local. **[Arquivo]** Comentário do Dockerfile: "Fixamos a versão do Node usada pelo projeto."
- **Sem `HEALTHCHECK` no Dockerfile.** Os health checks estão no `compose.yaml`. **[Arquivo]** Sem Compose, o `docker ps` não mostra `(healthy)`.
- **Sem segredos na imagem:** `.env` e `.env.*` estão no `.dockerignore` (a exceção `!.env.example` é permitida). Variáveis de runtime entram por `-e`/Compose; a imagem do proxy não contém arquivos `.env*` (o `apps/proxy/.env.local` fica de fora). **[Arquivo]** **[Testado]** Ver [environment.md](environment.md).
- **Build precisa de rede** para baixar dependências e a fonte Roboto (`next/font/google`) em `web`/`admin`. **[Inferência]** (build testado com rede).

### `.dockerignore` **[Arquivo]**

Exclui do contexto: `node_modules`, `.next`, `.turbo`, `.git`, `.DS_Store`, `coverage`, `.env`, `.env.*` (mantendo `.env.example`) e logs do gerenciador de pacotes, na raiz e em subpastas (`**/`). Não exclui `docs/`, `deploy/`, `context/` nem `prompts/`.

## Construir as imagens

```bash
docker build -f apps/web/Dockerfile   -t media-core-web:local   .   # [A testar após a renomeação]
docker build -f apps/admin/Dockerfile -t media-core-admin:local .   # [A testar após a renomeação]
docker build -f apps/proxy/Dockerfile -t media-core-proxy:local .   # [A testar após a renomeação]
```

Resultado esperado: termina com `naming to docker.io/library/media-core-<app>:local done`. Com cache, leva segundos; a primeira vez, minutos. Para ignorar o cache: acrescente `--no-cache` (**[A testar]**). Listar: `docker images | grep '^media-core-'` (**[A testar após a renomeação]**).

### Reconstruir após uma alteração

1. Altere código, dependência ou Dockerfile.
2. Rode o `docker build` da app afetada (mesma linha acima). Mudanças em `packages/*`, `configs/*`, `pnpm-lock.yaml` ou no `package.json` de qualquer app afetam **todas** as imagens que dependem desses arquivos (as três copiam `packages/` e `configs/`).
3. Recrie o contêiner: o contêiner em execução continua usando a imagem antiga. Pare e remova (`docker rm -f <nome>`) e execute novamente com `docker run`. **[Arquivo]** (comportamento padrão do Docker.)

Com Compose, `docker compose up -d --build <serviço>` faz os passos 2 e 3 (ver [docker-compose.md](docker-compose.md)). **[Testado]**

## Executar cada aplicação isoladamente

Variáveis por imagem **[Arquivo]**:

| Imagem | Variáveis necessárias                                                                                                                              | Padrões já na imagem                                   |
| ------ | -------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| web    | Nenhuma                                                                                                                                            | `NODE_ENV=production`, `PORT=3000`, `HOSTNAME=0.0.0.0` |
| admin  | Nenhuma                                                                                                                                            | `NODE_ENV=production`, `PORT=3001`, `HOSTNAME=0.0.0.0` |
| proxy  | `WEB_ORIGIN`, `ADMIN_ORIGIN` e `PROXY_PUBLIC_ORIGIN` — sem elas valem os padrões `localhost`, que **não** funcionam dentro de um contêiner isolado | `NODE_ENV=production`, `PORT=3002`, `HOSTNAME=0.0.0.0` |

### Só `web` (ou só `admin`)

```bash
docker run -d --name media-core-web -p 3000:3000 media-core-web:local     # [A testar após a renomeação]
curl -s -o /dev/null -w '%{http_code}\n' http://localhost:3000/web      # esperado: 200
```

Para o `admin`, use `--name media-core-admin -p 3001:3001 media-core-admin:local` e `/admin`. Os testes de execução isolada foram feitos com as imagens anteriores; repetir após a renomeação. Remova depois com `docker rm -f media-core-web` ou `docker rm -f media-core-admin`.

### Proxy com `web` e `admin` (rede própria)

Os contêineres precisam estar na mesma rede para resolver nomes. A sequência abaixo usa os nomes Media Core atuais e ainda precisa de validação prática; o teste anterior usou outros nomes.

```bash
docker network create media-core-dev-net

docker run -d --name media-core-web   --network media-core-dev-net media-core-web:local
docker run -d --name media-core-admin --network media-core-dev-net media-core-admin:local
docker run -d --name media-core-proxy --network media-core-dev-net -p 3002:3002 \
  -e PROXY_PUBLIC_ORIGIN=http://localhost:3002 \
  -e WEB_ORIGIN=http://media-core-web:3000 \
  -e ADMIN_ORIGIN=http://media-core-admin:3001 \
  media-core-proxy:local

curl -s -o /dev/null -w '%{http_code}\n' http://localhost:3002/web      # 200
curl -s -o /dev/null -w '%{http_code}\n' http://localhost:3002/admin    # 200
```

> Atenção: se o nome da rede já existir de outra execução, escolha outro. Os nomes dos contêineres abaixo são exemplos de execução isolada e não alteram os nomes de serviço do Compose.

Resultado esperado (observado no teste anterior): `/`, `/web`, `/admin` → `200`; `/web/proxy-redirect-test` → `302` com `Location: http://localhost:3002/web/proxy-redirect-target`; `/web/proxy-test-error` → `500`. Na execução anterior, `docker stop fe-web` fez o proxy responder `502`; ao iniciar `fe-web` novamente, voltou a `200`. Esses comandos com as tags e nomes atuais ainda não foram executados.

## Logs, inspeção, parar e remover

```bash
docker ps                                    # contêineres em execução
docker logs media-core-proxy                         # [A testar após a renomeação]
docker logs -f --tail 50 media-core-proxy            # [A testar após a renomeação] (Ctrl+C para sair)
docker inspect media-core-web -f '{{.Config.User}} {{.Config.Cmd}} {{.Config.ExposedPorts}}'
docker exec media-core-proxy id
docker stop media-core-web ; docker start media-core-web
docker rm -f media-core-web media-core-admin media-core-proxy
docker network rm media-core-dev-net
```

- O log do proxy registra `Erro ao encaminhar requisição pelo proxy: ...` (via `console.error`) quando o destino está inacessível. **[Testado]**
- Os logs persistem entre `stop`/`start`/`restart` do mesmo contêiner. **[Testado]** (no Compose; comportamento padrão do Docker)
- A remoção de imagens (`docker rmi media-core-web:local`) **[A testar]** e não é necessária para o fluxo normal.

## Troubleshooting

Ver [troubleshooting.md](troubleshooting.md#docker-e-compose).
