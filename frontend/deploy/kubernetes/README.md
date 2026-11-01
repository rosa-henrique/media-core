# Manifests Kubernetes

Manifests dos serviços `web`, `admin` e `proxy`, no namespace atual (`default`, pois nenhum manifesto define `namespace`).

## Visão geral

```text
Navegador → NGINX Ingress Controller → Service proxy (3002) → Service web (3000)
                                                            → Service admin (3001)
```

| Componente                            | Responsabilidade                                                                                                                                                                            |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **NGINX Ingress Controller**          | Recebe as requisições externas e as encaminha ao Proxy, conforme as regras do `ingress.yaml`. É um pré-requisito (`ingressClassName: nginx`); sua instalação não faz parte deste diretório. |
| **Proxy** (`proxy`)                   | Ponto de entrada das aplicações: encaminha `/web` para o Web e `/admin` para o Admin.                                                                                                       |
| **Web** (`web`) e **Admin** (`admin`) | Aplicações internas. Services `ClusterIP`, sem exposição direta; só são acessados pelo Proxy.                                                                                               |

## Arquivos

| Arquivo          | O que define                                                                                                                                                                                                                                 |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `configmap.yaml` | ConfigMap `media-core-proxy-config` com `PROXY_PUBLIC_ORIGIN`, `WEB_ORIGIN` e `ADMIN_ORIGIN`. Os dois últimos apontam para os Services internos (`http://web.default.svc.cluster.local:3000` e `http://admin.default.svc.cluster.local:3001`). |
| `web.yaml`       | Deployment `web` + Service `web` (`ClusterIP`, porta 3000).                                                                                                                                                                                  |
| `admin.yaml`     | Deployment `admin` + Service `admin` (`ClusterIP`, porta 3001).                                                                                                                                                                              |
| `proxy.yaml`     | Deployment `proxy` + Service `proxy` (`ClusterIP`, porta 3002). Carrega o ConfigMap via `envFrom`.                                                                                                                                           |
| `ingress.yaml`   | Três Ingresses (host `localhost`, classe `nginx`), todos com destino ao Service `proxy:3002`.                                                                                                                                                |

**Deployments** (`web`, `admin`, `proxy`): 1 réplica; imagens `media-core-web:local`, `media-core-admin:local` e `media-core-proxy:local` com `imagePullPolicy: Never` (as imagens precisam existir no runtime do cluster); variáveis `NODE_ENV=production`, `PORT` e `HOSTNAME=0.0.0.0`; Services selecionam os Pods pelo label `app: <nome>`.

**Probes** (readiness e liveness, `httpGet`): `web` em `/web`, `admin` em `/admin` e `proxy` em `/`.

**Ingresses** (`ingress.yaml`):

| Ingress                 | Caminho                         | Comportamento                                                                                                                   |
| ----------------------- | ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `media-core`              | `/backoffice(/\|$)(.*)` (regex) | Reescreve para `/$2` antes de enviar ao Proxy: `/backoffice` → `/`, `/backoffice/web` → `/web`, `/backoffice/admin` → `/admin`. |
| `media-core-assets`       | `/web` e `/admin` (`Prefix`)    | Enviados ao Proxy **sem reescrita**.                                                                                            |
| `media-core-proxy-assets` | `/_next` (`Prefix`)             | Enviado ao Proxy sem reescrita.                                                                                                 |

**Atenção:** `PROXY_PUBLIC_ORIGIN` está definido como `http://localhost:30082`. O Proxy usa esse valor para reescrever redirects; ele deve corresponder ao endereço que o navegador usa para chegar ao Proxy.

## Aplicar os manifests

Na raiz do repositório:

```bash
kubectl apply -f deploy/kubernetes/
```

Verificar:

```bash
kubectl get pods                 # esperado: web, admin e proxy em 1/1 Running
kubectl get deployments
kubectl get services
kubectl get ingress
kubectl logs deployment/proxy    # logs de um componente (troque proxy por web ou admin)
```

Se um Pod ficar em `ErrImageNeverPull`, a imagem local não está disponível no runtime do cluster (`imagePullPolicy: Never`). Os scripts abaixo automatizam estes passos.

## Scripts

Execute a partir de qualquer diretório. Os arquivos não têm permissão de execução, então use `bash` na frente.

