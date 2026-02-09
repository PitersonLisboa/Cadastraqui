# ===========================================
# CADASTRAQUI v2 - Frontend Dockerfile
# ===========================================
# Este Dockerfile resolve o problema de variáveis VITE_*
# que precisam existir em BUILD TIME (não runtime)
# ===========================================

# --- Etapa 1: Build ---
FROM node:18-alpine AS builder

WORKDIR /app

# Copiar package files
COPY package.json package-lock.json ./

# Instalar dependências
RUN npm ci

# Copiar código fonte
COPY . .

# ARG recebe a variável do Railway em build time
# e a transforma em ENV para o Vite usar durante o build
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL

ARG VITE_APP_NAME=Cadastraqui
ENV VITE_APP_NAME=$VITE_APP_NAME

ARG VITE_APP_VERSION=2.0.0
ENV VITE_APP_VERSION=$VITE_APP_VERSION

# Build do Vite (aqui o import.meta.env.VITE_* é substituído)
RUN npm run build

# --- Etapa 2: Servir com Nginx ---
FROM nginx:alpine

# Copiar configuração customizada do nginx
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copiar build do Vite
COPY --from=builder /app/dist /usr/share/nginx/html

# Railway usa a variável PORT
EXPOSE 80

# Substituir PORT dinamicamente no nginx.conf e iniciar
CMD sh -c "sed -i \"s/listen 80/listen ${PORT:-80}/g\" /etc/nginx/conf.d/default.conf && nginx -g 'daemon off;'"
