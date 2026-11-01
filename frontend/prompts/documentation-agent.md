# Prompt para o agente local — documentar a ideia, arquitetura e configuração atual do Media Core

Você está no repositório local do projeto Media Core. O objetivo desta tarefa é produzir documentação fiel e útil sobre **a ideia do projeto, por que a estrutura de monorepo foi escolhida, como as aplicações e bibliotecas se relacionam e tudo o que foi configurado até agora em desenvolvimento local, Docker, Docker Compose e Kubernetes**.

Esta etapa é **somente documentação**. Não implemente agora a correção do NodePort e não crie automações de implantação. Essas serão etapas posteriores, conduzidas separadamente pelo usuário.

## Regras obrigatórias

1. Inspecione os arquivos reais do repositório antes de escrever. O conteúdo em `context/` é contexto de conversas anteriores e precisa ser confrontado com o estado atual.
2. Não invente funcionalidades, motivos, comandos executados, resultados de teste nem decisões. Separe explicitamente:
   - **Confirmado por arquivos**;
   - **Confirmado por teste/execução**;
   - **Intenção/decisão informada pelo usuário**;
   - **Inferência**;
   - **Pendente de validação/decisão**.
3. Não modifique código de aplicação, dependências, Dockerfiles, Compose, manifests, scripts operacionais ou configurações. Nesta tarefa, crie/atualize apenas documentação.
4. Não apague nem renomeie arquivos. Preserve rotas de teste existentes, inclusive as rotas temporárias do proxy.
5. Escreva em português brasileiro, mantendo nomes técnicos e comandos originais.
6. Não divulgue segredos. Não copie valores do `.env`; documente apenas nomes de variáveis, finalidade e de onde são carregadas. Se houver credenciais versionadas, reporte o caminho e o risco sem reproduzir o valor.
7. Não use a existência de uma configuração como prova de que ela é necessária. Explique o comportamento observado e diferencie fato de justificativa.
8. Não execute comandos destrutivos, não recrie cluster/containers, não faça deploy e não tente corrigir o NodePort nesta etapa.
9. Não assuma que o estado de Kubernetes está sempre rodando. Documente os comandos para inspecionar e reproduzir, mas deixe claro o que foi testado no histórico e o que não foi executado nesta sessão.
10. Antes de terminar, verifique todos os caminhos citados, links relativos, nomes de scripts e comandos. Faça um resumo de todos os arquivos de documentação criados/alterados e das lacunas restantes.

## Contexto de intenção do projeto — confirme e documente com cuidado

A intenção do projeto é construir o Media Core, uma plataforma de gerenciamento e administração de conteúdos multimídia com foco principal no painel administrativo. Admin deve gerir conteúdos, usuários, acessos e configurações; Web deve oferecer autenticação, navegação e consumo de conteúdos. A base atual usa TypeScript e Next.js, organizada como monorepo, com aplicações separadas que compartilham bibliotecas internas sem publicá-las no npm. Diferencie esses objetivos do que já está implementado.

Intenções e decisões conhecidas das conversas anteriores, a validar com o repositório:
- `apps/web` e `apps/admin` são aplicações Next.js distintas, com builds e execução próprios; não são uma única aplicação com rotas `/web` e `/admin`. O proxy as encaminha por caminhos públicos, permitindo uma experiência integrada quando executadas atrás dele.
- `apps/proxy` é uma aplicação separada para encaminhar tráfego para `web` e `admin`.
- `packages/*` contém bibliotecas internas compartilhadas. O objetivo é importar APIs públicas, por exemplo `@frontend/ui` e `@frontend/api`, evitando imports profundos como `@frontend/ui/lib/button`.
- TypeScript é usado no projeto; pnpm é o gerenciador de pacotes; Turborepo orquestra tarefas do monorepo. Lerna foi discutido anteriormente, mas foi **descartado por decisão oficial** e não será utilizado neste projeto: documente pnpm + Turborepo como a combinação adotada e registre o Lerna apenas como alternativa descartada (histórico), sem tratá-lo como decisão em aberto.
- A biblioteca de UI foi planejada para compartilhar MUI, tema/tokens/paleta/tipografia, componentes e layouts. Verifique o que já está implementado e o que ainda é plano.
- Não se pretende publicar as bibliotecas internas no npm.
- A configuração deve facilitar execução local e opções futuras de deploy. A estratégia definitiva de deploy e o acesso persistente ao proxy no Kubernetes ainda não estão totalmente fechados.
- A autenticação/autorização não estava decidida e o plano inicial era começar sem ela; documente somente o que os arquivos atuais comprovarem.
- O objetivo é que um novo desenvolvedor (ou o próprio usuário ao iniciar outro projeto) entenda a ideia, as escolhas, os motivos conhecidos, os comandos e como reconstruir a base.

