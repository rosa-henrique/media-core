# Desenvolvimento local

Legenda das marcas: [README](../README.md#legenda-de-evidências). Pré-requisitos e instalação: [getting-started.md](getting-started.md).

Todos os comandos abaixo partem da **raiz do repositório**, com Node `26.12.1` ativo (`nvm use`).

## Portas, URLs e `basePath`

| App     | Porta | URL direta (dev)              | URL via proxy                 | Dependências em runtime            |
| ------- | ----- | ----------------------------- | ----------------------------- | ---------------------------------- |
| `web`   | 3000  | `http://localhost:3000/web`   | `http://localhost:3002/web`   | nenhuma (usa pacotes do workspace) |
| `admin` | 3001  | `http://localhost:3001/admin` | `http://localhost:3002/admin` | nenhuma                            |
| `proxy` | 3002  | `http://localhost:3002/`      | —                             | `web` e `admin` para encaminhar    |

- As portas de desenvolvimento vêm do script `next dev -p <porta>` de cada app. **[Arquivo]**
- `http://localhost:3000/` e `http://localhost:3001/` retornam 404 (por causa do `basePath`). **[Testado]**
- O proxy sobe sozinho (`/` responde 200), mas sem o destino ele responde **502** em `/web` ou `/admin` (JSON `{"error": "O serviço está temporariamente indisponível. Tente novamente."}` para requisições que não pedem HTML). **[Testado]** com só `admin` e `proxy` ativos: `/admin` → 200; `/web` → 502.

## Executar tudo junto

```bash
pnpm dev
```

- Executa `turbo run dev`: roda o script `dev` de cada projeto que o tem (`web`, `admin`, `proxy`); as bibliotecas não têm `dev`. `dev` é `persistent` e sem cache em `turbo.json`. **[Arquivo]**
- Resultado esperado **[Testado]**: logs prefixados `web:dev`, `admin:dev`, `proxy:dev`; Next.js 16.4.3 (Turbopack); portas 3000, 3001 e 3002 em escuta. O log do proxy mostra `Environments: .env.local`.
- Encerrar: `Ctrl+C` no terminal. Se rodar em segundo plano, encerre pelos PIDs dos processos que escutam nas portas (`lsof -nP -iTCP:3000-3002 -sTCP:LISTEN`).

## Executar somente uma app

```bash
pnpm --filter web dev        # só web   -> http://localhost:3000/web   [Testado]
pnpm --filter admin dev      # só admin -> http://localhost:3001/admin [Testado]
pnpm --filter proxy dev      # só proxy -> http://localhost:3002/      [Testado]
```

Equivalente: `cd apps/web && pnpm dev`. **[A testar]** (o script `dev` existe em cada `package.json`). `pnpm --filter <nome>` usa o campo `name` do `package.json`: `web`, `admin`, `proxy`, `@frontend/ui`, `@frontend/api`. **[Arquivo]**

Para testar o proxy com as duas apps, suba as três (o proxy não inicia as outras). Com `web` ou `admin` isolados, o acesso direto funciona (`/web` → 200 em `:3000`; `/admin` → 200 em `:3001`). **[Testado]**

### Produção: somente pelas imagens Docker

**Decisão:** a produção é executada **exclusivamente** pelas imagens Docker, que rodam o `server.js` gerado por `output: "standalone"` (`node apps/<app>/server.js`). As apps **não têm** script `start`, e **não há suporte** a iniciar a produção localmente com `pnpm start` ou `next start`. Para um ambiente local equivalente à produção, use `docker compose up -d --build` ([docker-compose.md](docker-compose.md)) ou as imagens individuais ([docker.md](docker.md)). Registro em [decisions.md](decisions.md) (decisão nº 15).

Fluxo local:

```bash
pnpm dev        # desenvolvimento: next dev (todas as apps) — [Testado]
pnpm build      # build: next build (gera apps/*/.next, incluindo .next/standalone) — [Testado]
```

O `.next/standalone` gerado no host **não** é o artefato de produção: o `server.js` dele embute caminhos absolutos da máquina e não inclui `.next/static` nem `public`, que o Dockerfile copia à parte. **[Testado]** A imagem constrói e monta tudo por conta própria (`pnpm --filter <app> build` dentro do Dockerfile). **[Arquivo]**

## Comandos disponíveis

Scripts reais **[Arquivo]**:

| Script         | Raiz                  | `web` / `admin` / `proxy` | `@frontend/ui` / `@frontend/api` |
| -------------- | --------------------- | ------------------------- | -------------------------------- |
| `dev`          | `turbo run dev`       | `next dev -p <porta>`     | —                                |
| `build`        | `turbo run build`     | `next build`              | —                                |
| `lint`         | `turbo run lint`      | `eslint .`                | `eslint .`                       |
| `typecheck`    | `turbo run typecheck` | `tsc --noEmit`            | `tsc --noEmit`                   |
| `format`       | `prettier . --write`  | —                         | —                                |
| `format:check` | `prettier . --check`  | —                         | —                                |

Projeto inteiro:

```bash
pnpm typecheck        # [Testado] 5 tarefas
pnpm lint             # [Testado] 5 tarefas
pnpm build            # [Testado] 3 tarefas (web, admin, proxy) em ~6 s
pnpm format:check     # [Testado] (reportou 2 arquivos de insumo)
pnpm format           # [A testar] reescreve arquivos: use com cuidado
```

Uma app ou pacote específico:

```bash
pnpm --filter web typecheck                # [Testado] só tsc da web
pnpm --filter @frontend/ui lint            # [Testado]
pnpm --filter proxy build                  # [A testar] é o comando usado no Dockerfile do proxy
pnpm exec turbo run lint --filter=admin    # [Testado] admin + dependências (api, ui) = 3 tarefas
```

Observações:

- `pnpm --filter X <script>` roda **somente** o script daquele projeto, sem as dependências. `turbo run <tarefa> --filter=X` respeita `dependsOn: ["^<tarefa>"]` e também executa as dependências de workspace. **[Testado]**
- O Turborepo mostra `cache hit` em tarefas inalteradas (cache local em `.turbo/`, ignorado pelo git). **[Testado]** `turbo.json` define as `outputs` de `build`: `.next/**` (exceto `.next/cache/**`), `dist/**`, `lib/**`. **[Arquivo]**
- `pnpm build` em ambiente **sem internet** pode falhar: o layout carrega a fonte Roboto com `next/font/google`. **[Inferência]** (o build testado teve acesso à rede).
- As apps não têm script `start`: a produção usa as imagens Docker (`node apps/<app>/server.js`), ver [docker.md](docker.md). **[Arquivo]**
- `pnpm build` mostra o tipo de cada rota; por exemplo, `/proxy-test-error` é dinâmica (`ƒ`) e `/proxy-redirect-test` é **estática** (`○`, pré-renderizada no build). **[Testado]** Implicação em [proxy.md](proxy.md).

Lint e formatação **[Arquivo]**: ESLint 9 (flat config) com regras de `configs/eslint/base.mjs` (Prettier como regra, ordenação de imports `react` → `next` → `@mui` → `@frontend` → demais → relativos, remoção de imports não usados, `no-console` exceto `warn`/`error`, `eqeqeq`) mais `configs/eslint/next.mjs` (core-web-vitals e TypeScript do Next) nas apps. Prettier: aspas duplas, `;`, `printWidth` 100, vírgula final. As extensões recomendadas e `formatOnSave` estão em `.vscode/`.

## Trabalhar em uma aplicação

1. Rode `pnpm dev` (ou apenas a app e, se precisar do proxy, as três).
2. Edite em `apps/<app>/src/app/`. As páginas usam o App Router: `page.tsx`, `layout.tsx`, `route.ts`. **[Arquivo]**
3. Lembre do `basePath`: links e imagens estáticas devem considerar o prefixo (por exemplo `src="/web/next.svg"` nas páginas atuais; `next/link` o aplica automaticamente). **[Arquivo]**
4. Valide: `pnpm --filter <app> typecheck` e `pnpm --filter <app> lint`.

## Trabalhar em uma biblioteca compartilhada

1. Edite `packages/ui/src` ou `packages/api/src`.
2. Exponha o que for público pelos pontos definidos em `exports` (`src/index.ts`, `src/theme/index.ts`, `components/<Nome>/index.tsx`). **[Arquivo]** Sem isso, a app não consegue importar. Formatos válidos: `@frontend/ui`, `@frontend/ui/theme`, `@frontend/ui/theme/tokens` e `@frontend/ui/AppButton`. **[Testado]**
3. Importe na app pelo nome do pacote: `import { AppButton } from "@frontend/ui";`.
4. Não é necessário build da biblioteca: com `pnpm dev` rodando, a app compila o TypeScript do pacote (`transpilePackages`). **[Arquivo]** A reflexão imediata das mudanças no navegador (hot reload) **[A testar]**.
5. Valide o pacote e quem o consome:

```bash
pnpm --filter @frontend/ui typecheck
pnpm --filter @frontend/ui lint
pnpm typecheck && pnpm lint      # confere web e admin contra a mudança
pnpm build                       # confere o build real (Turbopack/Next) das apps
```

6. Se as imagens Docker também precisam da mudança, reconstrua-as (ver [docker.md](docker.md)): `COPY packages/ packages/` faz parte do Dockerfile.

Novo pacote (**[Inferência]** a partir da estrutura atual; não foi executado): criar `packages/<nome>/` com `package.json` (`name: "@frontend/<nome>"`, `private: true`, `exports`/`types` apontando para `./src/index.ts`, scripts `lint`/`typecheck`), `tsconfig.json` estendendo `../../configs/typescript/base.json`, adicionar `"@frontend/<nome>": "workspace:*"` às apps consumidoras e à lista `transpilePackages`, e atualizar os `COPY` dos Dockerfiles se necessário (hoje copiam `packages/` inteiro).

## Verificações rápidas durante o desenvolvimento

```bash
curl -s -o /dev/null -w '%{http_code}\n' http://localhost:3002/web
curl -s -o /dev/null -w '%{http_code}\n' http://localhost:3002/admin
```

Rotas de teste do proxy: [proxy.md](proxy.md#como-testar).
