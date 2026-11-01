# Docker Compose

Legenda das marcas: [README](../README.md#legenda-de-evidências). Imagens e Dockerfiles: [docker.md](docker.md). Comportamento do proxy: [proxy.md](proxy.md).

Pré-requisitos: Docker com Compose v2 (testado anteriormente: Compose `5.6.1`), portas `3002` livre no host, arquivo `.env` na raiz (ver abaixo). Todos os comandos partem da **raiz do repositório**, onde está o `compose.yaml`. O nome `media-core` e as tags atuais foram adicionados na renomeação e ainda não foram validados executando o Compose.

## O que o `compose.yaml` define **[Arquivo]**

| Serviço | Imagem                 | Build (contexto / Dockerfile) | Porta                            | Health check (dentro do contêiner)                             | Depende de                    |
| ------- | ---------------------- | ----------------------------- | -------------------------------- | -------------------------------------------------------------- | ----------------------------- |
| `web`   | `media-core-web:local`   | `.` / `apps/web/Dockerfile`   | `expose: 3000` (só rede interna) | `fetch('http://127.0.0.1:3000/web')` — status < 500 = saudável | —                             |
| `admin` | `media-core-admin:local` | `.` / `apps/admin/Dockerfile` | `expose: 3001` (só rede interna) | `fetch('http://127.0.0.1:3001/admin')`                         | —                             |
| `proxy` | `media-core-proxy:local` | `.` / `apps/proxy/Dockerfile` | `ports: 3002:3002` (host)        | `fetch('http://127.0.0.1:3002')`                               | `web` e `admin` **saudáveis** |

- Todos: `restart: unless-stopped`, rede `frontend-network` (driver `bridge`), health check com `interval: 15s`, `timeout: 5s`, `retries: 3`, `start_period: 20s`.
- O health check usa `node -e` com `fetch` (a imagem tem Node; não depende de `curl`). Uma resposta HTTP abaixo de 500 (inclusive 404) conta como saudável; falha de conexão ou 5xx, não.
- `proxy` recebe `environment`: `NODE_ENV=production`, `PORT=3002`, `HOSTNAME=0.0.0.0`, `PROXY_PUBLIC_ORIGIN`, `WEB_ORIGIN`, `ADMIN_ORIGIN` (as três últimas vindas de `${...}`).
- `web` e `admin` **só** são acessíveis dentro da rede do Compose; do host, `curl http://localhost:3000/web` falha (conexão recusada). **[Testado]**

## Rede interna e nomes **[Testado antes da renomeação]**

- O `compose.yaml` define o nome do projeto como `media-core`; assim, os contêineres gerados usam prefixos como `media-core-web-1` e a rede é `media-core_frontend-network`. **[Arquivo]** Antes da renomeação, os testes registraram `front-web-1`, `front-admin-1`, `front-proxy-1` e `front_frontend-network`; os novos nomes ainda precisam de validação prática.
- Dentro da rede, cada serviço é resolvido pelo **nome do serviço**: `http://web:3000`, `http://admin:3001`. Por isso o `.env.example` usa `WEB_ORIGIN=http://web:3000` e `ADMIN_ORIGIN=http://admin:3001`. Prova histórica: `docker compose exec -T proxy node -e "fetch('http://web:3000/web').then(r=>console.log(r.status))"` → `200`; o nome do projeto Compose ainda não foi validado em execução após a renomeação.
- Só `proxy` publica porta no host. `PROXY_PUBLIC_ORIGIN` deve ser o endereço **que o navegador usa** para chegar ao proxy (no modelo: `http://localhost:3002`), não o endereço interno.

## Variáveis de ambiente

1. `cp .env.example .env` **[A testar]** (não executado para não sobrescrever o `.env` existente; em uma máquina nova é o primeiro passo). O modelo foi validado com `docker compose --env-file <cópia> config --quiet`. **[Testado]**
2. O Compose lê `.env` da raiz automaticamente e substitui `${PROXY_PUBLIC_ORIGIN}`, `${WEB_ORIGIN}`, `${ADMIN_ORIGIN}`. **[Arquivo]** Uma variável exportada no shell vence o `.env`; variável ausente gera o aviso `variable is not set. Defaulting to a blank string.` e vira string vazia; o `compose.yaml` não usa `env_file:`, então só essas três chegam ao proxy. **[Testado]** Este arquivo `.env` é do **Compose**: o desenvolvimento local usa `apps/proxy/.env.local`, com `localhost`. Detalhes em [environment.md](environment.md).
3. Valide a sintaxe sem subir nada: `docker compose config --quiet` — sem saída e código 0 quando válido. **[Testado]** Evite `docker compose config` sem `--quiet` em logs compartilhados: imprime os valores resolvidos.
4. Listar serviços: `docker compose config --services` → `admin`, `web`, `proxy`. **[Testado]**
5. Conferir só os **nomes** que o proxy recebeu (sem mostrar valores): `docker compose exec -T proxy printenv | sed -E 's/=.*/=<valor>/'`. **[Testado]**

Alterou o `.env`? Aplique com `docker compose up -d proxy`. **[Testado]** com uma variável sobrescrita no shell (`PROXY_PUBLIC_ORIGIN=... docker compose up -d proxy`, depois sem ela): nas duas execuções o Compose reiniciou o contêiner do proxy (saída `Starting`/`Started`) e o serviço voltou a `healthy`, `/web` → 200.

## Subir e encerrar

```bash
docker compose up -d --build     # constrói (com cache) e sobe tudo em segundo plano   [Testado]
docker compose up -d             # usa as imagens locais já existentes                  [Testado]
docker compose ps                # estado; STATUS deve mostrar (healthy)                 [Testado]
docker compose down              # para e remove contêineres e a rede; mantém imagens  [Testado]
```

Resultado esperado de `up -d` **[Testado]**: `web` e `admin` iniciam, ficam `Healthy`, só então o `proxy` inicia. Após ~30 s, `docker compose ps` mostra os três como `Up ... (healthy)` e o proxy com `0.0.0.0:3002->3002/tcp`.

`docker compose down -v` também removeria volumes, mas o `compose.yaml` não define nenhum. **[Arquivo]** Para remover também as imagens locais: `docker compose down --rmi local` **[A testar]** (apague as imagens só se quiser reconstruir do zero).

## Operar um serviço

```bash
docker compose stop web                 # [Testado] para só o web
docker compose start web                # [Testado] inicia de novo (demora ~20 s a ficar healthy)
docker compose restart proxy            # [Testado]
docker compose up -d --build web        # [Testado] reconstrói e recria só o web
docker compose up -d --no-deps proxy    # [Testado] sem mudança de configuração é no-op (`Container ... Running`); só reinicia/recria se a configuração ou a imagem mudou
```

- `docker compose up -d --build web` mostrou `Container front-web-1 Recreate/Recreated/Started` antes da renomeação; os outros serviços não foram recriados. **[Histórico]**
- `stop`/`restart` preservam o histórico de logs do contêiner. **[Testado]**

## Logs

```bash
docker compose logs                      # [Testado] todos os serviços
docker compose logs --tail 20            # [Testado]
docker compose logs -f proxy             # [Testado] segue um serviço (Ctrl+C para sair)
docker compose logs --tail 50 web admin  # [Testado] (executado com --tail 1)
docker compose up -d --force-recreate web  # [Testado] recria o contêiner do web mesmo sem mudanças
```

Inicialização normal de cada app: `✓ Ready in ...ms`. Erros de encaminhamento do proxy aparecem como `Erro ao encaminhar requisição pelo proxy:` seguido do erro (por exemplo `hostname: 'web'`). **[Testado]**

## Testar o proxy

Com o ambiente de pé (`docker compose ps` com 3 serviços `healthy`). Os resultados abaixo foram **[Testado]** no Compose, exceto onde indicado.

### Caminhos principais

```bash
curl -s -o /dev/null -w '%{http_code}\n' http://localhost:3002/        # 200  página do próprio proxy
curl -s -o /dev/null -w '%{http_code}\n' http://localhost:3002/web     # 200
curl -s -o /dev/null -w '%{http_code}\n' http://localhost:3002/admin   # 200
curl -s -o /dev/null -w '%{http_code}\n' http://localhost:3002/web/proxy-test   # 200
```

### Erro 500 do destino

```bash
curl -i http://localhost:3002/web/proxy-test-error
# 500, content-type: application/json, {"error":"Erro 500 simulado para teste do proxy"}  (resposta original da web, preservada)

curl -i -H 'Accept: text/html' http://localhost:3002/web/proxy-test-error
# 500 com HTML amigável ("Serviço indisponível"): em navegação HTML o proxy substitui respostas 5xx
```

Status e corpo JSON da primeira forma: **[Testado]** em `pnpm dev` (e o status `500` também no Compose e no `docker run`). A segunda forma (HTML amigável, `content-type: text/html`) foi **[Testado]** em `pnpm dev` e no Compose.

### Redirect interno e externo

```bash
curl -i http://localhost:3002/web/proxy-redirect-test
# 302, Location: http://localhost:3002/web/proxy-redirect-target   (origem reescrita para a pública do proxy)

curl -i http://localhost:3002/web/proxy-external-redirect-test
# 302, Location: https://example.com/    (externo: preservado)
```

> Atenção ao interpretar o redirect interno: o destino `http://localhost:3002` aparece, no teste, mesmo sem `PROXY_PUBLIC_ORIGIN` chegar ao `web` — ver [proxy.md](proxy.md#rotas-de-teste-temporárias) para a explicação.

### Indisponibilidade de um serviço (e recuperação)

```bash
docker compose stop web
curl -s -w ' [%{http_code}]\n' http://localhost:3002/web
# {"error":"O serviço está temporariamente indisponível. Tente novamente."} [502]
curl -s -i -H 'Accept: text/html' http://localhost:3002/web | head -3     # 502, content-type text/html
curl -s -o /dev/null -w '%{http_code}\n' http://localhost:3002/admin      # 200: admin não é afetado
docker compose start web ; sleep 20
curl -s -o /dev/null -w '%{http_code}\n' http://localhost:3002/web        # 200
```

Resultado **[Testado]** exatamente como descrito. O mesmo teste foi feito antes, segundo o **[Histórico]**.

Timeout (HTTP 504, após 10 s sem resposta do destino): **[Testado]** fora do Compose — com `WEB_ORIGIN=http://localhost:4999 pnpm --filter proxy dev` apontando para um servidor local que nunca responde, o proxy devolveu `504` após ≈10,5 s (JSON `{"error":"O serviço demorou para responder. Tente novamente."}`; HTML com `Accept: text/html`) e registrou `TimeoutError` no log. No Compose não há rota de teste que force lentidão; **[A testar]** lá.

## Diagnosticar comunicação entre contêineres

| Verificação                                                                                          | Interpretação                                                                                                                                                                   |
| ---------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `docker compose ps`                                                                                  | Algum serviço `unhealthy`/`Exited`/`starting`? O proxy só sobe após `web` e `admin` healthy.                                                                                    |
| `docker compose logs --tail 50 proxy`                                                                | `Erro ao encaminhar...` indica falha de conexão (nome errado, serviço parado) ou timeout.                                                                                       |
| `docker compose exec -T proxy printenv \| grep -E '^(WEB\|ADMIN)_ORIGIN='`                           | O proxy está usando `http://web:3000` e `http://admin:3001`? (contém só URLs internas; confira antes de compartilhar.)                                                          |
| `docker compose exec -T proxy node -e "fetch('http://web:3000/web').then(r=>console.log(r.status))"` | Testa DNS e porta do destino a partir do proxy. `200` = comunicação OK.                                                                                                         |
| `curl -i http://localhost:3002/web` com e sem `-H 'Accept: text/html'`                               | 502 → proxy não alcança o destino; 504 → destino lento; 404 → caminho fora de `/web`/`/admin` ou app com `basePath` diferente.                                                  |
| `docker network inspect media-core_frontend-network`                                                  | Verifique se os três contêineres estão na rede. Este nome resulta da configuração atual; a verificação de execução ainda precisa ser feita. |

Mais sintomas e causas em [troubleshooting.md](troubleshooting.md#docker-e-compose).
