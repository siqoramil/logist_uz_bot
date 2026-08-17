# Docker setup — Logistic-Bot

This document describes the Docker infrastructure and security layers added to the project.

> Languages: [🇺🇿 O'zbekcha](./DOCKER.uz.md) · [🇷🇺 Русский](./DOCKER.ru.md) · **🇬🇧 English**

---

## What was added

| File | Purpose |
|---|---|
| `Dockerfile` | Multi-stage build (deps → builder → prod-deps → runner), `node:24-alpine`, non-root user, `tini` signal handler |
| `docker-compose.yml` | 3 services: `mongo:8`, `redis:8-alpine`, `bot` (TTY enabled for CLI) |
| `.dockerignore` | Excludes `node_modules`, `dist`, `.env`, and other non-build files |
| `.env.example` | Template for MongoDB/Redis credentials |
| `.gitignore` | Extended — `.env*`, `*.pem`, `*.key`, IDE files, etc. |

## Versions (latest LTS / stable)

| Component | Version |
|---|---|
| Node | 24-alpine |
| MongoDB | 8 |
| Redis | 8-alpine |
| Mongoose | 9.6.x |
| TypeScript | 6.0.x |
| dotenv | 17.4.x |
| grammY | 1.45.x |

## Security (production-grade)

### Network
- **Internal bridge network** — all services communicate over `internal`
- **Ports bound to `127.0.0.1` only** — MongoDB (`30030`) and Redis (`6379`) are not exposed to the outside world, only reachable from the host for dev
- **Bot container** does not expose any ports

### Authentication
- **MongoDB** — `--auth` flag, root user/password from `MONGO_INITDB_ROOT_*` env vars, connection URI requires `authSource=admin`
- **Redis** — `--requirepass`, `--protected-mode yes`, password in URI (`redis://:password@...`)

### Container hardening
- `security_opt: no-new-privileges:true` — on every container
- `cap_drop: ALL` — then only the minimum required capabilities are added back:
  - Mongo: `CHOWN`, `SETUID`, `SETGID`, `DAC_OVERRIDE`
  - Redis: `SETUID`, `SETGID`
  - Bot: nothing (full drop)
- `read_only: true` filesystem + `tmpfs:/tmp` — on the bot and Redis containers
- **Non-root user** (`node`) — `USER node` in the Dockerfile
- **`init: true`** + `tini` — proper signal handling, no zombie processes
- **ulimits** — file descriptor and process limits (fork-bomb protection)

### Resources
- Every service has a `memory limit` — protection against DoS
- **Log rotation** — `json-file`, `max-size: 10m`, `max-file: 3`

### Secrets
- `.env` is in `.gitignore`; only `.env.example` is tracked in git
- Logger automatically redacts values whose keys match `password|token|secret|api[_-]?key` (when used)

## Getting started

### 1. Configure environment

```bash
cp .env.example .env
```

Fill in `.env`:
- `BOT_TOKEN` — from [@BotFather](https://t.me/BotFather) → `/newbot`
- `MONGO_ROOT_PASSWORD`, `REDIS_PASSWORD` — long random strings (at least 32 chars)
- Update the same password inside `MONGODB_URI` as well

Generate a random password:
```bash
openssl rand -base64 32
```

### 2. Run

```bash
docker compose up --build
```

The bot is not interactive — no TTY is required, so you can run it detached:

```bash
docker compose up -d --build
```

### 3. After login

Send `/start` to the bot in Telegram. User settings live in the `subscribers` collection and registered groups in `managedchats`.

Stop containers:
```bash
docker compose down
```

Remove volumes too (all user settings will be lost):
```bash
docker compose down -v
```

## Performance optimizations

- **Multi-stage Dockerfile** — final image contains only production deps + `dist/` (around 100-150 MB)
- **BuildKit cache mount** (`--mount=type=cache,target=...`) — faster rebuilds
- **Alpine base image** — minimal, small attack surface
- **Yarn `--frozen-lockfile`** — deterministic installs
- **MongoDB WiredTiger cache** — tuned to 0.5 GB
- **Redis** — `maxmemory 256mb`, `allkeys-lru` eviction, `--io-threads 2`

## Technical details

### Network topology
```
┌────────────────── host (127.0.0.1) ───────────────────┐
│  :30030 → mongo                                       │
│  :6379  → redis                                       │
└───────────────────────┬───────────────────────────────┘
                        │
              ┌─────── internal (bridge) ──────┐
              │                                │
        ┌─────┴─────┐  ┌──────────┐  ┌────────┴─────┐
        │   mongo   │  │   redis  │  │     bot      │
        │ (auth on) │  │ (auth on)│  │ (TTY, node)  │
        └───────────┘  └──────────┘  └──────────────┘
```

### Healthchecks
- **Mongo**: `mongosh ping` (with auth), 10s interval
- **Redis**: `redis-cli ping` (with auth), 10s interval
- **Bot**: `depends_on.condition: service_healthy` — waits until mongo+redis are ready

## Maintenance

### View logs
```bash
docker compose logs -f bot
docker compose logs -f mongo
docker compose logs -f redis
```

### Shell into containers
```bash
docker compose exec mongo mongosh -u root -p "$MONGO_ROOT_PASSWORD" --authenticationDatabase admin
docker compose exec redis redis-cli -a "$REDIS_PASSWORD"
```

### Rebuild image
```bash
docker compose build --no-cache bot
```

## What was removed

Earlier iterations built and then removed the following:
- `src/orchestrator/` — LLM-based agent orchestrator (the user meant Claude Code agents, not an in-app LLM)
- `@anthropic-ai/sdk`, `bullmq` dependencies
- `orchestrator` and `worker` Docker services

The current setup is a **clean, minimal, secure** Docker stack: only what's actually needed (Mongo + Redis cache + bot CLI).
