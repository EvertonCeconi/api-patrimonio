COMPOSE_FILE = docker-compose.prod.yml

COMPOSE_DEV_FILE = docker-compose.yml

.PHONY: deploy logs backup restore psql lint typecheck help

dev: ## Start dev environment with hot-reload
	docker compose -f $(COMPOSE_DEV_FILE) up -d --build

deploy: ## Build and restart all services
	git pull origin main
	docker compose -f $(COMPOSE_FILE) up -d --build
	docker image prune -f

logs: ## Tail logs from all services
	docker compose -f $(COMPOSE_FILE) logs -f

logs-api: ## Tail only API logs
	docker compose -f $(COMPOSE_FILE) logs -f api

logs-frontend: ## Tail only frontend logs
	docker compose -f $(COMPOSE_FILE) logs -f frontend

backup: ## Run a manual backup now
	docker compose -f $(COMPOSE_FILE) exec backup /backup.sh

restore: ## Restore from a backup file (usage: make restore FILE=patrimonio_20250101_030000.sql.gz)
	@test -n "$(FILE)" || (echo "Usage: make restore FILE=patrimonio_20250101_030000.sql.gz"; exit 1)
	gunzip -c backups/$(FILE) | docker compose -f $(COMPOSE_FILE) exec -T postgres psql -U $(POSTGRES_USER) -d $(POSTGRES_DB)

psql: ## Open a psql shell
	docker compose -f $(COMPOSE_FILE) exec postgres psql -U $(POSTGRES_USER) -d $(POSTGRES_DB)

lint: ## Run lint on API and frontend
	cd api-patrimonio && npm run lint
	cd frontend && npm run lint

typecheck: ## Run typecheck on API and frontend
	cd api-patrimonio && npx tsc --noEmit
	cd frontend && npx tsc -b

up: ## Start all services
	docker compose -f $(COMPOSE_FILE) up -d

down: ## Stop all services
	docker compose -f $(COMPOSE_FILE) down

restart: ## Restart all services
	docker compose -f $(COMPOSE_FILE) restart

status: ## Show container status
	docker compose -f $(COMPOSE_FILE) ps

help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## ' $(MAKEFILE_LIST) | sort | \
		awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-15s\033[0m %s\n", $$1, $$2}'
