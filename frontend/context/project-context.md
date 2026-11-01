# Contexto do projeto — para o agente de documentação

Este arquivo resume a intenção e o histórico conhecido. Ele não substitui a inspeção dos arquivos atuais do repositório.

## Ideia e organização desejada
- Media Core: plataforma de gerenciamento e administração de conteúdos multimídia, com foco principal no painel administrativo. A intenção é que Admin gerencie conteúdos, usuários, acessos e configurações; Web ofereça autenticação, navegação e consumo de conteúdos.
- Objetivo organizacional: manter aplicações independentes e bibliotecas internas compartilhadas num único repositório, com dependências e comandos de desenvolvimento coordenados.
- `apps/web` e `apps/admin` devem ser duas aplicações Next.js distintas, cada uma com build e execução próprios; não são uma aplicação única dividida apenas por rotas.
- `apps/proxy` encaminha tráfego para as aplicações, para que possam ser acessadas por caminhos públicos como `/web` e `/admin` quando o proxy está ativo.
- `packages/*` abriga bibliotecas compartilhadas internas; não se deseja publicá-las no npm. A intenção é usar imports públicos como `@frontend/ui` e `@frontend/api`, não imports profundos.
- pnpm é o gerenciador de pacotes; Turborepo é usado para orquestrar tarefas do monorepo. Lerna foi discutido anteriormente, mas foi **descartado por decisão oficial**: o projeto usa apenas pnpm + Turborepo, e o Lerna não será utilizado. Não é necessário verificar nem configurar Lerna.
- A UI compartilhada foi planejada com MUI, tema, tokens, paleta, tipografia, componentes e layouts. Verifique quanto disso existe de fato.
- Deploy futuro deve poder atender as aplicações por proxy. A estratégia definitiva de deploy ainda não foi fechada.
- O usuário quer documentação que permita entender a intenção, a razão das escolhas, a função dos arquivos e como criar/reproduzir uma base semelhante em outro projeto.

## Estado conhecido da base
- Node `26.12.1`, pnpm `12.15.0` (validar).
- Next.js `16.4.3`, React `19.3.0` (validar).
- `apps/web`: porta `3000`, `basePath: "/web"`.
- `apps/admin`: porta `3001`, `basePath: "/admin"`.
- `apps/proxy`: porta `3002`.
- Imagens locais atuais: `media-core-web:local`, `media-core-admin:local`, `media-core-proxy:local` (ainda precisam de validação após a renomeação).
- Docker Compose usa nome de projeto `media-core`, serviços web/admin/proxy e rede `frontend-network`; nomes de variáveis conhecidos: `PROXY_PUBLIC_ORIGIN`, `WEB_ORIGIN`, `ADMIN_ORIGIN`. Nunca publicar valores do `.env`.

## Histórico Docker / Compose
- As três imagens Docker foram construídas.
- O Docker Compose foi iniciado e os serviços foram testados.
- Foi testado o comportamento do proxy quando `web` estava parado; o proxy retornou erro controlado e recuperou após o serviço ser iniciado novamente.
- O agente deve confirmar Dockerfiles, comandos, env vars, health checks e comportamento no código atual.

## Histórico Kubernetes
- Contexto `docker-desktop`.
- Configurações do Docker Desktop indicaram provisionamento Kind e versão `1.36.1`; `kubectl get nodes` mostrou nó `desktop-control-plane`, Kubernetes `v1.34.3`, runtime `containerd://2.2.0`.
- `kind` não está instalado no shell, mas `docker exec desktop-control-plane ...` funcionou.
- Manifests conhecidos: `deploy/kubernetes/configmap.yaml`, `web.yaml`, `admin.yaml`, `proxy.yaml`.
- `web` e `admin` usam Services ClusterIP; `proxy` usa NodePort `3002:30082`.
- As imagens então chamadas `frontend-web:local`, `frontend-admin:local` e `frontend-proxy:local` não estavam disponíveis no containerd do nó e os Pods ficaram `ErrImageNeverPull` devido a `imagePullPolicy: Never`.
- Imagens carregadas manualmente com `docker save`, `docker exec -i ... cat > TAR` e `ctr -n k8s.io images import`.
- Depois, Deployments e Pods ficaram prontos (`1/1`).
- `kubectl get endpoints proxy` mostrou `10.244.0.7:3002`.
- `curl` dentro do nó para `127.0.0.1:30082` retornou HTTP 200.
- O host não conseguiu alcançar `172.19.0.4:30082` (timeout) e o navegador não conseguiu abrir `localhost:30082`.
- `kubectl port-forward service/proxy 3002:3002` funcionou para `/`, `/web` e `/admin`, mas o acesso termina ao encerrar o processo.
- Não corrigir o NodePort nesta tarefa. Não criar scripts de deploy nesta tarefa.

## Rotas de teste temporárias a preservar
Foram mantidas temporariamente rotas para testar comportamento do proxy:
- `proxy-test-error/route.ts`
- `proxy-redirect-test/route.ts`
- `proxy-redirect-target/route.ts`
- `proxy-external-redirect-test/route.ts`
Localize os caminhos exatos e documente; não as remova.

## Ordem de trabalho
1. Primeiro documentar a ideia/arquitetura do monorepo e tudo configurado/testado até aqui, com as pendências explicitadas.
2. Em etapa futura, discutir e resolver acesso persistente ao Kubernetes sem `port-forward`.
3. Em etapa futura, projetar e implementar automação de implantação Kubernetes.
