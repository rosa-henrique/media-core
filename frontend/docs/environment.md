# Variáveis de ambiente

Legenda das marcas: [README](../README.md#legenda-de-evidências). Este é o guia de referência sobre configuração por variáveis de ambiente; os demais documentos apontam para cá.

> Por regra do projeto, **não se documentam valores de arquivos `.env`**. Os valores citados abaixo são os endereços de serviço decididos para cada ambiente (URLs, sem segredos), os mesmos do `.env.example` versionado. Os arquivos reais `.env` e `apps/proxy/.env.local` foram comparados com eles apenas por verificação booleana, sem imprimir conteúdo. **[Testado]**

## Resumo

| Arquivo                 | Finalidade                                                        | Usado por                                         | Versionado?                   |
| ----------------------- | ----------------------------------------------------------------- | ------------------------------------------------- | ----------------------------- |
| `.env` (raiz)           | Valores locais para o **Docker Compose**                          | `docker compose` (interpolação do `compose.yaml`) | Não — ignorado pelo git       |
| `.env.example` (raiz)   | Modelo versionado do `.env` do Compose                            | Pessoas (cópia) e `docker compose --env-file`     | Sim — exceção no `.gitignore` |
| `apps/proxy/.env.local` | Configuração do **Proxy em desenvolvimento local**                | `next dev` em `apps/proxy`                        | Não — ignorado pelo git       |
| `compose.yaml`          | Injeta as três variáveis no serviço `proxy` (bloco `environment`) | Docker Compose                                    | Sim                           |

Os três arquivos de ambiente têm exatamente as mesmas três variáveis. **[Testado]**

## Variáveis

| Variável              | Finalidade                                                                 | Quem lê **[Arquivo]**                                                                                                     | Padrão no código se ausente |
| --------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- | --------------------------- |
| `PROXY_PUBLIC_ORIGIN` | Origem pública do proxy, para reescrever `Location` de redirects internos. | Proxy (`apps/proxy/src/lib/config.ts`). Também a app `web` na rota de teste `proxy-redirect-test` ([proxy.md](proxy.md)). | `http://localhost:3002`     |
| `WEB_ORIGIN`          | Origem da app Web, para onde o proxy encaminha `/web/*`.                   | Proxy                                                                                                                     | `http://localhost:3000`     |
| `ADMIN_ORIGIN`        | Origem da app Admin, para onde o proxy encaminha `/admin/*`.               | Proxy                                                                                                                     | `http://localhost:3001`     |

Uma `/` final é removida pelo código. Não há variáveis com prefixo `NEXT_PUBLIC_`; as três são lidas no servidor, a cada requisição (`process.env` dentro das funções e rotas `force-dynamic`). **[Arquivo]**

### Vercel

Na implantação com Vercel Services, `WEB_ORIGIN` e `ADMIN_ORIGIN` são fornecidas ao Proxy pelos bindings declarados em [vercel.json](../vercel.json), não por valores fixos do `.env` local. `PROXY_PUBLIC_ORIGIN` continua opcional: se não estiver definido, o Proxy usa a origem da requisição recebida. Consulte [vercel.md](vercel.md) para a topologia, Dashboard e comportamento de redirects.

## Valores por ambiente (diferenças intencionais)

| Variável              | Compose (`.env`, modelo em `.env.example`) | Desenvolvimento local (`apps/proxy/.env.local`) |
| --------------------- | ------------------------------------------ | ----------------------------------------------- |
| `PROXY_PUBLIC_ORIGIN` | `http://localhost:3002`                    | `http://localhost:3002`                         |
| `WEB_ORIGIN`          | `http://web:3000`                          | `http://localhost:3000`                         |
| `ADMIN_ORIGIN`        | `http://admin:3001`                        | `http://localhost:3001`                         |

**[Intenção]** A diferença em `WEB_ORIGIN` e `ADMIN_ORIGIN` é proposital. `PROXY_PUBLIC_ORIGIN` é igual nos dois porque, em ambos, o navegador acessa o proxy publicado em `localhost:3002`. Conferido nos arquivos reais por comparação booleana. **[Testado]**

## Por que os endereços internos do Docker não servem no desenvolvimento local

- `http://web:3000` e `http://admin:3001` usam **nomes de serviço**, resolvidos pelo DNS da rede `media-core_frontend-network` que o Compose cria. Esses nomes só existem **dentro** dos contêineres dessa rede. **[Arquivo]** **[Testado antes da renomeação]** (o proxy, dentro da rede, alcançou `http://web:3000/web` e `http://admin:3001/admin`).
- No desenvolvimento local, `web` e `admin` rodam **no host** (`pnpm dev`), onde esses nomes não existem. **[Testado]**: rodando `WEB_ORIGIN=http://web:3000 pnpm --filter proxy dev` com o `web` ativo em `:3000`, `/web` respondeu **502** e o log do proxy registrou `getaddrinfo ENOTFOUND web`. Com o `.env.local` (`localhost`), o mesmo cenário respondeu 200.
- O inverso também vale: dentro do contêiner do proxy, `localhost` é o **próprio contêiner do proxy**, não o host nem os outros serviços; por isso o Compose usa os nomes `web` e `admin`. **[Inferência]** (comportamento padrão de redes Docker; não reproduzido aqui).
- Resumo: **endereços de serviço Docker → só no `.env` do Compose; `localhost` → só no `.env.local` do desenvolvimento local.**

## Criar o `.env` a partir do `.env.example` (Compose)

Execute na **raiz do repositório**.

```bash
cp .env.example .env     # [A testar] não executado, para não sobrescrever o .env existente
docker compose config --quiet   # [Testado] sem saída e código 0 = variáveis resolvidas
```

1. O `.env.example` já traz os valores do Compose; em geral basta copiá-lo sem editar. **[Arquivo]**
2. Se editar, mantenha `WEB_ORIGIN`/`ADMIN_ORIGIN` com os **nomes de serviço** do `compose.yaml` (`web`, `admin`) e as portas dos serviços (3000, 3001).
3. Para validar o modelo sem tocar no `.env`: `docker compose --env-file .env.example config --quiet`. **[Testado]** (com uma cópia do modelo)
4. Aplicar uma mudança: `docker compose up -d proxy`. **[Testado]** (o Compose reiniciou o contêiner do proxy e ele voltou a `healthy`.)
5. Não commite o `.env`: ele está no `.gitignore`.

## Configurar o `apps/proxy/.env.local` (desenvolvimento local)

1. Crie o arquivo em `apps/proxy/.env.local` com os valores de **localhost**:

```dotenv
PROXY_PUBLIC_ORIGIN=http://localhost:3002
WEB_ORIGIN=http://localhost:3000
ADMIN_ORIGIN=http://localhost:3001
```

2. Suba o ambiente: `pnpm dev` (ou `pnpm --filter proxy dev`). O log do proxy deve mostrar `Environments: .env.local`. **[Testado]**
3. Reinicie o dev server ao alterar o arquivo (recarga automática ao editar o arquivo: **[A testar]**).
4. Este arquivo é opcional na prática: os padrões no código são os mesmos valores de localhost. **[Arquivo]** Mantê-lo torna a configuração local explícita e permite ajustá-la sem exportar variáveis. A criação do arquivo por este procedimento (a partir do zero) **[A testar]**; o arquivo atual já existe e foi usado no `pnpm dev` testado.
5. Não commite o arquivo: `.env.*` está no `.gitignore`.

`web` e `admin` **não** precisam de variáveis em desenvolvimento local, e não existe `.env*` em `apps/web` nem `apps/admin`. **[Testado]**

## Como o Next.js e o Docker Compose carregam os arquivos

### Next.js (`pnpm dev`, `pnpm --filter proxy dev`)

- Carrega os arquivos `.env*` do **diretório do projeto Next.js** onde o comando executa (aqui, `apps/proxy`), não da raiz do monorepo. **[Testado]** O log mostra apenas `Environments: .env.local`; e, com o `web` em `localhost:3000`, o proxy local o alcança — o que não ocorreria se o `.env` da raiz (com `web:3000`) estivesse sendo usado.
- Ordem de precedência (documentação do Next.js 16 empacotada em `node_modules/next/dist/docs`): `process.env` → `.env.$(NODE_ENV).local` → `.env.local` (não verificado com `NODE_ENV=test`) → `.env.$(NODE_ENV)` → `.env`. **[Arquivo]**
- Portanto uma variável exportada no shell vence o `.env.local`. **[Testado]**: `WEB_ORIGIN=http://web:3000` no shell prevaleceu sobre o `.env.local`.
- O `.env` da raiz **não** é carregado pelo `next dev` do proxy; ele serve apenas ao Compose. **[Testado]**

### Docker Compose

- Lê o `.env` do **diretório do projeto** (onde está o `compose.yaml`) para substituir `${PROXY_PUBLIC_ORIGIN}`, `${WEB_ORIGIN}` e `${ADMIN_ORIGIN}` no `compose.yaml`. **[Arquivo]**
- Uma variável definida no shell vence o `.env`. **[Testado]** (`WEB_ORIGIN=... docker compose config` mostrou o valor do shell.)
- Variável ausente: o Compose avisa `The "<NOME>" variable is not set. Defaulting to a blank string.` e usa **string vazia** (sem falhar). **[Testado]** Como os padrões do código só valem para variável **não definida** (`??`), uma string vazia **não** aciona o padrão; o efeito no proxy (provável 502) **[Inferência]**, não reproduzido.
- O `compose.yaml` **não usa** `env_file:`: o `.env` não é injetado inteiro nos contêineres; só as três variáveis chegam ao serviço `proxy`, pelo bloco `environment` (junto com `NODE_ENV`, `PORT` e `HOSTNAME`). `web` e `admin` não recebem variáveis. **[Arquivo]** **[Testado]**
- O `.dockerignore` exclui `.env` e `.env.*` (mantém `.env.example`) do contexto de build; a imagem Proxy anterior (`frontend-proxy:local`) não continha nenhum arquivo `.env*`. **[Arquivo]** **[Histórico]** (`find /app -name ".env*"` → nenhum.) Logo o `apps/proxy/.env.local` **não** vai para a imagem; dentro do contêiner valem só as variáveis do Compose.
- Fora do Compose, `docker run -e VAR=valor ...` fornece as mesmas variáveis ao proxy ([docker.md](docker.md)). **[Testado]**

## Verificações

```bash
git check-ignore -v .env apps/proxy/.env.local .env.example
# .gitignore:15:.env  ...  .gitignore:16:.env.*  ...  .gitignore:17:!.env.example   [Testado]

docker compose config --quiet                                              # valida o .env
docker compose exec -T proxy printenv | sed -E 's/=.*/=<valor>/'            # só nomes, sem valores
```

Resultado de `git check-ignore -v` **[Testado]**: `.env` ← linha 15; `apps/proxy/.env.local` ← linha 16 (`.env.*`); `.env.example` ← linha 17, regra de exceção `!.env.example` (não ignorado). O `.env` não é rastreado pelo git (`git ls-files --error-unmatch .env` não o encontra). **[Testado]**

## Cuidados

- Hoje as três variáveis são URLs, sem segredos. Mesmo assim, não cole o conteúdo de `.env` ou `apps/proxy/.env.local` em issues, logs ou documentação.
- Esta etapa não introduz nenhum mecanismo adicional de gestão de configuração; a configuração permanece nos arquivos e no `compose.yaml` descritos acima.
- Problemas comuns: [troubleshooting.md](troubleshooting.md).