## Inventário a fazer

Inspecione, quando existirem:
- `README.md`, documentação atual, `.gitignore`, `.dockerignore`, `.env.example`;
- `package.json`, `pnpm-workspace.yaml`, `pnpm-lock.yaml`, `turbo.json`;
- `apps/*/package.json`, configs Next.js/TypeScript, scripts, rotas e arquivos públicos;
- `packages/*`, seus manifests, `exports`, `main`, `types`, dependências e estrutura `src`/`lib`;
- Dockerfiles, `compose.yaml` ou `docker-compose.yml`, arquivos de configuração do proxy e health checks;
- manifests `deploy/kubernetes/*`;
- scripts e pipelines existentes.
Não percorra de forma indiscriminada `node_modules`, `.next`, caches e artefatos de build. Não leia valores secretos do `.env` para copiá-los à documentação.

## Documentos que devem ser criados/atualizados

Adapte os nomes se a estrutura existente já tiver documentação equivalente. Evite duplicar conteúdo.

1. `README.md`
   - o que é o projeto e qual problema organizacional resolve;
   - visão de alto nível das aplicações e bibliotecas;
   - pré-requisitos e comandos principais;
   - links para os documentos abaixo;
   - status atual e pendências mais relevantes.

2. `docs/project-goals.md`
   - intenção e princípios do projeto;
   - por que monorepo faz sentido neste projeto, com benefícios esperados e custos/limitações;
   - por que apps separados e bibliotecas compartilhadas;
   - decisões confirmadas versus intenções que ainda não viraram implementação;
   - não apresentar justificativas inferidas como se fossem falas confirmadas do usuário.

3. `docs/architecture.md`
   - estrutura de diretórios;
   - papel de cada app (`web`, `admin`, `proxy`) e de cada pacote;
   - dependências entre apps e libs;
   - fluxo de uma requisição através do proxy;
   - diagrama Mermaid, se refletir o código real;
   - explique o papel de `basePath`, portas, `transpilePackages`, output standalone e tracing root apenas se estiverem presentes nos arquivos atuais.

4. `docs/file-map.md`
   - mapa dos arquivos de configuração e sua finalidade;
   - explicar por que cada arquivo existe, separando motivo conhecido de finalidade técnica inferida;
   - não listar artefatos gerados sem utilidade.

5. `docs/local-development.md`
   - versões e pré-requisitos encontrados;
   - instalação de dependências;
   - scripts reais para dev/build/start/lint/typecheck, sem inventar scripts;
   - como trabalhar numa app e numa biblioteca compartilhada.

6. `docs/docker.md`
   - Dockerfiles, build context, dependências e estratégia de build;
   - imagens locais e tags;
   - `.dockerignore`;
   - Compose, rede, variáveis e health checks;
   - comandos para build/up/down/logs/status;
   - resultados observados e troubleshooting.

7. `docs/proxy.md`
   - regras reais de roteamento;
   - destinos internos e variáveis de ambiente;
   - timeouts, tratamento de 5xx/indisponibilidade, redirects e erros JSON conforme código;
   - rotas de teste presentes e como testá-las;
   - não remover nem recomendar remover as rotas de teste temporárias.

8. `docs/kubernetes.md`
   - explicar ConfigMap, Deployments, Services, seletores, portas, probes, `imagePullPolicy` e NodePort;
   - como aplicar manifests e consultar Pods/Deployments/Services/logs/EndpointSlices;
   - como as imagens foram importadas para o containerd no Docker Desktop;
   - como usar `kubectl port-forward`, que é o método de acesso local confirmado;
   - declarar que o acesso direto do host a `localhost:30082` ainda não funciona no estado testado.

