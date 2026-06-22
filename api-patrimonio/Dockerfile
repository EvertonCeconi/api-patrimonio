FROM node:20-alpine AS base

# Prisma precisa do openssl no Alpine
RUN apk add --no-cache openssl

WORKDIR /app

COPY package*.json ./

# ─── Development ───────────────────────────────
FROM base AS development

RUN npm install --legacy-peer-deps

COPY . .

RUN npx prisma generate

CMD ["npm", "run", "start:dev"]

# ─── Builder ───────────────────────────────────
FROM base AS builder

RUN npm install --legacy-peer-deps

COPY . .

RUN npx prisma generate
RUN npm run build

# ─── Production ────────────────────────────────
FROM node:20-alpine AS production

RUN apk add --no-cache openssl netcat-openbsd

WORKDIR /app

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/prisma ./prisma

COPY --from=builder /app/prisma.config.ts ./prisma.config.ts
COPY --from=builder /app/tsconfig.json ./tsconfig.json

RUN npm install -g ts-node

# ─── Entrypoint ────────────────────────────────
COPY entrypoint.sh ./entrypoint.sh
RUN chmod +x entrypoint.sh

CMD ["./entrypoint.sh"]