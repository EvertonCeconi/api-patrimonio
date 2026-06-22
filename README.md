# Controle Patrimonial

Sistema de controle de patrimônio com API NestJS, frontend React e banco de dados PostgreSQL, orquestrados via Docker.

---

## Estrutura do projeto

```
Controle_patrimonial/
├── api-patrimonio/        # Backend NestJS
├── frontend/              # Frontend React + Vite (com nginx.conf embutido)
├── .env.example           # Variáveis do docker-compose (Postgres)
├── docker-compose.yml     # Ambiente de desenvolvimento
├── docker-compose.prod.yml# Ambiente de produção
├── deploy.sh              # Script de deploy
├── .github/workflows/     # CI com GitHub Actions
└── tsconfig.json          # Project references TypeScript
```

---

## Pré-requisitos

- [Docker](https://docs.docker.com/get-docker/)
- [Docker Compose](https://docs.docker.com/compose/install/)
- [Node.js 20+](https://nodejs.org/) (apenas para desenvolvimento local fora do Docker)
- [Git](https://git-scm.com/)

---

## Configuração inicial

### 1. Clone o repositório

```bash
git clone https://github.com/EvertonCeconi/api-patrimonio.git
cd Controle_patrimonial
```

### 2. Configure as variáveis de ambiente

```bash
# Variáveis do docker-compose (Postgres)
cp .env.example .env

# Variáveis da API
cp api-patrimonio/.env.example api-patrimonio/.env
```

Edite os arquivos `.env` com seus valores:

**`.env` (raiz)**
```env
POSTGRES_USER=postgres
POSTGRES_PASSWORD=sua_senha
POSTGRES_DB=api_patrimonio
```

**`api-patrimonio/.env`**
```env
DATABASE_URL="postgresql://postgres:sua_senha@postgres:5432/api_patrimonio"
JWT_SECRET="sua-chave-jwt-secreta"
PORT=3000
NODE_ENV=development
```

---

## Desenvolvimento

```bash
# Subir todos os containers
docker-compose up -d

# Ver logs
docker-compose logs -f

# Parar os containers
docker-compose down
```

| Serviço | URL |
|---|---|
| Frontend | http://localhost:5173 |
| API | http://localhost:3000 |
| Prisma Studio | http://localhost:5555 |
| Postgres | localhost:5432 |

---

## Produção

### Primeiro deploy no servidor

```bash
# 1. Clone o repositório
git clone https://github.com/EvertonCeconi/api-patrimonio.git
cd Controle_patrimonial

# 2. Configure os .env com valores de produção
cp .env.example .env
cp api-patrimonio/.env.example api-patrimonio/.env
# edite os arquivos com senhas fortes e NODE_ENV=production

# 3. Dê permissão ao script de deploy
chmod +x deploy.sh

# 4. Execute o deploy
./deploy.sh

# 5. Apenas no primeiro deploy — cria o admin inicial
docker exec -it api_patrimonio npx prisma db seed
```

### Deploys seguintes

```bash
./deploy.sh
```

O script automaticamente:
1. Atualiza o código via `git pull`
2. Builda e sobe todos os containers (API + Frontend com nginx)
3. Aguarda a API responder via healthcheck
4. Limpa imagens Docker antigas

---

## Variáveis de ambiente

### `.env` — raiz (docker-compose)

| Variável | Descrição | Exemplo |
|---|---|---|
| `POSTGRES_USER` | Usuário do banco | `postgres` |
| `POSTGRES_PASSWORD` | Senha do banco | `senha_forte` |
| `POSTGRES_DB` | Nome do banco | `api_patrimonio` |

### `api-patrimonio/.env` — NestJS

| Variável | Descrição | Exemplo |
|---|---|---|
| `DATABASE_URL` | String de conexão do Prisma | `postgresql://...` |
| `JWT_SECRET` | Chave secreta para tokens JWT | `chave_longa_aleatoria` |
| `PORT` | Porta da API | `3000` |
| `NODE_ENV` | Ambiente de execução | `development` / `production` |

---

## Arquitetura de produção

```
internet
    └── frontend (nginx, porta 80)
            ├── /        → serve o React (dist/ estático)
            └── /api/*   → proxy para api:3000 (NestJS)
                              └── postgres:5432 (PostgreSQL)
```

---

## Tecnologias

| Camada | Tecnologia |
|---|---|
| Frontend | React, Vite, TypeScript |
| Backend | NestJS, TypeScript, Prisma |
| Banco de dados | PostgreSQL 15 |
| Infra | Docker, Docker Compose, nginx |
