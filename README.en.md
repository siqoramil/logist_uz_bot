# Logistic Bot

A multi-tenant Telegram bot: every user configures their own message, their own groups and their own interval, and the bot broadcasts on that schedule automatically.

> Languages: [🇺🇿 O'zbekcha](./README.md) · [🇷🇺 Русский](./README.ru.md) · **🇬🇧 English**

## How it works

1. A user sends `/start` to the bot.
2. They add the bot to their groups — each group is registered automatically.
3. They set the message text and the interval inside the bot.
4. ▶️ **Start** — the bot begins broadcasting to that user's groups on schedule.

> ⚠️ **Important:** The Telegram Bot API has no "list my groups" method. The bot therefore only knows about groups **it has been added to**. You must add it to each group manually, and it must be allowed to send messages there.

## Features

- 👥 **Multi-tenant** — message, groups and interval are per-user. A group belongs to whoever added the bot to it.
- 🎛 **Controlled inside Telegram** — inline buttons for message, interval, group list, send-now and start/stop.
- ⏱ **Flexible interval** — 5 minutes to 24 hours, via preset buttons or a typed number.
- 🧹 **Self-healing group list** — if the bot is kicked or loses write access, the group is deactivated automatically.
- 📊 **Per-run report** — sent/failed counts plus per-group error reasons, delivered to the user's private chat.
- 🔁 **Crash-safe scheduling** — the next run is persisted *before* sending, so a failure mid-broadcast cannot replay the same run forever.

## Tech stack

| Component | Version |
| --------- | ------- |
| Node.js + TypeScript | 24 / 6.x |
| [grammY](https://grammy.dev/) | 1.45.x |
| MongoDB + mongoose | 8 / 9.x |
| tsx | 4.x |

## Architecture

Hexagonal (ports & adapters). Dependencies always point inward:

```
presentation  →  use-cases  →  ports  ←  infrastructure
                     ↓
                  domain
```

- **domain** — pure business types (`Subscriber`, `ManagedChat`, `BroadcastResult`), no external libraries.
- **ports** — interfaces (`SubscriberRepository`, `ChatRepository`, `Broadcaster`, `Logger`).
- **use-cases** — business scenarios, depending only on ports.
- **infrastructure** — concrete adapters (Mongo, grammY, scheduler).
- **presentation** — Telegram handlers and user-facing copy.

This is what lets the test suite swap Telegram for a fake `Broadcaster` — see `scripts/smoke.ts`.

## Project structure

```
src/
├── main.ts                                  # bootstrap: DI, scheduler, bot start
├── constants.ts                             # throttle, interval bounds, tick
├── domain/
│   ├── subscriber.ts                        # per-user settings
│   ├── managed-chat.ts                      # a group the bot was added to
│   ├── broadcast-result.ts                  # send outcome
│   ├── errors.ts
│   └── guard.ts                             # validation
├── ports/
│   ├── subscriber-repository.ts
│   ├── chat-repository.ts
│   ├── broadcaster.ts
│   └── logger.ts
├── use-cases/
│   ├── manage-subscriber.ts                 # message, interval, start/stop
│   ├── track-chat.ts                        # bot added to / removed from a group
│   ├── broadcast-for-subscriber.ts          # broadcast for one user
│   └── run-due-broadcasts.ts                # find and run everything that is due
├── infrastructure/
│   ├── env-config.ts                        # .env validation
│   ├── mongo.ts
│   ├── mongo-subscriber-repository.ts
│   ├── mongo-chat-repository.ts
│   ├── grammy-broadcaster.ts                # sendMessage + error classification
│   ├── scheduler.ts                         # non-overlapping tick
│   └── console-logger.ts
└── presentation/
    ├── bot.ts                               # grammY handlers, menus
    └── texts.ts                             # all user-facing strings (Uzbek)

scripts/
└── smoke.ts                                 # integration test against a real Mongo
```

## Installation

```bash
git clone <repo>
cd Logistic-Bot
yarn install
```

## Configuration

### 1. Create the bot

In Telegram open [@BotFather](https://t.me/BotFather) → `/newbot` → pick a name and username → copy the token.

### 2. Prepare `.env`

```bash
cp .env.example .env
```

| Variable | Required | Description |
| -------- | -------- | ----------- |
| `BOT_TOKEN` | ✅ | Token from @BotFather |
| `MONGODB_URI` | ✅ | MongoDB connection string |
| `BROADCAST_INTERVAL_MINUTES` | ❌ | Default interval for new users (5..1440, default 60) |
| `MONGO_ROOT_USER` / `MONGO_ROOT_PASSWORD` / `MONGO_DB` | ✅ (for Docker) | Used to bring up the Mongo container |
| `REDIS_PASSWORD` / `REDIS_URL` | ❌ | Not used by the code yet |

## Running

### With Docker

```bash
docker compose up -d mongo    # database only
yarn dev                      # bot on the host
```

Or everything in containers:

```bash
docker compose up -d
```

The bot is no longer interactive, so no TTY is needed and `-d` works fine.

### Locally

```bash
yarn dev        # development (tsx)
yarn dev:watch  # restart on change

yarn build      # production build
yarn start
```

## Usage

`/start` opens this panel:

```
📊 Holat

Rejim:    🟢 Ishlayapti
Guruhlar: 12 ta
Interval: har 60 daqiqada
Keyingi:  16:30, 14/08
Oxirgi:   15:30, 14/08

📝 Xabar:
Yuk bor: Toshkent → Samarqand

[📝 Xabar]      [⏱ Interval]
[📋 Guruhlar]   [📤 Hozir yuborish]
[⏹ To'xtatish]
[🔄 Yangilash]
```

Commands: `/start`, `/menu`, `/status`, `/help`.

> The bot's interface language is Uzbek. All strings live in `src/presentation/texts.ts`, so translating is a single-file change.

## Data model

**`subscribers`** — per-user settings:

| Field | Description |
| ----- | ----------- |
| `userId` | Telegram user ID (unique) |
| `message` | Text to broadcast |
| `intervalMinutes` | Period |
| `active` | Whether broadcasting is on |
| `state` | `idle` / `awaiting-message` / `awaiting-interval` |
| `nextRunAt` | When the next run is due (indexed) |
| `lastRunAt` | Last run |

**`managedchats`** — groups the bot was added to:

| Field | Description |
| ----- | ----------- |
| `chatId` | Group ID (unique) |
| `ownerId` | User who added the bot |
| `title` | Group title |
| `active` | Whether the bot is still in the group |

## Testing

```bash
yarn smoke
```

Runs 30 assertions against a real MongoDB with Telegram replaced by a fake `Broadcaster`: registration, add/remove/re-add of groups, validation, `findDue` selection, dead-group cleanup, scheduler rescheduling, and stop. The script cleans up its own data.

## Things to keep in mind

- **The bot must be added to each group by hand.** The Bot API does not expose a group list — that is a Telegram limitation, not a gap in this code.
- **Spam limits.** Repeating the same text across many groups can get rate-limited. There is a 1-second pause between sends (`BROADCAST_THROTTLE_MS`); with many groups, prefer a longer interval.
- **Permissions inside the group.** Membership is not enough — the bot needs permission to post. Otherwise the group shows up in the list but fails at send time and appears in the report.
- **One group, one owner.** Whoever added the bot most recently owns the group.
- **Scheduler granularity.** Due work is checked every 15 seconds, so a run can be up to 15 seconds late.

## License

ISC
