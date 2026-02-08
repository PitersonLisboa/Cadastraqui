# CADASTRAQUI v2

Plataforma de Gestão de Bolsas CEBAS para Instituições de Ensino.

## 🏗️ Estrutura do Projeto

```
cadastraqui-v2/
├── api/                    # Backend (Fastify + Prisma)
│   ├── src/
│   ├── prisma/
│   └── package.json
├── web/                    # Frontend (React + Vite)
│   ├── src/
│   └── package.json
└── README.md
```

## 🚀 Quick Start (Desenvolvimento Local)

### Pré-requisitos

- Node.js 18+
- PostgreSQL (ou usar Supabase)

### 1. Clone e instale dependências

```bash
git clone https://github.com/SEU-USUARIO/cadastraqui-v2.git
cd cadastraqui-v2

# Backend
cd api
npm install
cp .env.example .env
# Edite .env com suas configurações

# Frontend
cd ../web
npm install
cp .env.example .env
```

### 2. Configure o banco de dados

```bash
cd api

# Gerar client do Prisma
npm run db:generate

# Criar tabelas
npm run db:push

# (Opcional) Popular com dados de teste
npm run db:seed
```

### 3. Inicie os servidores

```bash
# Terminal 1 - Backend
cd api
npm run dev

# Terminal 2 - Frontend
cd web
npm run dev
```

Acesse: http://localhost:5173

## 🌐 Deploy em Produção

### Arquitetura

```
Frontend (Vercel) → Backend (Railway) → Banco (Supabase)
```

### Deploy do Frontend (Vercel)

1. Importe o repositório no Vercel
2. Configure:
   - **Root Directory**: `web`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
3. Variáveis de ambiente:
   ```
   VITE_API_URL=https://api.cadastraqui.net.br
   ```

### Deploy do Backend (Railway)

1. Importe o repositório no Railway
2. Configure:
   - **Root Directory**: `api`
   - **Build Command**: `npm install && npx prisma generate && npm run build`
   - **Start Command**: `npm run start`
3. Variáveis de ambiente:
   ```
   NODE_ENV=production
   PORT=3000
   DATABASE_URL=postgresql://...
   JWT_SECRET=...
   FRONTEND_URL=https://app.cadastraqui.net.br
   ```

### Banco de Dados (Supabase)

1. Crie um projeto no Supabase (região: São Paulo)
2. Copie a Connection String (porta 6543)
3. Execute as migrations:
   ```bash
   npx prisma migrate deploy
   ```

## 📝 Scripts Disponíveis

### Backend (api/)

| Comando | Descrição |
|---------|-----------|
| `npm run dev` | Inicia servidor de desenvolvimento |
| `npm run build` | Compila para produção |
| `npm run start` | Inicia servidor de produção |
| `npm run db:generate` | Gera Prisma Client |
| `npm run db:push` | Sincroniza schema com banco |
| `npm run db:migrate` | Cria migration |
| `npm run db:studio` | Abre Prisma Studio |
| `npm run db:seed` | Popula banco com dados |

### Frontend (web/)

| Comando | Descrição |
|---------|-----------|
| `npm run dev` | Inicia servidor de desenvolvimento |
| `npm run build` | Compila para produção |
| `npm run preview` | Preview da build |

## 🔐 Usuário Admin Padrão

Após rodar o seed:

- **Email**: admin@cadastraqui.com.br
- **Senha**: admin123

⚠️ **Troque a senha após o primeiro acesso!**

## 📄 Licença

MIT © RW Engenharia
