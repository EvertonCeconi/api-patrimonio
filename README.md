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
| Frontend | https://localhost:1010 |
| API | http://localhost:3210 |
| Prisma Studio | http://localhost:5555 |
| Postgres | localhost:5432 |

---

## Produção

### Configurar acesso ao repositório (repo privado)

No servidor, gere uma **deploy key** (SSH) para acesso read-only:

```bash
ssh-keygen -t ed25519 -f ~/.ssh/deploy_key -N ""
cat ~/.ssh/deploy_key.pub
```

Copie a saída e adicione no GitHub:
**Settings > Deploy keys > Add deploy key** (marque "Allow write access" apenas se necessário).

Crie `~/.ssh/config` no servidor:

```
Host github.com
  IdentityFile ~/.ssh/deploy_key
```

Teste a conexão:

```bash
ssh -T git@github.com
# Hi EvertonCeconi/api-patrimonio! You've successfully authenticated...
```

### Gerar certificado TLS (auto-assinado para rede interna)

```bash
mkdir -p nginx/certs
openssl req -x509 -nodes -days 3650 -newkey rsa:2048 \
  -keyout nginx/certs/privkey.pem \
  -out nginx/certs/fullchain.pem \
  -subj "/CN=seu-servidor-interno"
```

> Para certificado de CA interna, substitua pelos arquivos fornecidos pela sua equipe de infra.

### Primeiro deploy no servidor

```bash
# 1. Clone o repositório (via SSH)
git clone git@github.com:EvertonCeconi/api-patrimonio.git
cd api-patrimonio

# 2. Configure os .env com valores de produção
cp .env.example .env
cp api-patrimonio/.env.example api-patrimonio/.env
# edite os arquivos com senhas fortes e NODE_ENV=production

# 3. Dê permissão ao script de deploy
chmod +x deploy.sh

# 4. Execute o deploy
./deploy.sh

# 5. Apenas no primeiro deploy — cria o admin inicial
docker exec api_patrimonio npx prisma db seed
```

| Papel | Email | Senha |
|---|---|---|
| Admin | `admin@empresa.com` | `senha123` |

### Deploys seguintes

Com a deploy key configurada, basta rodar:

```bash
./deploy.sh
```

O script automaticamente:
1. Atualiza o código via `git pull`
2. Builda e sobe todos os containers (API + Frontend com nginx)
3. Aguarda a API responder via healthcheck (`GET /api/health` via HTTPS)
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
| `PORT` | Porta da API | `3000` |
| `NODE_ENV` | Ambiente de execução | `development` / `production` |

---

## Arquitetura de produção

```
rede interna
    └── frontend (nginx, porta 443 HTTPS, exposta como :1010)
            ├── /        → serve o React (dist/ estático)
            ├── /api/*   → proxy reverso para api:3000 (NestJS)
            │                 └── postgres:5432 (PostgreSQL)
            └── HTTP :80 → redireciona para HTTPS
API também exposta diretamente na porta :3210 (para ferramentas externas)
Backup automátivo: pg_dump todo dia às 03:00 (container backup)
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
curl -sf http://localhost/api/health
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
