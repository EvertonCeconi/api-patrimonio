#!/bin/bash

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log()    { echo -e "${GREEN}[deploy]${NC} $1"; }
warn()   { echo -e "${YELLOW}[aviso]${NC} $1"; }
error()  { echo -e "${RED}[erro]${NC} $1"; exit 1; }

log "Iniciando deploy..."

[ ! -f ".env" ]                   && error "Arquivo .env não encontrado na raiz!"
[ ! -f "api-patrimonio/.env" ]    && error "Arquivo api-patrimonio/.env não encontrado!"
[ ! -f "docker-compose.prod.yml" ] && error "docker-compose.prod.yml não encontrado!"

log "Atualizando código do repositório..."
git pull origin main

log "Buildando imagens e subindo containers..."
docker compose -f docker-compose.prod.yml up -d --build

log "Aguardando API responder..."
for i in $(seq 1 30); do
  if curl -skf https://localhost:1010/api/health > /dev/null 2>&1; then
    log "API pronta!"
    break
  fi
  echo "Aguardando... ($i)"
  sleep 2
done

log "Limpando imagens antigas..."
docker image prune -f

log "Deploy finalizado com sucesso!"
echo ""
echo -e "  ${GREEN}Frontend:${NC} https://$(hostname -I | awk '{print $1}'):1010"
echo -e "  ${GREEN}API:${NC}      http://$(hostname -I | awk '{print $1}'):3210"