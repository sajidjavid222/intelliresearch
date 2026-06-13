FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
# Next.js bakes the /api proxy destination at BUILD time, so BACKEND_URL must be
# present here. Render passes the service env var as a build arg (matching ARG).
ARG BACKEND_URL
ENV BACKEND_URL=$BACKEND_URL
# NEXT_PUBLIC_* values are inlined into the client bundle at build time.
ARG NEXT_PUBLIC_SENTRY_DSN
ENV NEXT_PUBLIC_SENTRY_DSN=$NEXT_PUBLIC_SENTRY_DSN
ARG NEXT_PUBLIC_SITE_URL
ENV NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL
RUN npm run build

FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
# Keep it at runtime too (next start re-reads it).
ARG BACKEND_URL
ENV BACKEND_URL=$BACKEND_URL
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/next.config.mjs ./next.config.mjs
ENV PORT=3000
EXPOSE 3000
# next start honors $PORT; bind explicitly so Render's injected port is used.
CMD ["sh", "-c", "npx next start -p ${PORT:-3000}"]
