# MatchLens AI - Production Multi-Stage Containerfile
# Provides runtime environments for:
# 1. Next.js Web Application (target: web)
# 2. Standalone Long-Running Queue Worker (target: worker)

# ------------------------------------------------------------------------------
# Stage 1: Base & Dependencies
# ------------------------------------------------------------------------------
FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

# ------------------------------------------------------------------------------
# Stage 2: Builder
# ------------------------------------------------------------------------------
FROM node:20-alpine AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
# Dummy secret for static build compilation
ENV AUTH_SECRET=build-time-secret-placeholder-minimum-32-chars

RUN npm run build

# ------------------------------------------------------------------------------
# Stage 3: Web Application Runner (Next.js App Router)
# ------------------------------------------------------------------------------
FROM node:20-alpine AS web
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/drizzle ./drizzle
RUN mkdir -p /app/.data && chown -R nextjs:nodejs /app/.data

USER nextjs

EXPOSE 3000

CMD ["npm", "start"]

# ------------------------------------------------------------------------------
# Stage 4: Background Queue Worker Runner
# ------------------------------------------------------------------------------
FROM node:20-alpine AS worker
WORKDIR /app

ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 matchlens

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/lib ./lib
COPY --from=builder /app/scripts ./scripts
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/tsconfig.json ./tsconfig.json
COPY --from=builder /app/drizzle ./drizzle
RUN mkdir -p /app/.data && chown -R matchlens:nodejs /app/.data

USER matchlens

CMD ["npm", "run", "worker"]
