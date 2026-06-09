#!/bin/sh
set -e

echo "Rodando migrations..."
npx prisma migrate deploy

echo "Iniciando API..."
node dist/src/main.js
