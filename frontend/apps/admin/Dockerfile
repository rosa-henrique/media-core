
# syntax=docker/dockerfile:1

FROM node:26.12.1-bookworm-slim AS base

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME/bin:$PATH"

RUN npm install --global pnpm@12.15.0

FROM base AS deps

WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/web/package.json apps/web/package.json
COPY apps/admin/package.json apps/admin/package.json
COPY apps/proxy/package.json apps/proxy/package.json
COPY packages/ packages/
COPY configs/ configs/

RUN pnpm install --frozen-lockfile

FROM deps AS builder

WORKDIR /app

COPY . .

RUN pnpm --filter admin build

FROM base AS runner

ENV NODE_ENV=production
ENV PORT=3001
ENV HOSTNAME="0.0.0.0"

WORKDIR /app

RUN groupadd --system --gid 1001 nodejs \
    && useradd --system --uid 1001 --gid nodejs nextjs

COPY --from=builder --chown=nextjs:nodejs /app/apps/admin/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/admin/.next/static ./apps/admin/.next/static
COPY --from=builder --chown=nextjs:nodejs /app/apps/admin/public ./apps/admin/public

USER nextjs

EXPOSE 3001

CMD ["node", "apps/admin/server.js"]
