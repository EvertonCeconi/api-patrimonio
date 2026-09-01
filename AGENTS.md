# API Patrimônio

## Stack

- **API**: NestJS 11
- **ORM**: Prisma 7 + PostgreSQL
- **Auth**: JWT (15min) + Refresh Token (7d, httpOnly cookie) com rotação
- **Validação**: class-validator + class-transformer (ValidationPipe global com whitelist)
- **Frontend**: Vite + React + TypeScript
- **Container**: Docker (docker-compose multi-stage)
- **Testes**: Jest + supertest (e2e)

## Estrutura

api-patrimonio/     # API NestJS
├── prisma/
│   ├── schema.prisma
│   ├── migrations/
│   ├── seed.ts
│   └── prisma.config.ts
├── src/
│   ├── auth/        # SignUp, SignIn, Logout, Refresh, ChangePassword
│   ├── admin/       # CRUD de usuários (role ADMIN)
│   ├── equipments/  # CRUD + import/export de equipamentos
│   │   └── dtos/    # DTOs + unit tests de validação
│   ├── prisma/      # PrismaService + PrismaModule
│   └── common/      # Guards, Filters, Utils (cookie, pagination)
└── test/
    ├── helpers/     # Factories (createAdmin, createRegularUser)
    └── *.e2e-spec.ts  # E2E (auth, admin, equipments)
frontend/            # Vite + React + TypeScript

## Modelo de Dados (Prisma)

- **User**: id (uuid), name, email (unique), passwordHash, role (ADMIN|USER), isActive (default false)
- **Equipment**: id (uuid), name, serialNumber (unique), ipAddress?, model?, description?, status (ESTOQUE|MANUTENCAO|RETIRADA_PECAS|CLIENTE), location
- **RefreshToken**: id (uuid), token (unique), userId, expiresAt (7d), cascade delete com User

## Regras de Negócio

- Signup cria usuário com `isActive: false` — precisa ser ativado por ADMIN
- Primeiro admin (owner) não pode ser excluído nem ter role alterada
- Owner só pode ser editado por ele mesmo
- Troca de senha (admin ou change-password) exige `currentPassword`
- Change-password invalida TODOS os refresh tokens do usuário (força re-login)
- Admin ao trocar senha de outro usuário via PATCH /admin/users/:id também invalida refresh tokens
- Refresh token tem rotação (cada refresh gera novo par, invalida o anterior)
- Single session: ao signin, todos os refresh tokens anteriores são deletados
- Import de equipamentos em 2 fases: preview (retorna token) → confirm (aplica via token)

## Guards

- `JwtAuthGuard`: autenticação via `Authorization: Bearer <token>`, popula `req.user = { id, email, role }`
- `RolesGuard`: autorização via decorator `@Roles(Role.ADMIN)` — lê `req.user.role`
- `ThrottlerBehindProxyGuard`: rate limit global (60 req/min), **desligado em NODE_ENV=test**, retorna "Muitas requisições. Tente novamente mais tarde." em português

## Endpoints

### Auth (público)
| Método | Rota | Rate Limit | Descrição |
|--------|------|------------|-----------|
| POST | /auth/signup | 5/min | Cadastro |
| POST | /auth/signin | 10/min | Login (JWT + cookie) |
| POST | /auth/logout | - | Logout (invalida cookie) |
| POST | /auth/refresh | 10/min | Renova access_token via cookie |
| POST | /auth/change-password | 3/min | Troca senha (requer JWT) |

### Equipments (requer JWT)
| Método | Rota | Role | Descrição |
|--------|------|------|-----------|
| GET | /equipments | - | Listar (paginado, busca, filtros por coluna) |
| GET | /equipments/:id | - | Buscar por ID |
| POST | /equipments | - | Criar |
| PATCH | /equipments/:id | - | Atualizar |
| DELETE | /equipments/:id | ADMIN | Excluir |
| GET | /equipments/export/csv | - | Exportar CSV |
| GET | /equipments/export/xlsx | - | Exportar XLSX |
| POST | /equipments/import/preview | ADMIN | Preview de importação (multipart) |
| POST | /equipments/import/confirm | ADMIN | Confirmar importação |

### Admin (requer JWT + ADMIN)
| Método | Rota | Descrição |
|--------|------|-----------|
| GET | /admin/users | Listar (paginado) |
| GET | /admin/users/:id | Buscar por ID |
| POST | /admin/users | Criar usuário |
| PATCH | /admin/users/:id | Atualizar (nome, email, senha, role, isActive) |
| PATCH | /admin/users/:id/activate | Ativar conta |
| PATCH | /admin/users/:id/promote | Promover para ADMIN |
| DELETE | /admin/users/:id | Excluir |

## Seed

- Admin inicial: `admin@empresa.com` / `senha123`

## Comandos

```bash
make dev          # sobe dev (hot-reload)
make up           # sobe produção
make down         # para containers
make migrate      # prisma migrate deploy
make seed         # npx tsx prisma/seed.ts
make lint         # eslint api + frontend
make typecheck    # tsc --noEmit api + frontend
make logs         # logs de todos serviços
make psql         # shell psql no banco
make test         # unit + e2e (jest + jest --config test/jest-e2e.json --runInBand)
Config: test/jest-e2e.json, setup carrega .env.test. beforeEach limpa banco (user, refreshToken).
Convenções
- DTOs com class-validator, contexts para mensagens de erro customizadas
- whitelist: true + forbidNonWhitelisted: true no ValidationPipe global
- Senhas com bcrypt (10 rounds)
- Uses Cases (snake_case) para DTOs
- Arquivos com kebab-case (ex: equipments.controller.ts)
- Refresh token em cookie httpOnly (secure em produção)