# Docker setup — Logistic-Bot

Ushbu hujjat loyihaga qo'shilgan Docker infrastrukturasi va xavfsizlik qatlamlarini tushuntiradi.

> Tillar: **🇺🇿 O'zbekcha** · [🇷🇺 Русский](./DOCKER.ru.md) · [🇬🇧 English](./DOCKER.en.md)

---

## Nima qo'shildi

| Fayl | Maqsad |
|---|---|
| `Dockerfile` | Multi-stage build (deps → builder → prod-deps → runner), `node:24-alpine`, non-root user, `tini` signal handler |
| `docker-compose.yml` | 3 servis: `mongo:8`, `redis:8-alpine`, `bot` (TTY ochiq, CLI uchun) |
| `.dockerignore` | `node_modules`, `dist`, `.env`, va build'da kerak bo'lmagan fayllar |
| `.env.example` | MongoDB/Redis login ma'lumotlari shabloni |
| `.gitignore` | Kengaytirildi — `.env*`, `*.pem`, `*.key`, IDE fayllari, va h.k. |

## Versiyalar (eng so'nggi LTS / stable)

| Komponent | Versiya |
|---|---|
| Node | 24-alpine |
| MongoDB | 8 |
| Redis | 8-alpine |
| Mongoose | 9.6.x |
| TypeScript | 6.0.x |
| dotenv | 17.4.x |
| grammY | 1.45.x |

## Xavfsizlik (production-grade)

### Tarmoq
- **Internal bridge network** — barcha servislar `internal` tarmog'ida o'zaro gaplashadi
- **Port'lar faqat `127.0.0.1`'ga bind** — MongoDB (`30030`) va Redis (`6379`) tashqi tarmoqdan ko'rinmaydi, faqat host mashinada dev uchun
- **Bot container** — hech qaysi portni tashqariga ochmaydi

### Autentifikatsiya
- **MongoDB** — `--auth` flag, root user/parol `MONGO_INITDB_ROOT_*` env'dan, ulanish URI'da `authSource=admin`
- **Redis** — `--requirepass`, `--protected-mode yes`, parol URI'da (`redis://:password@...`)

### Container hardening
- `security_opt: no-new-privileges:true` — barcha container'larda
- `cap_drop: ALL` — keyin faqat zaruriy capability'lar qo'shiladi:
  - Mongo: `CHOWN`, `SETUID`, `SETGID`, `DAC_OVERRIDE`
  - Redis: `SETUID`, `SETGID`
  - Bot: hech qaysi (ALL drop)
- `read_only: true` filesystem + `tmpfs:/tmp` — bot va Redis container'larda
- **Non-root user** (`node`) — Dockerfile'da `USER node`
- **`init: true`** + `tini` — zombie process'lar va signal handling
- **ulimits** — file descriptor va process limit'lar (fork bomb himoyasi)

### Resurslar
- Har bir servisda `memory limit` — DoS-ga qarshi
- **Log rotation** — `json-file`, `max-size: 10m`, `max-file: 3`

### Secrets
- `.env` `.gitignore`'da, faqat `.env.example` git'da
- Logger'da `password|token|secret|api[_-]?key` regex'iga mos keladigan har qanday key avtomatik `[REDACTED]` bo'ladi (agar logger ishlatilsa)

## Ishga tushirish

### 1. Environment'ni sozlash

```bash
cp .env.example .env
```

`.env`'da to'ldiring:
- `BOT_TOKEN` — [@BotFather](https://t.me/BotFather) → `/newbot`
- `MONGO_ROOT_PASSWORD`, `REDIS_PASSWORD` — uzun tasodifiy stringlar (kamida 32 belgi)
- `MONGODB_URI` ichida ham bir xil parolni yangilang

Tasodifiy parol generatsiya:
```bash
openssl rand -base64 32
```

### 2. Ishga tushirish

```bash
docker compose up --build
```

Bot interaktiv emas — TTY kerak emas, fonda ishlatish uchun `-d` qo'shsangiz bo'ladi:

```bash
docker compose up -d --build
```

### 3. Ishga tushgandan keyin

Botga Telegram'da `/start` yozing. Foydalanuvchi sozlamalari `subscribers`, qo'shilgan guruhlar `managedchats` collection'ida saqlanadi.

Konteynerlarni to'xtatish:
```bash
docker compose down
```

Volume'larni ham o'chirish (barcha foydalanuvchi sozlamalari yo'qoladi):
```bash
docker compose down -v
```

## Performance optimizatsiyalari

- **Multi-stage Dockerfile** — final image faqat production deps + `dist/` o'z ichiga oladi (deb 100-150 MB)
- **BuildKit cache mount** (`--mount=type=cache,target=...`) — qayta build'lar tezroq
- **Alpine base image** — minimal, kichik attack surface
- **Yarn `--frozen-lockfile`** — deterministik install
- **MongoDB WiredTiger cache** — 0.5 GB'ga sozlangan
- **Redis** — `maxmemory 256mb`, `allkeys-lru` evict, `--io-threads 2`

## Texnik tafsilotlar

### Network topologiyasi
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

### Healthcheck'lar
- **Mongo**: `mongosh ping` (auth bilan), 10s interval
- **Redis**: `redis-cli ping` (auth bilan), 10s interval
- **Bot**: `depends_on.condition: service_healthy` — mongo+redis tayyor bo'lguncha kutadi

## Xizmat ko'rsatish

### Log'larni ko'rish
```bash
docker compose logs -f bot
docker compose logs -f mongo
docker compose logs -f redis
```

### Container'ga kirish
```bash
docker compose exec mongo mongosh -u root -p "$MONGO_ROOT_PASSWORD" --authenticationDatabase admin
docker compose exec redis redis-cli -a "$REDIS_PASSWORD"
```

### Image'ni qayta build qilish
```bash
docker compose build --no-cache bot
```

## Qaytarib olingan narsalar

Avvalgi iteratsiyalarda quyidagi narsalar qurilgan edi va keyin olib tashlandi:
- `src/orchestrator/` — LLM-asoslangan agent orkestrator (foydalanuvchi Claude Code agentlarini nazarda tutgan, app ichidagi LLM emas)
- `@anthropic-ai/sdk`, `bullmq` dependency'lari
- `orchestrator` va `worker` Docker servislari

Hozirgi konfiguratsiya — **toza, minimal va xavfsiz** Docker stack: faqat haqiqatda kerakli komponentlar (Mongo + Redis cache + bot CLI).
