# ─── Build stage ──────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

# Build React app for production
RUN npm run build

# ─── Production stage — serve with Nginx ──────────────────────────────────────
FROM nginx:alpine AS production

# Copy built React files to Nginx public folder
COPY --from=builder /app/dist /usr/share/nginx/html

# Custom Nginx config to handle React Router (SPA)
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]