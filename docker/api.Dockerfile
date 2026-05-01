# ROADMAP 12.1: Multi-stage build, node:22-alpine, non-root user

# ── Stage: deps ──────────────────────────────────────────────────────────────
FROM node:22-alpine AS deps

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@latest --activate

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/api/package.json ./apps/api/
COPY apps/worker/package.json ./apps/worker/
COPY libs/domain/package.json ./libs/domain/
COPY libs/application/package.json ./libs/application/
COPY libs/infrastructure/package.json ./libs/infrastructure/
COPY libs/shared/package.json ./libs/shared/

RUN pnpm install --frozen-lockfile

# ── Stage: development ────────────────────────────────────────────────────────
FROM deps AS development

COPY . .

WORKDIR /app

EXPOSE 3000

CMD ["pnpm", "--filter", "@pred/api", "start:dev"]

# ── Stage: builder ────────────────────────────────────────────────────────────
FROM deps AS builder

COPY . .

RUN pnpm --filter @pred/api build

# ── Stage: production ─────────────────────────────────────────────────────────
FROM node:22-alpine AS production

WORKDIR /app

# Non-root user (ROADMAP 12.1)
RUN addgroup -g 1001 -S nodejs && adduser -S nestjs -u 1001

COPY --from=builder --chown=nestjs:nodejs /app/apps/api/dist ./dist
COPY --from=builder --chown=nestjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nestjs:nodejs /app/apps/api/package.json ./

USER nestjs

EXPOSE 3000

# ROADMAP 12.1: Healthcheck
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD wget -qO- http://localhost:3000/healthz || exit 1

CMD ["node", "dist/main"]
