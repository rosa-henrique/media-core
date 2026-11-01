# Instalação e primeiro uso

Legenda das marcas: [README](../README.md#legenda-de-evidências).

## Pré-requisitos e versões configuradas

| Ferramenta       | Versão configurada                | Onde está definida **[Arquivo]**                                                                      | Observação                                                     |
| ---------------- | --------------------------------- | ----------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| Node.js          | `26.12.1`                         | `.nvmrc`, `engines.node` em `package.json`, `FROM node:26.12.1-bookworm-slim` nos Dockerfiles         | Versão exata, sem faixa.                                       |
| pnpm             | `12.15.0`                         | `packageManager` em `package.json` (raiz e apps), `npm install --global pnpm@12.15.0` nos Dockerfiles | —                                                              |
| Turborepo        | `^2.11.10` (instalada: `2.11.10`) | `devDependencies` da raiz                                                                             | Instalado como dependência; executado via `pnpm`.              |
| Next.js / React  | `16.4.3` / `19.3.0`               | `package.json` das 3 apps                                                                             | Fixadas (sem `^`). **[Testado]** `next --version` → `v16.4.3`. |
| Docker / Compose | não fixadas                       | —                                                                                                     | **[Testado]** com Docker `29.9.2` e Compose `5.6.1`.           |

Versões do Node e pnpm usadas nos testes desta documentação: `v26.12.1` e `12.15.0`. **[Testado]**

> Armadilha: um terminal sem `nvm` carregado pode não ter `node`/`pnpm` no `PATH` (ocorreu ao preparar esta documentação; sintoma `node: command not found`). Rode `nvm use` na raiz (lê `.nvmrc`) antes de qualquer comando `pnpm`. **[Testado]** `nvm use` → `Now using node v26.12.1`. Se a versão não estiver instalada: `nvm install 26.12.1` **[A testar]**.

## 1. Obter o código e instalar dependências

Execute na **raiz do repositório**.

```bash
nvm use                           # [Testado] "Now using node v26.12.1" (lê .nvmrc)
pnpm install --frozen-lockfile    # [Testado] não altera o lockfile; falha se ele estiver desatualizado
```

Se `pnpm` não existir: `npm install --global pnpm@12.15.0` (comando usado nos Dockerfiles). **[Arquivo]**

Resultado esperado **[Testado]**: `Scope: all 6 workspace projects`, `Lockfile is up to date` e `Done in ...`. Não há `pnpm-workspace.yaml` próprios de `apps/web` e `apps/admin`; o workspace ativo é o de `frontend/`. O histórico dessas advertências está em [troubleshooting.md](troubleshooting.md). **[Arquivo]**

Use `pnpm install` (sem `--frozen-lockfile`) apenas quando quiser alterar dependências. `pnpm-workspace.yaml` tem `allowBuilds: { unrs-resolver: true }`, liberando o script de instalação desse pacote. **[Arquivo]**

## 2. Variáveis de ambiente

Guia completo: [environment.md](environment.md). Resumo:

| Arquivo                 | Para quê                                        | Versionado?                      |
| ----------------------- | ----------------------------------------------- | -------------------------------- |
| `.env.example`          | Modelo do `.env` do Compose                     | Sim                              |
| `.env` (raiz)           | Valores do **Docker Compose**                   | Não (ignorado pelo `.gitignore`) |
| `apps/proxy/.env.local` | **Proxy em desenvolvimento local** (`next dev`) | Não (ignorado pelo `.gitignore`) |

As três variáveis (`PROXY_PUBLIC_ORIGIN`, `WEB_ORIGIN`, `ADMIN_ORIGIN`) são lidas só pelo proxy (e `PROXY_PUBLIC_ORIGIN` também pela rota de teste `proxy-redirect-test` do `web`). **Os valores diferem de propósito:** no Compose, `WEB_ORIGIN=http://web:3000` e `ADMIN_ORIGIN=http://admin:3001` (nomes de serviço da rede Docker); no desenvolvimento local, `http://localhost:3000` e `http://localhost:3001`. Os nomes Docker não resolvem no host, e `localhost` dentro do contêiner não é o host — ver [environment.md](environment.md#por-que-os-endereços-internos-do-docker-não-servem-no-desenvolvimento-local). **[Testado]**

```bash
cp .env.example .env     # Compose [A testar] não executado, para não sobrescrever o .env existente
```

- **Docker Compose:** crie o `.env` a partir do modelo e valide com `docker compose config --quiet`. **[Testado]** (validação)
- **Desenvolvimento local:** `apps/proxy/.env.local` com os valores de `localhost` (procedimento em [environment.md](environment.md#configurar-o-appsproxyenvlocal-desenvolvimento-local)). É opcional na prática, pois os padrões do código são os mesmos valores. **[Arquivo]** `pnpm dev` funcionou com ele. **[Testado]**
- O `next dev` lê `.env*` do diretório da app (`apps/proxy`), **não** o `.env` da raiz. **[Testado]**

## 3. Iniciar o projeto

Escolha uma das formas:

```bash
pnpm dev                          # [Testado] web:3000 admin:3001 proxy:3002, em modo desenvolvimento
# ou
docker compose up -d --build      # [Testado] contêineres; só o proxy fica publicado
```

Detalhes: [local-development.md](local-development.md) e [docker-compose.md](docker-compose.md).

## 4. Verificar que o ambiente funciona

Com `pnpm dev` **ou** Compose rodando, a partir de qualquer diretório. Todas as linhas foram **[Testado]** nos dois modos:

| Comando                                                                | Esperado                                                        |
| ---------------------------------------------------------------------- | --------------------------------------------------------------- |
| `curl -s -o /dev/null -w '%{http_code}\n' http://localhost:3002/`      | `200` (página "Application Gateway")                            |
| `curl -s -o /dev/null -w '%{http_code}\n' http://localhost:3002/web`   | `200`                                                           |
| `curl -s -o /dev/null -w '%{http_code}\n' http://localhost:3002/admin` | `200`                                                           |
| `curl -s http://localhost:3002/web \| grep -o 'API package connected'` | `API package connected` (prova que `@frontend/api` está ligado) |

Só com `pnpm dev`, também é possível acessar as apps diretamente: `http://localhost:3000/web` e `http://localhost:3001/admin` (200). `http://localhost:3000/` retorna **404** por causa do `basePath`. **[Testado]**

No navegador: abra `http://localhost:3002/web` e clique em "Testar AppButton" (exibe um `alert`). **[Arquivo]**

Validação estática (nenhum serviço precisa estar rodando): `pnpm typecheck && pnpm lint` — **[Testado]** passam com 5/5 tarefas. `pnpm format:check` **[Testado]** reportou `context/project-context.md` e `prompts/documentation-agent.md` fora do formato Prettier no momento da inspeção (arquivos de insumo, não alterados).

## Próximos passos

- Rotina de desenvolvimento: [local-development.md](local-development.md)
- Contêineres: [docker.md](docker.md), [docker-compose.md](docker-compose.md)
- Problemas: [troubleshooting.md](troubleshooting.md)
