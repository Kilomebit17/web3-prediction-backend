# ── Stage: deps ──────────────────────────────────────────────────────────────
FROM node:22-alpine AS deps

WORKDIR /app

RUN npm install -g pnpm@9

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml .npmrc ./
COPY apps/api/package.json ./apps/api/
COPY apps/worker/package.json ./apps/worker/
COPY libs/domain/package.json ./libs/domain/
COPY libs/application/package.json ./libs/application/
COPY libs/infrastructure/package.json ./libs/infrastructure/
COPY libs/shared/package.json ./libs/shared/

# Cache-bust: 2026-05-02-v3
RUN pnpm install --frozen-lockfile

# ── Stage: builder ────────────────────────────────────────────────────────────
FROM deps AS builder

COPY . .

RUN pnpm prisma:generate
RUN pnpm --filter @pred/api build
RUN pnpm --filter @pred/worker build

# ── Stage: production ─────────────────────────────────────────────────────────
FROM node:22-alpine AS production

WORKDIR /app

RUN apk add --no-cache openssl && \
    addgroup -g 1001 -S nodejs && adduser -S app -u 1001

RUN npm install -g pnpm@9 prisma@5 && \
    mkdir -p /tmp/prisma-engines && chown app:nodejs /tmp/prisma-engines

ENV PRISMA_ENGINES_DIR=/tmp/prisma-engines

COPY --from=builder --chown=app:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=app:nodejs /app/apps/api/dist ./apps/api/dist
COPY --from=builder --chown=app:nodejs /app/apps/api/package.json ./apps/api/package.json
COPY --from=builder --chown=app:nodejs /app/apps/worker/dist ./apps/worker/dist
COPY --from=builder --chown=app:nodejs /app/apps/worker/package.json ./apps/worker/package.json
COPY --from=builder --chown=app:nodejs /app/libs ./libs
COPY --from=builder --chown=app:nodejs /app/prisma ./prisma
COPY --from=builder --chown=app:nodejs /app/pnpm-workspace.yaml ./pnpm-workspace.yaml
COPY --from=builder --chown=app:nodejs /app/.npmrc ./.npmrc
COPY --from=builder --chown=app:nodejs /app/package.json ./

RUN mkdir -p node_modules/@pred && \
    ln -sf ../../libs/domain node_modules/@pred/domain && \
    ln -sf ../../libs/application node_modules/@pred/application && \
    ln -sf ../../libs/infrastructure node_modules/@pred/infrastructure && \
    ln -sf ../../libs/shared node_modules/@pred/shared && \
    chown -R app:nodejs node_modules/@pred

USER app

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/healthz',r=>{process.exit(r.statusCode===200?0:1)})"

# Entrypoint script decides API vs Worker based on SERVICE_TYPE env var
COPY --chown=app:nodejs docker/entrypoint.sh /app/entrypoint.sh
RUN chmod +x /app/entrypoint.sh

ENTRYPOINT ["/app/entrypoint.sh"]
