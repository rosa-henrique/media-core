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

## Referências oficiais

**Vercel Services**

- [Services](https://vercel.com/docs/services) — modelo, builds por serviço e estado Beta.
- [The Complete Guide to Vercel Services](https://vercel.com/kb/guide/vercel-services) — configuração e exemplos.
- [Services routing](https://vercel.com/docs/services/routing) — rewrites públicos para serviços.
- [Service bindings](https://vercel.com/docs/services/bindings) — comunicação interna e variáveis geradas.
- [Service configuration reference](https://vercel.com/docs/services/config-reference) — `root`, `framework` e `bindings`.

**Projetos e monorepos**

- [Using Monorepos](https://vercel.com/docs/monorepos) — configurar projetos a partir de um repositório monorepo.
- [Projects overview](https://vercel.com/docs/projects) — conceitos de projetos e deployments.
- [Choosing how to structure your application on Vercel](https://vercel.com/kb/guide/structure-your-application) — comparação entre Services e projetos separados.
- [Configuring a Build](https://vercel.com/docs/builds/configure-a-build) — Root Directory e Framework Preset.
- [Deploying Git Repositories with Vercel](https://vercel.com/docs/git) — deployments automáticos por integração Git.
