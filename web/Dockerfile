# ===========================================
# CADASTRAQUI v2 - Frontend Dockerfile
# ===========================================
# Usa entrypoint.sh para injetar VITE_API_URL em runtime
# (variáveis do Railway só existem em runtime, não em build)
# ===========================================

# --- Etapa 1: Build ---
FROM node:18-alpine AS builder
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

# --- Etapa 2: Servir com Nginx ---
FROM nginx:alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist /usr/share/nginx/html
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

EXPOSE 80

ENTRYPOINT ["/entrypoint.sh"]
