# Controle Patrimonial

Sistema de controle de patrimônio com API NestJS, frontend React e banco de dados PostgreSQL, orquestrados via Docker.

---

## Estrutura do projeto

```
Controle_patrimonial/
├── api-patrimonio/         # Backend NestJS
├── frontend/               # Frontend React + Vite (com nginx.conf embutido)
├── .env.example            # Variáveis do docker-compose (Postgres)
├── .github/workflows/      # CI (lint, testes, build Docker)
├── docker-compose.yml      # Ambiente de desenvolvimento
├── docker-compose.prod.yml # Ambiente de produção
├── Makefile                # Atalhos para comandos comuns
├── deploy.sh               # Script de deploy automatizado
├── scripts/                # Scripts auxiliares (backup, etc.)
└── backups/                # Dumps do banco (gitignorado)
```

---

## Pré-requisitos

- [Docker](https://docs.docker.com/get-docker/)
- [Docker Compose](https://docs.docker.com/compose/install/) (comando `docker compose` v2)
- [Node.js 20+](https://nodejs.org/) (apenas para desenvolvimento local fora do Docker)
- [Git](https://git-scm.com/)
- [Make](https://www.gnu.org/software/make/) (`sudo apt install make` no Ubuntu/Debian)
- Servidor Linux com Docker instalado (para deploy em produção)

---

## Configuração inicial

### 1. Clone o repositório

```bash
git clone https://github.com/EvertonCeconi/api-patrimonio.git
cd api-patrimonio
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
make dev
```

Ou manualmente:

```bash
docker compose up -d --build
```

| Serviço | URL |
|---|---|
| Frontend | http://localhost:5170 |
| API | http://localhost:3000 |
| Prisma Studio | http://localhost:5555 |
| Postgres | localhost:5432 |

---

## Produção (rede interna HTTP)

### Primeiro deploy no servidor

```bash
# 1. Clone o repositório (via SSH)
git clone git@github.com:EvertonCeconi/api-patrimonio.git
cd api-patrimonio

# 2. Configure os .env com valores de produção
cat > .env << 'EOF'
POSTGRES_USER=patrimonio_admin
POSTGRES_PASSWORD=sua_senha_forte
POSTGRES_DB=api_patrimonio
EOF

cat > api-patrimonio/.env << 'EOF'
DATABASE_URL="postgresql://patrimonio_admin:sua_senha_forte@postgres:5432/api_patrimonio?schema=public"
JWT_SECRET=7f8a9b3c2d1e4f5a6b7c8d9e0f1a2b3c
NODE_ENV=production
COOKIE_SECURE=false
CORS_ORIGIN=http://SEU_IP:1010
EOF
```

> Gere um `JWT_SECRET` com `openssl rand -hex 32`.  
> Substitua `SEU_IP` pelo IP do servidor (veja com `hostname -I`).

### 3. Libere a porta no firewall

```bash
sudo ufw allow 1010
```

### 4. Execute o deploy

```bash
chmod +x deploy.sh
./deploy.sh
```

### Deploys seguintes

```bash
git pull origin main
./deploy.sh
```

| Papel | Email | Senha |
|---|---|---|
| Admin | `admin@empresa.com` | `senha123` |

O script automaticamente:
1. Builda e sobe todos os containers (API + Frontend com nginx)
2. Aguarda a API responder via healthcheck (`GET /health`)
3. Aplica migrações do banco e seed
4. Limpa imagens Docker antigas

### Comandos úteis (Makefile)

```bash
make logs       # Logs de todos containers
make status     # Status dos containers
make backup     # Backup manual do banco
make restore FILE=patrimonio_20250101_030000.sql.gz
make psql       # Shell interativo no PostgreSQL
make down       # Parar todos containers
```

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
| `NODE_ENV` | Ambiente de execução | `development` / `production` |
| `COOKIE_SECURE` | `true` para HTTPS, `false` para HTTP | `false` |
| `CORS_ORIGIN` | URL do frontend para CORS | `http://192.168.1.100:1010` |
| `PORT` | Porta interna da API (não alterar) | `3000` |

---

## Arquitetura de produção

```
rede interna
    └── frontend (nginx, porta 80, exposta como :1010)
            ├── /        → serve o React (dist/ estático)
            └── /api/*   → proxy reverso para api:3000 (NestJS)
                              └── postgres:5432 (PostgreSQL)
API também exposta diretamente na porta :3210 (para ferramentas externas)
Backup automático: pg_dump todo dia às 03:00 (container backup)
Retenção: 30 dias
```

CI/CD (GitHub Actions):
- `lint-typecheck` → API e Frontend
- `test-api` → testes de integração com PostgreSQL
- `docker-build` → build das imagens de produção

---

## Troubleshooting

### Container da API reinicia toda hora

Veja os logs para identificar o erro:

```bash
docker logs api_patrimonio --tail 50
```

Problemas comuns:
- **Banco de dados**: confirme que o PostgreSQL está saudável (`docker ps`) e a `DATABASE_URL` está correta no `api-patrimonio/.env`
- **Porta ocupada**: verifique se a porta 80 não está em uso no servidor

### Frontend carrega mas API retorna 502

O nginx pode estar com a configuração de proxy incorreta. Verifique:

```bash
curl -sf http://localhost:3210/health
```

Se falhar, entre no container e teste direto:

```bash
docker exec frontend_patrimonio curl -sf http://api:3000/health
```

### Seed não roda

```bash
docker exec api_patrimonio npx prisma db seed
```

O seed cria o usuário admin (idempotente — pode rodar várias vezes).

### CI falhando no GitHub Actions

- Confirme que as secrets `POSTGRES_USER`, `POSTGRES_PASSWORD` e `POSTGRES_DB` estão configuradas no repositório (apenas se usar serviço externo)
- Para build local das imagens:

```bash
docker build --target production -t api-patrimonio ./api-patrimonio
docker build --target builder -t frontend-patrimonio ./frontend
```

---

## Tecnologias

| Camada | Tecnologia |
|---|---|
| Frontend | React, Vite, TypeScript |
| Backend | NestJS, TypeScript, Prisma |
| Banco de dados | PostgreSQL 15 |
| Infra | Docker, Docker Compose, nginx |
