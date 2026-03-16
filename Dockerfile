FROM node:20-alpine AS base

# ─── Dependencies ────────────────────────────────────────
FROM base AS deps
WORKDIR /app

COPY package.json package-lock.json* ./
COPY prisma ./prisma/

# Install deps and generate Prisma client (using the installed binary directly)
RUN npm ci && node node_modules/prisma/build/index.js generate

# ─── Build ───────────────────────────────────────────────
FROM base AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

RUN npm run build

# ─── Production ──────────────────────────────────────────
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Copy Prisma CLI, client, and schema for runtime db push
COPY --from=builder /app/node_modules/prisma ./node_modules/prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/prisma ./prisma

# Create startup script (runs db push as root before dropping to nextjs)
RUN printf '#!/bin/sh\nset -e\necho "Syncing database schema..."\nnode node_modules/prisma/build/index.js db push --accept-data-loss || echo "WARNING: prisma db push failed, continuing anyway"\necho "Starting server..."\nexec node server.js\n' > /app/start.sh && chmod +x /app/start.sh

USER nextjs

EXPOSE 3000

CMD ["/app/start.sh"]
