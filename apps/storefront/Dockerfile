# ==============================================================================
# FANCYPERU — Next.js 15 Storefront Production Dockerfile
# Monorepo Build Context: Root directory (.)
# Runtime: Next.js Standalone Runner (Minimal footprint ~180MB)
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

# Build environment arguments
# NEXT_PUBLIC_* values are inlined into the client bundle at build time, so every
# public value the storefront reads in a client component must be provided here.
ARG NEXT_PUBLIC_MEDUSA_BACKEND_URL=http://localhost:9000
ARG NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY=pk_placeholder
ARG NEXT_PUBLIC_BASE_URL=https://localhost:8000
ARG NEXT_PUBLIC_DEFAULT_REGION=pe
ARG NEXT_PUBLIC_ENVIRONMENT=production
ARG NEXT_PUBLIC_CULQI_PUBLIC_KEY=
ARG NEXT_PUBLIC_YAPE_PHONE=
ARG NEXT_PUBLIC_PLIN_PHONE=
ARG NEXT_PUBLIC_BANK_ACCOUNTS=
ENV NEXT_PUBLIC_MEDUSA_BACKEND_URL=$NEXT_PUBLIC_MEDUSA_BACKEND_URL
ENV NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY=$NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY
ENV NEXT_PUBLIC_BASE_URL=$NEXT_PUBLIC_BASE_URL
ENV NEXT_PUBLIC_DEFAULT_REGION=$NEXT_PUBLIC_DEFAULT_REGION
ENV NEXT_PUBLIC_ENVIRONMENT=$NEXT_PUBLIC_ENVIRONMENT
ENV NEXT_PUBLIC_CULQI_PUBLIC_KEY=$NEXT_PUBLIC_CULQI_PUBLIC_KEY
ENV NEXT_PUBLIC_YAPE_PHONE=$NEXT_PUBLIC_YAPE_PHONE
ENV NEXT_PUBLIC_PLIN_PHONE=$NEXT_PUBLIC_PLIN_PHONE
ENV NEXT_PUBLIC_BANK_ACCOUNTS=$NEXT_PUBLIC_BANK_ACCOUNTS
ENV MEDUSA_SKIP_STATIC_PREGEN=true
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

# Compile Next.js production build with standalone output
RUN pnpm --filter @dtc/storefront run build

# ------------------------------------------------------------------------------
# Stage 3: Production Runner
# ------------------------------------------------------------------------------
FROM node:22-bookworm-slim AS runner
RUN apt-get update && apt-get install -y --no-install-recommends wget ca-certificates && rm -rf /var/lib/apt/lists/*
WORKDIR /app

# Create unprivileged user for security compliance
RUN groupadd -g 1001 nodejs && useradd -u 1001 -g nodejs -m -s /bin/bash nextjs

# Copy Next.js standalone bundle, public assets, and static files
COPY --from=builder --chown=nextjs:nodejs /app/apps/storefront/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/storefront/.next/static ./apps/storefront/.next/static
COPY --from=builder --chown=nextjs:nodejs /app/apps/storefront/public ./apps/storefront/public

USER nextjs

WORKDIR /app

ENV PORT=8000
ENV HOSTNAME="0.0.0.0"
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
EXPOSE 8000

# Container Healthcheck
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:8000/robots.txt || exit 1

# Launch standalone Node.js server from monorepo root
CMD ["node", "apps/storefront/server.js"]
