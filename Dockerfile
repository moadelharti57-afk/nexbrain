# syntax=docker/dockerfile:1
# Image NexBrain — cibles : web (Next.js standalone) et worker (BullMQ + migrations)

FROM node:22-alpine AS base
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

# ── Dépendances ──
FROM base AS deps
COPY package.json package-lock.json ./
COPY prisma ./prisma
COPY prisma.config.ts ./
RUN npm ci

# ── Build Next.js ──
FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Variables factices : nécessaires au chargement des modules pendant le build uniquement
ENV DATABASE_URL=postgresql://build:build@localhost:5432/build \
    REDIS_URL=redis://localhost:6379 \
    NEXT_STANDALONE=1
RUN npx prisma generate && npm run build

# ── Worker (agents IA) + migrations ──
FROM base AS worker
ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate
USER node
CMD ["npx", "tsx", "src/worker/index.ts"]

# ── Web ──
FROM base AS web
ENV NODE_ENV=production PORT=3000 HOSTNAME=0.0.0.0
COPY --from=build /app/public ./public
COPY --from=build --chown=node:node /app/.next/standalone ./
COPY --from=build --chown=node:node /app/.next/static ./.next/static
USER node
EXPOSE 3000
CMD ["node", "server.js"]