| Script             | Para que serve                                                                                            |
| ------------------ | --------------------------------------------------------------------------------------------------------- |
| `apply.sh`         | Aplica todos os manifests de `deploy/kubernetes/` e lista Deployments, Pods, Services e Ingress.          |
| `deploy-images.sh` | Constrói a imagem Docker local, carrega no cluster Kind e reinicia o Deployment, aguardando ficar pronto. |

### `apply.sh`

```bash
bash deploy/kubernetes/apply.sh
```

Use na primeira vez e sempre que alterar um manifesto.

### `deploy-images.sh`

Recebe um argumento: `web`, `admin`, `proxy` ou `all`.

```bash
bash deploy/kubernetes/deploy-images.sh web     # só o web
bash deploy/kubernetes/deploy-images.sh proxy   # só o proxy
bash deploy/kubernetes/deploy-images.sh all     # web, admin e proxy
```

Para cada app, o script faz `docker build` de `media-core-<app>:local`, `kind load docker-image` e `rollout restart` + `rollout status` (espera até 180 s). Use sempre que o código de uma app mudar. As novas tags ainda precisam de validação prática.

### Fluxo do dia a dia

```bash
# primeira vez (ou após recriar o cluster)
bash deploy/kubernetes/apply.sh                 # cria os recursos (Pods aguardam as imagens)
bash deploy/kubernetes/deploy-images.sh all     # envia as imagens e reinicia

# depois de mudar o código do web
bash deploy/kubernetes/deploy-images.sh web

# depois de mudar um manifesto
bash deploy/kubernetes/apply.sh
```

O `deploy-images.sh` reinicia Deployments já existentes; por isso, rode o `apply.sh` antes dele na primeira vez.

### Requisitos e configuração

- `apply.sh`: `kubectl` e acesso ao cluster.
- `deploy-images.sh`: `docker`, `kind`, `kubectl` e um cluster Kind existente.
- Valores padrão, alteráveis por variável de ambiente:

| Variável            | Padrão                                                                       | Usada em           |
| ------------------- | ---------------------------------------------------------------------------- | ------------------ |
| `KUBE_CONTEXT`      | `kind-desktop` (`apply.sh`); `kind-<KIND_CLUSTER_NAME>` (`deploy-images.sh`) | ambos              |
| `KUBE_NAMESPACE`    | `default`                                                                    | ambos              |
| `KIND_CLUSTER_NAME` | `desktop`                                                                    | `deploy-images.sh` |

```bash
KIND_CLUSTER_NAME=meu-cluster bash deploy/kubernetes/deploy-images.sh all
```

Se aparecer `Kubernetes context '...' is unavailable` ou `Kind cluster '...' was not found`, confira o nome do contexto/cluster e ajuste essas variáveis.

## Acesso pelo Ingress

Com o NGINX Ingress Controller ativo e acessível em `localhost`, as requisições chegam ao Proxy, que é o ponto de entrada das aplicações e as repassa ao Web e ao Admin. Pelos caminhos configurados:

| URL                                              | Chega ao Proxy como | Resultado                  |
| ------------------------------------------------ | ------------------- | -------------------------- |
| `http://localhost/backoffice`                    | `/`                 | Página do Proxy            |
| `http://localhost/backoffice/web`                | `/web`              | Web                        |
| `http://localhost/backoffice/admin`              | `/admin`            | Admin                      |
| `http://localhost/web`, `http://localhost/admin` | `/web`, `/admin`    | Web, Admin (sem reescrita) |
| `http://localhost/_next/...`                     | `/_next/...`        | Encaminhado ao Proxy       |

A porta de `localhost` depende de como o controller está exposto (fora do escopo destes manifests).

## Acesso alternativo sem Ingress (port-forward)

```bash
kubectl port-forward service/proxy 3002:3002
```

Com o comando ativo, a aplicação fica disponível em `http://localhost:3002` (`/`, `/web` e `/admin`). Essa alternativa dispensa o Ingress, mas exige que os Pods e os Services estejam funcionando (`kubectl get pods`). O acesso dura enquanto o comando estiver em execução (`Ctrl+C` encerra).

Referência oficial: [Use Port Forwarding to Access Applications in a Cluster](https://kubernetes.io/docs/tasks/access-application-cluster/port-forward-access-application-cluster/).
