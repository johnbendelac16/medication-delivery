# ─── Build stage ──────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files and install ALL dependencies (including dev for TypeScript)
COPY package*.json ./
RUN npm ci

# Copy source code and build
COPY tsconfig.json ./
COPY src ./src
COPY prisma ./prisma

# Generate Prisma client
RUN npx prisma generate

# Compile TypeScript
RUN npm run build

# ─── Production stage ─────────────────────────────────────────────────────────
FROM node:20-alpine AS production

WORKDIR /app

# Copy package files and install ONLY production dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy compiled code and Prisma client from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY prisma ./prisma

# Non-root user for security
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser

EXPOSE 3000

CMD ["node", "dist/index.js"]