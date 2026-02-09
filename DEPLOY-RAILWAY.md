# 🚀 GUIA DE DEPLOY - CADASTRAQUI v2 no Railway

## O Problema que foi corrigido

O erro `VITE_API_URL=https://...` aparecia literalmente na URL porque:
- **Variáveis `VITE_*` são substituídas em BUILD TIME** pelo Vite, não em runtime
- O Railway estava fazendo o build sem a variável definida como **build argument**
- O `vite preview` não tinha configuração de SPA fallback (rotas 404)

## Arquivos Alterados/Criados

### 📁 web/ (Frontend)
| Arquivo | Ação | Descrição |
|---------|------|-----------|
| `Dockerfile` | ✅ CRIADO | Build multi-stage com ARG para VITE_API_URL + Nginx |
| `nginx.conf` | ✅ CRIADO | Configuração SPA (try_files) + gzip + cache |
| `.dockerignore` | ✅ CRIADO | Ignora node_modules no Docker |
| `src/services/api.ts` | 🔧 CORRIGIDO | Adicionado log de debug em dev |

### 📁 api/ (Backend)  
| Arquivo | Ação | Descrição |
|---------|------|-----------|
| `src/app.ts` | 🔧 CORRIGIDO | CORS aceita múltiplas origens + subdomínios .railway.app |

---

## 📋 Passo a Passo no Railway

### Serviço 1: API (Backend)

1. No Railway, vá no serviço da API (`cadastraqui-production-e2a9`)
2. Em **Settings**:
   - **Root Directory**: `api`
   - **Build Command**: `npm install && npx prisma generate && npm run build`  
   - **Start Command**: `npm run start`
3. Em **Variables**, confirme que existem:
   ```
   NODE_ENV=production
   DATABASE_URL=postgresql://...
   JWT_SECRET=sua-chave-secreta
   FRONTEND_URL=https://zealous-charm-production-f848.up.railway.app
   PORT=3000
   ```

### Serviço 2: WEB (Frontend) ⭐ PRINCIPAL CORREÇÃO

1. No Railway, vá no serviço do frontend (`zealous-charm-production-f848`)
2. Em **Settings**:
   - **Root Directory**: `web`
   - **Builder**: `Dockerfile` (deve detectar automaticamente)
   - ⚠️ **Remova** qualquer Build/Start Command customizado (o Dockerfile cuida disso)
3. Em **Variables**, adicione:
   ```
   VITE_API_URL=https://cadastraqui-production-e2a9.up.railway.app
   PORT=80
   ```
4. **IMPORTANTE**: Nas configurações do serviço, procure a seção de **Build Arguments** ou **Docker Build Args** e adicione:
   ```
   VITE_API_URL=https://cadastraqui-production-e2a9.up.railway.app
   ```
   
   > ⚠️ No Railway, variáveis de ambiente SÃO automaticamente passadas como build args quando usa Dockerfile. Então definir em Variables já deve funcionar.

5. Faça **Redeploy** do serviço

---

## 🔍 Como Verificar se Funcionou

Após o deploy:

1. Acesse https://zealous-charm-production-f848.up.railway.app/login
2. Abra o DevTools (F12) → Console
3. NÃO deve aparecer o erro de 404 com `VITE_API_URL=` na URL
4. Ao tentar login, a request deve ir para `https://cadastraqui-production-e2a9.up.railway.app/auth/login`

---

## ⚡ Se o Dockerfile não for detectado

Se o Railway não detectar o Dockerfile automaticamente:

1. Em **Settings** → **Build** → **Builder**, selecione `Dockerfile`
2. Em **Dockerfile Path**, coloque: `Dockerfile` (relativo ao Root Directory)
3. Redeploy

---

## 🔧 Alternativa SEM Docker (se preferir)

Se por algum motivo não quiser usar Docker, pode usar o Nixpacks do Railway:

1. Em **Settings**:
   - **Root Directory**: `web`
   - **Build Command**: `npm ci && npm run build`
   - **Start Command**: `npx serve dist -s -l $PORT`
2. Instale `serve` como dependência:
   ```bash
   cd web
   npm install serve
   ```
3. O `-s` no serve faz o SPA fallback (equivalente ao try_files do nginx)

⚠️ Mas a solução com Docker/Nginx é mais robusta e performática.
