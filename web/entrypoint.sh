#!/bin/sh
# ===========================================
# Entrypoint: Injeta variáveis de ambiente em runtime
# ===========================================
# O Vite substitui import.meta.env.VITE_* em BUILD TIME.
# No Railway, as variáveis de serviço só existem em RUNTIME.
# Este script injeta um <script> no index.html com as variáveis.
# ===========================================

INDEX_FILE=/usr/share/nginx/html/index.html

# Criar bloco de config com as variáveis VITE_*
ENV_JS="window.__ENV__ = {"
ENV_JS="${ENV_JS} VITE_API_URL: \"${VITE_API_URL:-}\","
ENV_JS="${ENV_JS} VITE_APP_NAME: \"${VITE_APP_NAME:-Cadastraqui}\","
ENV_JS="${ENV_JS} VITE_APP_VERSION: \"${VITE_APP_VERSION:-2.0.0}\""
ENV_JS="${ENV_JS} };"

# Injetar antes do </head> no index.html
sed -i "s|</head>|<script>${ENV_JS}</script></head>|" "$INDEX_FILE"

echo "[entrypoint] VITE_API_URL = ${VITE_API_URL:-NOT SET}"
echo "[entrypoint] Variáveis injetadas no index.html"

# Ajustar porta do nginx para a PORT do Railway
sed -i "s/listen 80/listen ${PORT:-80}/g" /etc/nginx/conf.d/default.conf

echo "[entrypoint] Nginx configurado na porta ${PORT:-80}"

# Iniciar nginx
exec nginx -g 'daemon off;'
