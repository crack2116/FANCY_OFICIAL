# ==============================================================================
# FANCYPERU — Medusa 2.21.2 Backend Production Dockerfile
# Monorepo Build Context: Root directory (.)
# Runtime Certified WORKDIR: apps/backend/.medusa/server
# ==============================================================================

# ------------------------------------------------------------------------------
# Stage 1: Base image with Node 22 and Corepack pnpm
# ------------------------------------------------------------------------------
FROM node:22-bookworm-slim AS base

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable && corepack prepare pnpm@10.11.1 --activate

# Install essential runtime tools
RUN apt-get update && apt-get install -y --no-install-recommends \
    wget \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# ------------------------------------------------------------------------------
# Stage 2: Dependencies and Build
# ------------------------------------------------------------------------------
FROM base AS builder
WORKDIR /app

# Copy workspace configuration and source code
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json .npmrc ./
COPY eslint.config.ts ./
COPY apps/backend ./apps/backend
COPY apps/storefront ./apps/storefront

# Install full workspace dependencies using frozen lockfile
RUN pnpm install --frozen-lockfile

# Compile backend and admin dashboard into .medusa/server
ENV NODE_ENV=production
RUN pnpm --filter @dtc/backend run build

# ------------------------------------------------------------------------------
# Stage 3: Production Runner
# ------------------------------------------------------------------------------
FROM base AS runner
WORKDIR /app

# Create unprivileged user for security compliance
RUN groupadd -g 1001 nodejs && useradd -u 1001 -g nodejs -m -s /bin/bash medusa

# Copy full dependencies and compiled server artifact
COPY --from=builder --chown=medusa:nodejs /app/package.json /app/pnpm-lock.yaml /app/pnpm-workspace.yaml /app/turbo.json ./
COPY --from=builder --chown=medusa:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=medusa:nodejs /app/apps/backend ./apps/backend

# Create persistent uploads directory with correct permissions
RUN mkdir -p /app/apps/backend/uploads && chown -R medusa:nodejs /app/apps/backend/uploads

USER medusa

# P0-B Certified Runtime Directory:
# Medusa 2 resolves Vite admin bundles from `./public/admin/index.html` relative to process.cwd()
WORKDIR /app/apps/backend/.medusa/server

ENV PORT=9000
ENV NODE_ENV=production
ENV MEDUSA_FF_RBAC=true
EXPOSE 9000

# Container Healthcheck verifying Store API health endpoint
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:9000/health || exit 1

# Certified start command using native Medusa CLI binary (located at apps/backend/node_modules)
CMD ["node", "../../node_modules/@medusajs/cli/cli.js", "start", "-p", "9000"]
