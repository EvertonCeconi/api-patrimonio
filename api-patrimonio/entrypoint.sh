#!/bin/sh
set -e

echo "Aguardando PostgreSQL..."
for i in $(seq 1 30); do
  if nc -z postgres 5432 > /dev/null 2>&1; then
    echo "PostgreSQL pronto!"
    break
  fi
  echo "Aguardando... ($i)"
  sleep 2
done

echo "Rodando migrations..."
npx prisma migrate deploy

echo "Iniciando API..."
node dist/src/main.js
