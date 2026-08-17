# Docker setup — Logistic-Bot

Этот документ описывает Docker-инфраструктуру и слои безопасности, добавленные в проект.

> Языки: [🇺🇿 O'zbekcha](./DOCKER.uz.md) · **🇷🇺 Русский** · [🇬🇧 English](./DOCKER.en.md)

---

## Что добавлено

| Файл | Назначение |
|---|---|
| `Dockerfile` | Multi-stage сборка (deps → builder → prod-deps → runner), `node:24-alpine`, non-root user, `tini` для сигналов |
| `docker-compose.yml` | 3 сервиса: `mongo:8`, `redis:8-alpine`, `bot` (с TTY для CLI) |
| `.dockerignore` | `node_modules`, `dist`, `.env` и прочие ненужные для сборки файлы |
| `.env.example` | Шаблон для MongoDB/Redis credentials |
| `.gitignore` | Расширен — `.env*`, `*.pem`, `*.key`, IDE-файлы и т.п. |

## Версии (актуальные LTS / stable)

| Компонент | Версия |
|---|---|
| Node | 24-alpine |
| MongoDB | 8 |
| Redis | 8-alpine |
| Mongoose | 9.6.x |
| TypeScript | 6.0.x |
| dotenv | 17.4.x |
| grammY | 1.45.x |

## Безопасность (production-grade)

### Сеть
- **Внутренняя bridge-сеть** — все сервисы общаются через `internal`
- **Порты привязаны только к `127.0.0.1`** — MongoDB (`30030`) и Redis (`6379`) недоступны извне, только с host-машины для разработки
- **Bot контейнер** не открывает ни одного порта наружу

### Аутентификация
- **MongoDB** — флаг `--auth`, root user/пароль из `MONGO_INITDB_ROOT_*` env, в URI обязателен `authSource=admin`
- **Redis** — `--requirepass`, `--protected-mode yes`, пароль в URI (`redis://:password@...`)

### Hardening контейнеров
- `security_opt: no-new-privileges:true` — для всех контейнеров
- `cap_drop: ALL` — затем добавляются только необходимые capabilities:
  - Mongo: `CHOWN`, `SETUID`, `SETGID`, `DAC_OVERRIDE`
  - Redis: `SETUID`, `SETGID`
  - Bot: ничего не добавляется (полный drop)
- `read_only: true` файловая система + `tmpfs:/tmp` — у bot и Redis
- **Non-root user** (`node`) — в Dockerfile `USER node`
- **`init: true`** + `tini` — корректная обработка сигналов и zombie-процессов
- **ulimits** — лимиты на file descriptors и процессы (защита от fork-бомбы)

### Ресурсы
- У каждого сервиса `memory limit` — защита от DoS
- **Ротация логов** — `json-file`, `max-size: 10m`, `max-file: 3`

### Секреты
- `.env` в `.gitignore`, в git попадает только `.env.example`
- Logger автоматически редактирует значения с ключами `password|token|secret|api[_-]?key` (если используется)

## Запуск

### 1. Настройка окружения

```bash
cp .env.example .env
```

В `.env` заполните:
- `BOT_TOKEN` — от [@BotFather](https://t.me/BotFather) → `/newbot`
- `MONGO_ROOT_PASSWORD`, `REDIS_PASSWORD` — длинные случайные строки (минимум 32 символа)
- Обновите тот же пароль внутри `MONGODB_URI`

Генерация случайного пароля:
```bash
openssl rand -base64 32
```

### 2. Запуск

```bash
docker compose up --build
```

Бот интерактивный (запрашивает телефон, код), поэтому **не используйте `-d`** — нужен TTY.

### 3. После входа

Напишите боту `/start` в Telegram. Настройки пользователей хранятся в коллекции `subscribers`, зарегистрированные группы — в `managedchats`.

Остановка:
```bash
docker compose down
```

С удалением томов (сессия будет потеряна):
```bash
docker compose down -v
```

## Оптимизация производительности

- **Multi-stage Dockerfile** — финальный образ содержит только production-зависимости + `dist/` (около 100-150 МБ)
- **BuildKit cache mount** (`--mount=type=cache,target=...`) — повторные сборки быстрее
- **Alpine base image** — минимальный, малая attack surface
- **Yarn `--frozen-lockfile`** — детерминированная установка
- **MongoDB WiredTiger cache** — настроен на 0.5 ГБ
- **Redis** — `maxmemory 256mb`, политика `allkeys-lru`, `--io-threads 2`

## Технические детали

### Топология сети
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
- **Mongo**: `mongosh ping` (с авторизацией), интервал 10s
- **Redis**: `redis-cli ping` (с авторизацией), интервал 10s
- **Bot**: `depends_on.condition: service_healthy` — ждёт готовности mongo+redis

## Обслуживание

### Просмотр логов
```bash
docker compose logs -f bot
docker compose logs -f mongo
docker compose logs -f redis
```

### Подключение к контейнерам
```bash
docker compose exec mongo mongosh -u root -p "$MONGO_ROOT_PASSWORD" --authenticationDatabase admin
docker compose exec redis redis-cli -a "$REDIS_PASSWORD"
```

### Пересборка образа
```bash
docker compose build --no-cache bot
```

## Что было удалено

В предыдущих итерациях было построено и затем убрано:
- `src/orchestrator/` — LLM-оркестратор агентов (пользователь имел в виду Claude Code агенты, а не LLM внутри приложения)
- Зависимости `@anthropic-ai/sdk`, `bullmq`
- Сервисы `orchestrator` и `worker` в Docker

Текущая конфигурация — **чистый, минимальный и безопасный** Docker stack: только реально нужные компоненты (Mongo + Redis cache + bot CLI).
