# Proxy (`apps/proxy`)

Legenda das marcas: [README](../README.md#legenda-de-evidências). Visão de arquitetura: [architecture.md](architecture.md).

## Função

Aplicação Next.js (porta 3002) que serve a própria página em `/` e encaminha as requisições de `/web` e `/admin` para as apps `web` e `admin`, permitindo acessá-las sob um único endereço. **[Arquivo]** **[Testado]**

Código: [`src/lib/forward-request.ts`](../apps/proxy/src/lib/forward-request.ts) (lógica), [`src/lib/config.ts`](../apps/proxy/src/lib/config.ts) (variáveis), [`src/app/web/[[...path]]/route.ts`](../apps/proxy/src/app/web/[[...path]]/route.ts) e [`src/app/admin/[[...path]]/route.ts`](../apps/proxy/src/app/admin/[[...path]]/route.ts) (rotas).

## Regras de roteamento **[Arquivo]**

| Requisição ao proxy            | Tratamento                                                                                           |
| ------------------------------ | ---------------------------------------------------------------------------------------------------- |
| `/`                            | Página do próprio proxy ("Application Gateway") — **não** é encaminhada.                             |
| `/web` e `/web/<qualquer>`     | Encaminhada para `WEB_ORIGIN` mantendo o caminho completo, ex.: `WEB_ORIGIN/web/<qualquer>?<query>`. |
| `/admin` e `/admin/<qualquer>` | Idem para `ADMIN_ORIGIN`.                                                                            |
| Outros caminhos (`/foo`)       | 404 do próprio proxy. **[Testado]**                                                                  |

- Cada `route.ts` exporta `GET`, `HEAD`, `POST`, `PUT`, `PATCH`, `DELETE` e `OPTIONS`, todos chamando `forwardRequest(request, "web" | "admin")`, e `dynamic = "force-dynamic"`. Os métodos são repassados (POST para uma rota só de GET na `web` retornou 405 da própria `web`; `HEAD /web` → 200; `OPTIONS /admin` → 405 da `admin`). **[Testado]**
- O caminho da app de destino precisa começar com o mesmo prefixo: por isso `basePath: "/web"` e `"/admin"`. Não há reescrita de caminho.
- Uma barra final (`/web/proxy-test/`) é tratada pelo próprio Next.js do proxy (308 para `/web/proxy-test`) antes de chegar ao encaminhamento. **[Testado]** (comportamento padrão do Next.js; não faz parte do código do projeto).
- O bloco comentado em `next.config.ts` documenta uma versão anterior com `rewrites`, mantida só como referência e que, segundo o comentário, **não deve** ser ativada junto com os Route Handlers. **[Arquivo]**

## Variáveis de ambiente **[Arquivo]**

| Variável              | Padrão (se ausente)     | Uso                                                                                     |
| --------------------- | ----------------------- | --------------------------------------------------------------------------------------- |
| `WEB_ORIGIN`          | `http://localhost:3000` | Destino de `/web/*`.                                                                    |
| `ADMIN_ORIGIN`        | `http://localhost:3001` | Destino de `/admin/*`.                                                                  |
| `PROXY_PUBLIC_ORIGIN` | `http://localhost:3002` | Origem pública usada para reescrever `Location` de redirects. Uma `/` final é removida. |

Lidas **em tempo de execução** a cada requisição (`process.env` dentro das funções). **[Arquivo]** Um valor passado por `docker run -e` foi respeitado. **[Testado]** Valores por ambiente: [getting-started.md](getting-started.md#2-variáveis-de-ambiente).

## O que o encaminhamento faz **[Arquivo]**

1. Monta a URL de destino: origem + caminho + query string originais.
2. Copia os cabeçalhos da requisição, removendo os _hop-by-hop_ (`connection`, `keep-alive`, `proxy-authenticate`, `proxy-authorization`, `te`, `trailer`, `transfer-encoding`, `upgrade`) e o `host`. Os demais (cookies, `authorization` etc.) seguem. Não adiciona `X-Forwarded-*`.
3. Envia com `fetch`: mesmo método; corpo apenas se não for GET/HEAD (em stream, `duplex: "half"`); `redirect: "manual"` (não segue redirects); **timeout de 10 s** (`REQUEST_TIMEOUT_MS = 10_000`).
4. Resposta do destino:
   - **5xx em navegação HTML** → substituída por página amigável (ver abaixo), preservando o status.
   - **Redirects (301, 302, 303, 307, 308)** → se o `Location` aponta para a origem interna da própria app, é reescrito para a origem pública do proxy (caminho, query e fragmento preservados); se aponta para outro domínio, permanece igual. `Location` relativo é resolvido contra a origem interna e, portanto, também é reescrito para absoluto.
   - Demais respostas → status, `statusText` e corpo preservados. Removem-se cabeçalhos hop-by-hop da resposta e `content-encoding` e `content-length` (o `fetch` pode descomprimir o corpo). `HEAD` devolve corpo vazio.
5. **Falha de conexão ou exceção** → `502`; **timeout** (`TimeoutError`/`AbortError`) → `504`. O erro técnico é registrado com `console.error` ("Erro ao encaminhar requisição pelo proxy:"), sem ser exposto ao cliente.

### Erros amigáveis

Uma requisição é "navegação HTML" quando o `Accept` contém `text/html`, o caminho não contém `/_next/` e não há os cabeçalhos `rsc`, `next-router-prefetch` nem `next-router-state-tree`. **[Arquivo]**

| Situação                   | Navegação HTML                                                           | Outras requisições (API, `fetch`, prefetch, `/_next/`)                           |
| -------------------------- | ------------------------------------------------------------------------ | -------------------------------------------------------------------------------- |
| Destino retorna 5xx        | Página HTML "Não foi possível concluir sua solicitação", status original | **Resposta original do destino é repassada** (sem alteração)                     |
| Falha de comunicação (502) | Página HTML com botão "Tentar novamente"                                 | JSON `{"error":"O serviço está temporariamente indisponível. Tente novamente."}` |
| Timeout (504)              | Página HTML                                                              | JSON `{"error":"O serviço demorou para responder. Tente novamente."}`            |

As respostas de erro geradas pelo proxy têm `Cache-Control: no-store`. **[Arquivo]** Testado: 502 com e sem `Accept: text/html` e recuperação após reiniciar o destino; 500 repassado em JSON e como HTML; 504 por timeout (≈10,03 s) com um destino que nunca responde; **[Testado]**. O 504 dentro do Compose **[A testar]**.

## Rotas de teste temporárias

Rotas e páginas que existem **apenas para testar o proxy**. Foram mantidas deliberadamente; **não as remova nesta etapa** (a decisão sobre elas é do projeto). **[Intenção]**

Os caminhos no disco ficam em `apps/web/src/app/`; a URL pública acrescenta o `basePath` `/web`.

| Arquivo                                                  | URL via proxy                       | Comportamento **[Arquivo]**                                                                         | Verificado          |
| -------------------------------------------------------- | ----------------------------------- | --------------------------------------------------------------------------------------------------- | ------------------- |
| `apps/web/src/app/proxy-test-error/route.ts`             | `/web/proxy-test-error`             | `GET` → HTTP 500, JSON `{"error":"Erro 500 simulado para teste do proxy"}`                          | **[Testado]**       |
| `apps/web/src/app/proxy-redirect-test/route.ts`          | `/web/proxy-redirect-test`          | `GET` → 302 para `<PROXY_PUBLIC_ORIGIN>/web/proxy-redirect-target` (padrão `http://localhost:3002`) | **[Testado]**       |
| `apps/web/src/app/proxy-redirect-target/route.ts`        | `/web/proxy-redirect-target`        | `GET` → 200, JSON `{"message":"Destino do redirecionamento alcançado"}`                             | **[Testado]**       |
| `apps/web/src/app/proxy-external-redirect-test/route.ts` | `/web/proxy-external-redirect-test` | `GET` → 302 para `https://example.com`                                                              | **[Testado]**       |
| `apps/web/src/app/proxy-test/page.tsx`                   | `/web/proxy-test`                   | Página "Proxy test" com links para `/` (Web) e `/admin`                                             | **[Testado]** (200) |
| `apps/admin/src/app/proxy-test/page.tsx`                 | `/admin/proxy-test`                 | Página "Proxy test" com links para `/` (Admin) e `/web`                                             | **[Testado]** (200) |

As páginas `proxy-test` não constam no resumo do `context/project-context.md`, mas existem nos arquivos e também são de teste. **[Arquivo]**

### Como testar

Pré-requisito: proxy, `web` e `admin` rodando (`pnpm dev` ou Compose); executar de qualquer diretório.

```bash
# 500 do destino, repassado (JSON)
curl -i http://localhost:3002/web/proxy-test-error
# 500 do destino em navegação HTML → página amigável
curl -i -H 'Accept: text/html' http://localhost:3002/web/proxy-test-error

# redirect "interno" e seu destino
curl -i http://localhost:3002/web/proxy-redirect-test        # 302, Location: http://localhost:3002/web/proxy-redirect-target
curl -i http://localhost:3002/web/proxy-redirect-target      # 200 JSON

# redirect externo preservado
curl -i http://localhost:3002/web/proxy-external-redirect-test   # 302, Location: https://example.com/

# páginas profundas
curl -s -o /dev/null -w '%{http_code}\n' http://localhost:3002/web/proxy-test
curl -s -o /dev/null -w '%{http_code}\n' http://localhost:3002/admin/proxy-test
```

Para o teste de indisponibilidade (502 e recuperação) veja [docker-compose.md](docker-compose.md#indisponibilidade-de-um-serviço-e-recuperação).

### Limitação importante do teste de redirect interno **[Testado] / [Inferência]**

- `proxy-redirect-test` usa `process.env.PROXY_PUBLIC_ORIGIN` **dentro da app `web`**, mas o `web` **não recebe** essa variável no Compose nem nos `docker run` documentados (só o proxy recebe). Além disso, `pnpm build` marca a rota como **estática** (`○`), então o `Location` é gerado no build, com o padrão `http://localhost:3002`. **[Arquivo]** **[Testado]** (saída do build)
- Consequência: em Docker/Compose, o `Location` emitido pela `web` já é a origem pública do proxy, que **difere** da origem interna do `web`; logo, o proxy o deixa **inalterado**. O teste passa sem exercitar a ramificação "reescrever origem interna → pública". **[Inferência]** a partir do código e das respostas observadas.
- A ramificação de reescrita foi exercitada, **[Testado]**, em desenvolvimento local executando o `web` com a variável apontando para a própria origem do `web`: `PROXY_PUBLIC_ORIGIN=http://localhost:3000 pnpm --filter web dev` (com o proxy em `pnpm --filter proxy dev`). Resultado: direto no `web`, `Location: http://localhost:3000/web/proxy-redirect-target`; via proxy, `Location: http://localhost:3002/web/proxy-redirect-target`.
- Se for importante cobrir essa ramificação em Docker/Compose, é **[Pendente]** decidir como (não alterado nesta etapa).

## Proteção opcional de rotas

`apps/proxy/proxy.example.ts` é um exemplo comentado que bloquearia `/admin/internal` com 403 usando a convenção `proxy.ts`/`proxy()` do Next.js 16. Está inativo (não se chama `proxy.ts`, e todo o código está comentado) e o próprio texto avisa que não substitui autenticação. **[Arquivo]**

## Limites conhecidos **[Arquivo] / [Inferência]**

- Sem autenticação, autorização, rate limit, cache nem retentativas.
- `upgrade` é removido dos cabeçalhos; **[Inferência]** conexões WebSocket não são suportadas pelo proxy atual (não testado).
- Não adiciona `X-Forwarded-For/Host/Proto`; as apps de destino não conhecem o host original.
- O `next dev` do `web` e do `admin` com HMR via proxy **[A testar]**.
- Assets estáticos atrás do proxy: `/web/next.svg` → 200 e a página `/web` renderiza o texto de `@frontend/api` no Compose. **[Testado]**