9. `docs/decisions.md`
   - decisões confirmadas e alternativas consideradas quando houver evidência;
   - para cada decisão, registrar estado (confirmada, provisória, pendente), evidência e motivo conhecido;
   - se o motivo não estiver explícito, escrever “motivação não confirmada” e não inventar.

10. `docs/troubleshooting.md`
   - sintomas, diagnóstico, causa confirmada/provável, solução ou estado pendente;
   - incluir `ErrImageNeverPull`, diferença entre imagens do Docker e do containerd, NodePort inacessível do host e uso de port-forward;
   - distinguir erros que foram corrigidos de problemas ainda abertos.

11. `docs/status-and-next-steps.md`
   - o que está funcionando e foi testado;
   - o que ainda está pendente;
   - explicitamente adiar a correção definitiva do NodePort e a automação de Kubernetes para uma próxima etapa, sem executá-las agora.

## Histórico de execução conhecido — valide antes de afirmar

- Imagens locais atuais: `media-core-web:local`, `media-core-admin:local`, `media-core-proxy:local` (nomes ainda não validados por execução após a renomeação).
- Docker Compose foi testado anteriormente; os serviços web/admin/proxy iniciaram e health checks foram verificados. Foi testada a indisponibilidade do serviço web e a resposta controlada do proxy, seguida da recuperação após reinício.
- Kubernetes usa contexto `docker-desktop`. A tela de configurações do Docker Desktop indicou provisionamento Kind e versão exibida `1.36.1`; o nó listado por `kubectl` foi `desktop-control-plane`, com runtime `containerd://2.2.0`. O `kubectl get nodes` exibiu versão de nó `v1.34.3`. Registre essas versões exatamente e explique que a versão exibida na tela e a versão do nó são dados distintos; não tente reconciliá-las sem evidência.
- `kind` não estava instalado no terminal. Mesmo assim, `docker exec desktop-control-plane ...` funcionou para acessar o contêiner do nó.
- Os manifestos foram aplicados anteriormente: ConfigMap `frontend-proxy-config`, Deployments e Services `web`, `admin`, `proxy`. O ConfigMap atual chama-se `media-core-proxy-config`.
- Os Pods ficaram em `ErrImageNeverPull` porque as imagens locais do Docker não estavam presentes no containerd do nó com `imagePullPolicy: Never`.
- Para cada imagem, o procedimento funcionou com as tags antigas `frontend-<app>:local`; as novas tags `media-core-<app>:local` ainda precisam ser validadas:
  1. `docker save frontend-web:local -o /tmp/frontend-web.tar` (equivalente para admin/proxy);
  2. `docker exec -i desktop-control-plane sh -c 'cat > /tmp/frontend-web.tar' < /tmp/frontend-web.tar`;
  3. `docker exec desktop-control-plane ctr -n k8s.io images import /tmp/frontend-web.tar`.
- Depois da importação, os três Deployments ficaram `1/1 AVAILABLE`, os Pods `1/1 Running`.
- `kubectl get endpoints proxy` mostrou `10.244.0.7:3002`; a API Endpoints está depreciada em Kubernetes 1.33+, preferir EndpointSlices na documentação atual.
- Dentro do nó, `curl` para `http://127.0.0.1:30082/` retornou `200`.
- Do host, `curl -v --connect-timeout 3 http://172.19.0.4:30082/` deu timeout.
- O navegador não acessou `http://localhost:30082/`, `/web` nem `/admin`.
- `kubectl port-forward service/proxy 3002:3002` funcionou; com ele ativo, `http://localhost:3002/`, `/web` e `/admin` foram acessíveis. O túnel para quando o processo termina.
- Pendências: método persistente para acesso direto ao proxy a partir do host sem port-forward; automação de Kubernetes ainda será tratada numa etapa posterior.

## Estrutura recomendada de escrita

Use linguagem prática, com exemplos concretos, tabelas quando ajudarem e diagramas quando trouxerem clareza. Evite repetir a mesma explicação em todos os documentos: o README resume e aponta para os guias; cada guia aprofunda seu tema.

Ao final, apresente:
- arquivos criados/alterados;
- pontos validados em arquivos;
- pontos sustentados pelo histórico de testes;
- pontos inferidos;
- decisões/perguntas pendentes;
- confirmação de que não alterou código operacional nem automatizou/recriou o Kubernetes.
