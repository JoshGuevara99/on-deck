ARG NODE_VERSION=20

# ── Stage 1: install deps ─────────────────────────────────────────────────────
FROM node:${NODE_VERSION}-alpine AS deps
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

WORKDIR /app

# Copy workspace manifests — cached unless deps change
COPY pnpm-workspace.yaml .npmrc package.json pnpm-lock.yaml* ./
COPY apps/api/package.json ./apps/api/
COPY packages/shared/package.json ./packages/shared/

RUN pnpm install --frozen-lockfile --filter "@on-deck/api..."

# ── Stage 2: build ────────────────────────────────────────────────────────────
FROM deps AS builder

COPY packages/shared/src ./packages/shared/src
COPY apps/api/src ./apps/api/src
COPY apps/api/tsconfig.json ./apps/api/
COPY tsconfig.base.json ./
COPY prisma ./prisma

RUN pnpm exec prisma generate

RUN pnpm --filter @on-deck/api run build

# ── Stage 3: production runner ────────────────────────────────────────────────
FROM node:${NODE_VERSION}-alpine AS runner
ENV NODE_ENV=production
WORKDIR /app

# Non-root user for least-privilege operation
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

COPY --from=builder --chown=appuser:appgroup /app/apps/api/dist ./dist
COPY --from=builder --chown=appuser:appgroup /app/apps/api/package.json ./package.json
COPY --from=builder --chown=appuser:appgroup /app/node_modules ./node_modules

USER appuser
EXPOSE 3000
CMD ["node", "dist/index.js"]
