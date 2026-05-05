# Platform

Pro trading platform. Tick data, multi-timeframe charts, OMS, portfolio, alerts.

Status: **Sprint 0 — foundations**.

## Stack

- Backend: Go 1.23+
- Frontend: React + Vite (TypeScript)
- Charts: TradingView Charting Library (license required) — fallback `lightweight-charts`
- DB: TimescaleDB (Postgres 16 extension)
- Cache / pub-sub: Redis 7
- Monorepo: pnpm workspaces + Turborepo (JS) + Go workspace (`go.work`, added when first Go service lands)
- Infra: Docker Compose (local), CI: GitHub Actions

## Layout

```
apps/         # frontends (web, mobile, desktop) — added in later sprints
services/     # Go services (api, ingest, oms, ...) — added in later sprints
packages/     # shared TS packages
infra/        # infra config (postgres init, etc.)
```

## Prereqs

- Docker + Docker Compose v2
- Node.js 20+, pnpm 9+
- Go 1.23+
- `make`

## Quickstart

```bash
make env       # create .env from .env.example
make up        # bring up Timescale + Redis
make verify    # check timescaledb extension + redis ping
make ps        # see container state
make down      # stop
make nuke      # stop + delete volumes (DATA LOSS)
```

## Verifying Sprint 0

After `make up`:

```bash
make verify
# expect:
#   timescaledb | <version>
#   pgcrypto    | <version>
#   PONG
```

## Next sprints

See agile breakdown in project notes. Sprint 1 = auth core (Go API service).

## Notes

- Repo not yet `git init`ed. Run `git init && git add . && git commit -m "sprint 0"` when ready.
- TradingView Charting Library is proprietary — apply at https://www.tradingview.com/charting-library-docs/. Until granted, swap to `lightweight-charts`.
