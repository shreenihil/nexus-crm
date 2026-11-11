# Multi-stage production Dockerfile for @nexus/api
FROM node:22-alpine AS builder

RUN corepack enable && corepack prepare pnpm@10.33.0 --activate
WORKDIR /app

# Copy root manifest and workspace packages configuration
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json turbo.json ./
COPY packages ./packages
COPY apps/api ./apps/api

# Install monorepo dependencies and build packages and API
RUN pnpm install --frozen-lockfile
RUN pnpm --filter @nexus/api build

# Production runtime stage
FROM node:22-alpine AS runner

RUN apk add --no-cache dumb-init curl
ENV NODE_ENV=production
WORKDIR /app

RUN corepack enable && corepack prepare pnpm@10.33.0 --activate

# Copy build artifacts and dependencies
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/pnpm-workspace.yaml ./pnpm-workspace.yaml
COPY --from=builder /app/pnpm-lock.yaml ./pnpm-lock.yaml
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/apps/api ./apps/api
COPY --from=builder /app/node_modules ./node_modules

# Run as non-root user
USER node

EXPOSE 4000
ENV PORT=4000
ENV HOST=0.0.0.0

HEALTHCHECK --interval=15s --timeout=5s --start-period=10s --retries=3 \
  CMD ["curl", "-f", "http://localhost:4000/ready"]

ENTRYPOINT ["/usr/bin/dumb-init", "--"]
CMD ["node", "apps/api/dist/server.js"]
