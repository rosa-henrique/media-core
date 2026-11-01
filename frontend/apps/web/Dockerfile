
# syntax=docker/dockerfile:1

# Fixamos a versão do Node usada pelo projeto.
FROM node:26.12.1-bookworm-slim AS base

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME/bin:$PATH"

RUN npm install --global pnpm@12.15.0

# Instala as dependências do workspace.
FROM base AS deps

WORKDIR /app

# Copia os manifestos primeiro para aproveitar o cache do Docker.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/web/package.json apps/web/package.json
COPY apps/admin/package.json apps/admin/package.json
COPY apps/proxy/package.json apps/proxy/package.json
COPY packages/ packages/
COPY configs/ configs/

RUN pnpm install --frozen-lockfile

# Compila a aplicação Web a partir da raiz do monorepo.
FROM deps AS builder

WORKDIR /app

COPY . .

RUN pnpm --filter web build

# Imagem final: apenas os arquivos necessários para executar o Web.
FROM base AS runner

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

WORKDIR /app

# Usuário sem privilégios para executar o servidor.
RUN groupadd --system --gid 1001 nodejs \
    && useradd --system --uid 1001 --gid nodejs nextjs

# O standalone preserva a estrutura de diretórios rastreada pelo Next.
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/standalone ./

# Assets estáticos não são incluídos automaticamente no standalone.
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/static ./apps/web/.next/static

# Arquivos públicos, caso existam.
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/public ./apps/web/public

USER nextjs

EXPOSE 3000

CMD ["node", "apps/web/server.js"]
