# Controle Patrimonial

Sistema de controle de patrimônio com API NestJS, frontend React e banco de dados PostgreSQL, orquestrados via Docker.

<p>
  <img alt="NestJS" src="https://img.shields.io/badge/NestJS-11-E0234E?logo=nestjs&logoColor=white">
  <img alt="React" src="https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white">
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-5.9-3178C6?logo=typescript&logoColor=white">
  <img alt="Prisma" src="https://img.shields.io/badge/Prisma-7-2D3748?logo=prisma&logoColor=white">
  <img alt="PostgreSQL" src="https://img.shields.io/badge/PostgreSQL-15-4169E1?logo=postgresql&logoColor=white">
  <img alt="Docker" src="https://img.shields.io/badge/Docker-Compose-2496ED?logo=docker&logoColor=white">
  <img alt="JWT" src="https://img.shields.io/badge/Auth-JWT-000000?logo=jsonwebtokens&logoColor=white">
  <img alt="CI" src="https://github.com/EvertonCeconi/api-patrimonio/actions/workflows/ci.yml/badge.svg?branch=main">
</p>

---

## Stack

| Camada | Tecnologia | Versão | Papel no projeto |
|---|---|---|---|
| **Backend** | NestJS | 11 | API REST modular (`auth`, `admin`, `equipments`), guards e exception filters |
| | Prisma | 7 | ORM, migrations e seed |
| | PostgreSQL | 15 | Banco de dados relacional |
| | Passport + JWT | 11 / 4 | Access token (15 min) + refresh token (7 dias, cookie httpOnly) com rotação |
| | bcrypt | 6 | Hash de senhas (10 rounds) |
| | class-validator / class-transformer | 0.14 / 0.5 | Validação dos DTOs (`whitelist` + `forbidNonWhitelisted`) |
| | Helmet + Throttler | 8 / 6 | Cabeçalhos de segurança e rate limit (60 req/min; desligado em testes) |
| | SheetJS (xlsx) | 0.18 | Importação e exportação CSV/XLSX |
| **Frontend** | React | 19 | SPA com rotas protegidas por papel |
| | Vite | 8 | Dev server e build de produção |
| | TypeScript | 5.9 | Tipagem de ponta a ponta |
| | React Router | 7 | Navegação e rotas privadas |
| | TanStack Query | 5 | Cache e estado de servidor |
| | Zustand | 5 | Estado de autenticação |
| | Tailwind CSS | 3 | Estilização |
| **Testes** | Jest + Supertest | 30 / 7 | Unitários (DTOs) e e2e (auth, admin, equipments) |
| **Infra** | Docker + Docker Compose | multi-stage | Ambientes de dev e produção (API, frontend, Postgres e backup) |
| | nginx | alpine | Serve o React e faz proxy reverso de `/api` para o NestJS |
| | GitHub Actions | `ci.yml` | Lint, typecheck, testes e build das imagens |

---

## Funcionalidades

- Autenticação JWT com refresh token rotativo em cookie `httpOnly`, single session e troca de senha que invalida sessões
- CRUD de equipamentos com busca, filtros por coluna, paginação e ordenação
- Importação de CSV/XLSX em duas fases (preview → confirmação) e exportação
- Painel administrativo de usuários (criar, editar, ativar, promover e excluir)
- Controle de acesso por papel (`ADMIN` / `USER`), com proteção do primeiro administrador

---

## Demonstração

![Demonstração do sistema](docs/demo.gif)

<sub>Login, busca, cadastro de equipamento e painel administrativo — dados fictícios.</sub>

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
JWT_SECRET=troque_por_uma_chave_aleatoria
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

### Comparação de deploys

| | `./deploy.sh` | `make deploy` |
|---|---|---|
| Git pull | Manual (`git pull origin main`) | Automático |
| Build + restart | ✅ | ✅ |
| Aplica migrações (`prisma migrate deploy`) | ✅ | ❌ |
| Seed | ✅ | ❌ |
| Limpa imagens antigas | ✅ | ✅ |

> **Importante:** `make deploy` **não aplica migrações de banco**. Se a atualização incluir mudança de schema (ex.: nova coluna no Prisma), rode também `make migrate` após o deploy — senão o app para de funcionar (ex.: erro 500 ao criar equipamento com migration pendente). Para segurança, o fluxo `git pull && ./deploy.sh` é o recomendado.

### Comandos úteis (Makefile)

```bash
make deploy     # Pull + build dos containers (não aplica migrações)
make migrate    # Aplica migrações do banco (prisma migrate deploy)
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
