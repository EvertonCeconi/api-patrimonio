#!/bin/bash

set -e  # para tudo se qualquer comando falhar

# ─── Cores para o output ───────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log()    { echo -e "${GREEN}[deploy]${NC} $1"; }
warn()   { echo -e "${YELLOW}[aviso]${NC} $1"; }
error()  { echo -e "${RED}[erro]${NC} $1"; exit 1; }

# ─── Verificações iniciais ─────────────────────
log "Iniciando deploy..."

[ ! -f ".env" ]                      && error "Arquivo .env não encontrado na raiz!"
[ ! -f "api-patrimonio/.env" ]       && error "Arquivo api-patrimonio/.env não encontrado!"
[ ! -f "docker-compose.prod.yml" ]   && error "docker-compose.prod.yml não encontrado!"

# ─── Atualizar código ──────────────────────────
# log "Atualizando código do repositório..."
# git pull origin main

# ─── Build do frontend ─────────────────────────
log "Buildando o frontend..."

docker build \
  --target builder \
  -t frontend_builder \
  ./frontend

# Copiar o dist para o host (nginx vai servir esse diretório)
CONTAINER_ID=$(docker create frontend_builder)
rm -rf ./frontend/dist
docker cp "$CONTAINER_ID":/app/dist ./frontend/dist
docker rm "$CONTAINER_ID"
docker rmi frontend_builder

log "Frontend buildado com sucesso!"

# ─── Build e subir containers ─────────────────
log "Buildando imagens e subindo containers..."

docker compose -f docker-compose.prod.yml build --no-cache api
docker compose -f docker-compose.prod.yml up -d

# ─── Rodar migrations ─────────────────────────
log "Rodando migrations do Prisma..."

# Aguarda a API estar de pé
sleep 5
docker exec api_patrimonio npx prisma migrate deploy

# ─── Limpeza ──────────────────────────────────
log "Limpando imagens antigas..."
docker image prune -f

# ─── Finalizado ───────────────────────────────
log "✅ Deploy finalizado com sucesso!"
echo ""
echo -e "  ${GREEN}Frontend:${NC} http://$(hostname -I | awk '{print $1}')"
echo -e "  ${GREEN}API:${NC}      http://$(hostname -I | awk '{print $1}')/api"
echo ""
