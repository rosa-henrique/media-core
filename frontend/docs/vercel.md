# Deploy na Vercel

Legenda das marcas: [README](../README.md#legenda-de-evidências). Este documento descreve a configuração do frontend Media Core na Vercel. Os arquivos do projeto são a fonte para a configuração; o estado do Dashboard e os resultados do deploy abaixo são identificados como **[Relato]** quando não podem ser verificados no repositório.

## Arquitetura implantada

As três aplicações Next.js são serviços independentes dentro de um único projeto Vercel. O `proxy` é a única entrada pública; `web` e `admin` recebem tráfego do Proxy por bindings:

| Serviço | `root` em `vercel.json` | Responsabilidade |
| ------- | ---------------------- | ---------------- |
| `proxy` | `apps/proxy` | Entrada pública; encaminha as rotas `/web` e `/admin` às aplicações correspondentes. |
| `web` | `apps/web` | Aplicação frontend. |
| `admin` | `apps/admin` | Painel administrativo. |

O arquivo [vercel.json](../vercel.json) declara os três serviços com `framework: "nextjs"`. O bloco `services` associa nomes aos diretórios e configurações de cada unidade; cada serviço é construído separadamente dentro do projeto. Conforme informado para esta tarefa, os três compartilham o projeto e o domínio público, e os deployments/previews acompanham o ciclo do projeto. **[Relato]**

O `root` de cada serviço é relativo ao próprio `vercel.json`, segundo a [referência oficial de configuração de serviços](https://vercel.com/docs/services/config-reference#root). Como o `vercel.json` está em `frontend/`, os valores corretos são `apps/proxy`, `apps/web` e `apps/admin`. No Dashboard, o Root Directory do projeto é `frontend` — o monorepo do frontend, não a raiz Git. **[Relato]** Mantenha essa correspondência: mover o arquivo ou mudar o Root Directory exige rever os caminhos.

### Roteamento e bindings

O rewrite de nível superior do `vercel.json` associa `/(.*)` ao serviço `proxy`. Portanto, todas as requisições públicas entram pelo Proxy. Web e Admin não têm rewrite público próprio: permanecem sem acesso público direto e são alcançados internamente pelo Proxy. A documentação da Vercel confirma que um serviço só recebe tráfego público quando um rewrite o direciona, e que um binding concede acesso interno sem criar uma rota pública.

No bloco `bindings` do `proxy`, os destinos `admin` e `web` são declarados com `type: "service"` e `format: "url"`. A Vercel gera uma URL para cada destino e a injeta no serviço chamador nas variáveis `ADMIN_ORIGIN` e `WEB_ORIGIN`, respectivamente. Esses valores são próprios do deployment, incluindo previews; não são URLs públicas fixas configuradas manualmente. O código do Proxy lê essas variáveis para encaminhar as requisições.

As responsabilidades não se confundem:

- O rewrite público envia a requisição recebida pela Vercel ao Proxy.
- As rotas do Proxy encaminham `/web/*` e `/admin/*` a Web e Admin usando os bindings.
- Os bindings permitem comunicação servidor-servidor sem tornar Web ou Admin destinos públicos.

## Configurações do projeto no Dashboard

Estado de configuração informado para o projeto. O repositório não contém uma exportação das configurações do Dashboard, portanto não é possível verificá-las diretamente nos arquivos. **[Relato]**

| Configuração | Estado informado |
| ------------ | ---------------- |
| Repositório Git | Conectado ao projeto Vercel. |
| Root Directory | `frontend`, que contém o workspace, o lockfile e `vercel.json`. |
| Framework Preset | `Services`. |
| Serviços | Declarados em `vercel.json`; cada serviço identifica seu framework Next.js e seu `root`. |
| Integração Git | Habilitada para iniciar deployments automaticamente. |

A documentação oficial descreve Root Directory e Framework Preset nas configurações de build do projeto. Com a integração Git, a Vercel pode criar Preview Deployments para pushes e deployments de produção para alterações na branch de produção; a branch exata do Media Core não pode ser confirmada nos arquivos.

## Ignore Command e controle de deployments

### Objetivo

A estratégia atual busca evitar deployments do frontend quando as mudanças não impactam código executável, build, dependências ou configuração relevante do monorepo `frontend/`. Em resumo:

- Mudanças relevantes em apps, pacotes compartilhados, lockfiles e configurações devem permitir deployment.
- Mudanças apenas documentais, de agentes/IA ou fora de `frontend/` devem ser ignoradas.
- Se documentação e código relevante mudarem juntos, o deployment deve acontecer.

### Onde está configurado

O controle usa `ignoreCommand` no próprio [vercel.json](../vercel.json), dentro de cada service:

- `services.admin.ignoreCommand`
- `services.proxy.ignoreCommand`
- `services.web.ignoreCommand`

No arquivo atual, não há `ignoreCommand` no nível raiz do `vercel.json`. **[Arquivo]**

Comando configurado:

```json
"ignoreCommand": "bash ../../deploy/scripts/vercel-ignore-build.sh"
```

O script está em [deploy/scripts/vercel-ignore-build.sh](../deploy/scripts/vercel-ignore-build.sh).

### Por que o `ignoreCommand` está em cada service

No modelo atual com `services`, a configuração adotada foi declarar o mesmo `ignoreCommand` em `admin`, `proxy` e `web`, em vez de centralizar no nível raiz. A equipe registrou que isso evita ambiguidade de escopo entre múltiplos serviços no mesmo projeto. **[Relato]**

Esse ponto não muda a arquitetura: os três serviços continuam no mesmo projeto/deployment da Vercel Services (não viram deployments independentes por causa disso).

### Como o script decide (comportamento real)

Com base em [deploy/scripts/vercel-ignore-build.sh](../deploy/scripts/vercel-ignore-build.sh):

1. Resolve a raiz Git e lê `VERCEL_GIT_PREVIOUS_SHA` e `VERCEL_GIT_COMMIT_SHA` (ou `HEAD`).
2. Se faltar histórico/commit válido, encerra com `exit 1` (comportamento conservador: **permite** deployment).
3. Lista arquivos alterados no intervalo de commits com `git diff --name-only -z`.
4. Analisa apenas caminhos `frontend/*`; tudo fora disso é ignorado para a decisão.
5. Ignora mudanças documentais por extensão (`.md`, `.mdx`, `.rst`, `.adoc`, `.txt`).
6. Ignora arquivos sob diretórios documentais ou de IA em qualquer nível de `frontend/`: `docs/`, `documentation/`, `.cursor/`, `.claude/`, `.codex/`, `.windsurf/`, `.opencode/`, `.aider/`, `agents/`, `prompts/`, `ai/` e `.ai/`. `.github/` não está nessa lista e não é excluído pelo script.
7. Ignora arquivos de instruções e prompts de IA reconhecidos pelo nome, sem diferenciar maiúsculas de minúsculas: `agents.md`, `agent.md`, `claude.md`, `gemini.md`, `copilot.md`, arquivos `*.prompt`, `*.prompt.*` e `*.instructions.md`.
8. Qualquer outra alteração dentro de `frontend/` é considerada relevante por padrão e permite deployment. Isso inclui código das apps, pacotes compartilhados (inclusive pacotes novos), dependências, configurações, scripts, recursos, assets e arquivos com extensões não enumeradas individualmente. Se um commit misturar mudanças ignoráveis com pelo menos um caminho relevante, o deployment é permitido.

Sobre tipos de mudança (adição, modificação, remoção, renomeação):

- O script pede os nomes de caminho com `git diff --no-renames --name-only -z`; as mudanças são avaliadas pelo caminho resultante, sem depender de uma lista fixa de extensões relevantes.
- Uma renomeação é apresentada como remoção e adição de caminhos, e cada caminho é avaliado pelas mesmas regras. Assim, um destino novo relevante permite deployment mesmo quando a origem era ignorável.

### Códigos de saída

No Ignored Build Step da Vercel:

| Código | Resultado |
| ------ | --------- |
| `0` | Ignora build/deployment |
| `1` ou maior | Continua com build/deployment |

No script atual, `exit 1` é usado tanto para mudanças relevantes quanto para falhas de determinação segura (fail-safe).

### Limitações e cuidados

- A decisão de skip é executada por service, mas o projeto continua com deployment conjunto em Vercel Services.
- Mudança relevante em qualquer app ou pacote compartilhado deve permitir o deployment.
- A lógica depende de histórico Git e das variáveis de commit fornecidas no ambiente de build.
- Em dúvida/erro de detecção, a decisão é conservadora: não pular deployment.
- Novos tipos de arquivo e configurações relevantes devem ser adicionados ao script quando o monorepo evoluir.

## Instalação e build do monorepo

O workspace principal está em `frontend/`:

- `package.json` declara `packageManager: "pnpm@12.15.0"` e o script raiz `build: "turbo run build"`.
- `pnpm-lock.yaml` é o lockfile compartilhado.
- `pnpm-workspace.yaml` declara `apps/*` e `packages/*`; os pacotes internos `@frontend/ui` e `@frontend/api` são dependências workspace de Web e Admin.
- `turbo.json` define `build` com `dependsOn: ["^build"]`; cada app declara seu script `build: "next build"`.

O pnpm precisa instalar a partir do workspace e do lockfile correspondentes. Mantenha o lockfile versionado sincronizado com todos os `package.json`; em CI, a instalação com lockfile congelado falha em vez de reescrever um lockfile divergente.

O erro `ERR_PNPM_OUTDATED_LOCKFILE` foi encontrado durante a configuração porque o lockfile estava divergente dos manifests. O histórico informado relata que a sincronização foi feita com `pnpm install --lockfile-only` e validada com `pnpm install --frozen-lockfile`. Em seguida, a instalação congelada e os builds das três aplicações foram concluídos, e o deploy foi descrito como funcionando 100%. **[Relato — não reexecutado nesta tarefa]**

Também foi informado que `pnpm-workspace.yaml` locais de `apps/web` e `apps/admin` foram removidos, consolidando os workspaces na raiz `frontend/`. A configuração atual do workspace principal é:

```yaml
packages:
  - "apps/*"
  - "packages/*"

allowBuilds:
  sharp: false
  unrs-resolver: true
```

Essa consolidação é relevante para que pnpm e as aplicações usem o workspace e lockfile únicos. O Vercel Services constrói cada serviço separadamente; no workspace local, o script raiz delega a orquestração do build ao Turborepo. Os arquivos não registram o comando de build personalizado, se houver, no Dashboard. Portanto, não se presume aqui que cada serviço invoque `pnpm build` na raiz: confirme esse campo no Dashboard antes de alterá-lo.

## Proxy, origens e redirects

O Proxy usa `WEB_ORIGIN` e `ADMIN_ORIGIN` para selecionar a aplicação de destino. Na Vercel, essas variáveis vêm dos Service Bindings. Fora desse ambiente, o código mantém os padrões locais `http://localhost:3000` e `http://localhost:3001`.

`PROXY_PUBLIC_ORIGIN` pode ser definido explicitamente. Se estiver ausente, `getProxyPublicOrigin()` usa `request.nextUrl.origin`, ou seja, a origem da requisição recebida pelo Proxy; remove uma barra final em ambos os casos. Assim, o fallback acompanha o domínio do deployment sem codificá-lo.

`rewriteRedirectLocation()` resolve o cabeçalho `Location` relativo ou absoluto com a origem interna da aplicação chamada. Se a origem resultante for a origem interna dessa aplicação, substitui-a pela origem pública do Proxy e preserva caminho, query string e fragmento. Se o destino for externo, retorna o `Location` original sem alteração. Essa reescrita é aplicada a respostas com status `301`, `302`, `303`, `307` ou `308` que tenham um cabeçalho `Location`.

## Alternativas arquiteturais

As duas abordagens abaixo são modelos válidos na Vercel; atendem a necessidades distintas. A equipe considerou inicialmente projetos separados, mas implementou Services. **[Relato]**

### Escolhida: um projeto com Vercel Services

As três aplicações são declaradas no mesmo projeto:

- Um projeto e um domínio público compartilhado.
- Builds separados por serviço, com roteamento público centralizado no Proxy.
- Comunicação interna Proxy–Web/Admin por bindings.
- Ciclo de deployment e rollback compartilhado entre os serviços, com deployments/previews agrupados no mesmo projeto.

Essa escolha corresponde ao desenho atual: Web e Admin são partes integradas de uma solução e o Proxy é a única entrada pública. A Vercel classifica Services como **Beta em todos os planos** na [documentação oficial](https://vercel.com/docs/services).

### Considerada: três projetos Vercel

O mesmo repositório poderia ser conectado a três projetos separados:

| Projeto | Root Directory no repositório Git |
| ------- | --------------------------------- |
| Web | `frontend/apps/web` |
| Admin | `frontend/apps/admin` |
| Proxy | `frontend/apps/proxy` |

Nesse modelo, cada aplicação teria projeto, configurações e deployments independentes, podendo ter seu próprio domínio; os projetos poderiam compartilhar o repositório Git. Para usar pacotes do workspace fora do Root Directory de cada app, cada projeto precisaria incluir as fontes externas ao diretório raiz na etapa de build, conforme as configurações e recomendações da Vercel para monorepos. A comunicação entre projetos exigiria outra estratégia, como URLs entre projetos, variáveis de ambiente e, quando apropriado, Related Projects.

Essa alternativa privilegia deploys e rollbacks independentes, mas requer coordenar as configurações e comunicação entre projetos. Não foi escolhida porque, para o Media Core, as três aplicações compõem uma solução integrada sob o mesmo domínio e tráfego centralizado pelo Proxy. Essa comparação não significa que projetos separados sejam inválidos ou inferiores em outros contextos.

No cenário de três projetos separados, cada projeto poderia ter seu próprio `ignoreCommand` no `vercel.json` daquele projeto (nível raiz do projeto), com critérios diferentes por aplicação e ciclos independentes de deploy/rollback. Isso é uma possibilidade arquitetural futura; não representa a configuração atual.

## Referências oficiais

**Vercel Services**

- [Services](https://vercel.com/docs/services) — modelo, builds por serviço e estado Beta.
- [Services routing](https://vercel.com/docs/services/routing) — rewrites públicos para serviços.
- [Project settings](https://vercel.com/docs/project-configuration/project-settings) — Root Directory, framework e Ignored Build Step.
- [How do I use the "Ignored Build Step" field on Vercel?](https://vercel.com/kb/guide/how-do-i-use-the-ignored-build-step-field-on-vercel) — semântica de `exit 0`/`exit 1` e uso de script.

**Projetos e monorepos**

- [Using Monorepos](https://vercel.com/docs/monorepos) — configurar projetos a partir de um repositório monorepo.
