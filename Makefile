SHELL := /bin/bash
.DEFAULT_GOAL := help

ENV_FILE := .env
ifneq (,$(wildcard $(ENV_FILE)))
	include $(ENV_FILE)
	export
endif

POSTGRES_USER ?= platform
POSTGRES_DB ?= platform

.PHONY: help
help: ## show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS=":.*?## "}; {printf "  \033[36m%-15s\033[0m %s\n", $$1, $$2}'

.PHONY: env
env: ## copy .env.example to .env if missing
	@test -f .env || cp .env.example .env && echo ".env ready"

.PHONY: up
up: env ## bring up infra (timescale + redis)
	docker compose up -d

.PHONY: down
down: ## stop infra
	docker compose down

.PHONY: nuke
nuke: ## stop + delete volumes (DATA LOSS)
	docker compose down -v

.PHONY: ps
ps: ## list infra containers
	docker compose ps

.PHONY: logs
logs: ## tail infra logs
	docker compose logs -f --tail=100

.PHONY: psql
psql: ## open psql to timescaledb
	docker compose exec timescaledb psql -U $(POSTGRES_USER) -d $(POSTGRES_DB)

.PHONY: redis-cli
redis-cli: ## open redis-cli
	docker compose exec redis redis-cli

.PHONY: verify
verify: ## verify infra healthy (timescaledb extension + redis ping)
	@docker compose exec -T timescaledb psql -U $(POSTGRES_USER) -d $(POSTGRES_DB) -c "SELECT extname, extversion FROM pg_extension WHERE extname IN ('timescaledb','pgcrypto');"
	@docker compose exec -T redis redis-cli ping

.PHONY: install
install: ## install JS deps
	pnpm install

.PHONY: build
build: ## build all workspace packages
	pnpm -w build

.PHONY: lint
lint: ## lint all
	pnpm -w lint

.PHONY: test
test: ## run all tests
	pnpm -w test

.PHONY: clean
clean: ## remove build artifacts + node_modules
	rm -rf node_modules apps/*/node_modules apps/*/dist apps/*/.turbo .turbo
