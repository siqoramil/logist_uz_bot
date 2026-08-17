# Logistic Bot

Ko'p foydalanuvchili Telegram bot — har bir foydalanuvchi o'z xabarini, o'z guruhlarini va o'z intervalini sozlaydi, bot esa belgilangan vaqtda avtomatik tarqatib turadi.

> Tillar: **🇺🇿 O'zbekcha** · [🇷🇺 Русский](./README.ru.md) · [🇬🇧 English](./README.en.md)

## Qanday ishlaydi

1. Foydalanuvchi botga `/start` yozadi.
2. Botni o'z guruhlariga qo'shadi — guruh avtomatik ro'yxatga tushadi.
3. Botda xabar matnini va intervalni belgilaydi.
4. ▶️ **Boshlash** — bot shu foydalanuvchining guruhlariga belgilangan davrda yuborib turadi.

> ⚠️ **Muhim:** Telegram Bot API'da "mening guruhlarim" degan metod yo'q. Shuning uchun bot **faqat o'zi qo'shilgan** guruhlarni biladi. Har bir guruhga botni qo'lda qo'shish kerak, va guruhda unga xabar yuborish ruxsati berilgan bo'lishi shart.

## Xususiyatlari

- 👥 **Ko'p foydalanuvchili** — har kimning xabari, guruhlari va intervali alohida. Botni kim guruhga qo'shgan bo'lsa, o'sha guruh o'shanikiga biriktiriladi.
- 🎛 **Telegram ichida boshqarish** — inline tugmalar: xabar, interval, guruhlar ro'yxati, hoziroq yuborish, start/stop.
- ⏱ **Moslashuvchan interval** — 5 daqiqadan 24 soatgacha. Tayyor tugmalar yoki qo'lda son kiritish.
- 🧹 **Avtomatik tozalash** — bot guruhdan chiqarilsa yoki yozish taqiqlansa, guruh ro'yxatdan o'zi olib tashlanadi.
- 📊 **Hisobot** — har tarqatishdan keyin nechta yuborildi/xato bo'ldi, qaysi guruhda nima xato — shaxsiy chatga keladi.
- 🔁 **Ishonchli rejalashtirish** — keyingi vaqt yuborishdan **oldin** yoziladi, shuning uchun nosozlik bir siklni cheksiz takrorlashga olib kelmaydi.

## Texnologiyalar

| Komponent | Versiya |
| --------- | ------- |
| Node.js + TypeScript | 24 / 6.x |
| [grammY](https://grammy.dev/) | 1.45.x |
| MongoDB + mongoose | 8 / 9.x |
| tsx | 4.x |

## Arxitektura

Hexagonal (ports & adapters). Bog'liqlik yo'nalishi doim ichkariga qarab:

```
presentation  →  use-cases  →  ports  ←  infrastructure
                     ↓
                  domain
```

- **domain** — sof biznes tushunchalari (`Subscriber`, `ManagedChat`, `BroadcastResult`), tashqi kutubxonalarga bog'liq emas.
- **ports** — interfeyslar (`SubscriberRepository`, `ChatRepository`, `Broadcaster`, `Logger`).
- **use-cases** — biznes stsenariylari. Faqat portlarga tayanadi.
- **infrastructure** — portlarning amaliy adapterlari (Mongo, grammY, scheduler).
- **presentation** — Telegram handlerlari va matnlar.

Shu sababli Telegram'ni testda soxta `Broadcaster` bilan almashtirish mumkin — `scripts/smoke.ts` aynan shuni qiladi.

## Loyiha strukturasi

```
src/
├── main.ts                                  # bootstrap: DI, scheduler, bot start
├── constants.ts                             # throttle, interval chegaralari, tick
├── domain/
│   ├── subscriber.ts                        # foydalanuvchi sozlamalari
│   ├── managed-chat.ts                      # bot qo'shilgan guruh
│   ├── broadcast-result.ts                  # yuborish natijasi
│   ├── errors.ts
│   └── guard.ts                             # validatsiya
├── ports/
│   ├── subscriber-repository.ts
│   ├── chat-repository.ts
│   ├── broadcaster.ts
│   └── logger.ts
├── use-cases/
│   ├── manage-subscriber.ts                 # xabar, interval, start/stop
│   ├── track-chat.ts                        # guruh qo'shildi/chiqarildi
│   ├── broadcast-for-subscriber.ts          # bitta foydalanuvchi uchun tarqatish
│   └── run-due-broadcasts.ts                # vaqti kelganlarni topib yuborish
├── infrastructure/
│   ├── env-config.ts                        # .env validatsiyasi
│   ├── mongo.ts
│   ├── mongo-subscriber-repository.ts
│   ├── mongo-chat-repository.ts
│   ├── grammy-broadcaster.ts                # sendMessage + xato tasnifi
│   ├── scheduler.ts                         # ustma-ust tushmaydigan tick
│   └── console-logger.ts
└── presentation/
    ├── bot.ts                               # grammY handlerlari, menyu
    └── texts.ts                             # barcha o'zbekcha matnlar

scripts/
└── smoke.ts                                 # Mongo'ga qarshi integratsiya testi
```

## O'rnatish

```bash
git clone <repo>
cd Logistic-Bot
yarn install
```

## Sozlash

### 1. Bot yaratish

Telegram'da [@BotFather](https://t.me/BotFather) → `/newbot` → nom va username bering → tokenni oling.

### 2. `.env` tayyorlash

```bash
cp .env.example .env
```

| O'zgaruvchi | Majburiy | Tavsif |
| ----------- | -------- | ------ |
| `BOT_TOKEN` | ✅ | @BotFather bergan token |
| `MONGODB_URI` | ✅ | MongoDB ulanish satri |
| `BROADCAST_INTERVAL_MINUTES` | ❌ | Yangi foydalanuvchilar uchun standart interval (5..1440, standart 60) |
| `MONGO_ROOT_USER` / `MONGO_ROOT_PASSWORD` / `MONGO_DB` | ✅ (Docker uchun) | Mongo containerini ko'tarish uchun |
| `REDIS_PASSWORD` / `REDIS_URL` | ❌ | Hozircha kodda ishlatilmaydi |

## Ishga tushirish

### Docker bilan

```bash
docker compose up -d mongo    # faqat baza
yarn dev                      # bot host mashinada
```

Yoki hammasi containerda:

```bash
docker compose up -d
```

Bot endi interaktiv emas — TTY kerak emas, `-d` bilan bemalol ishlaydi.

### Lokal

```bash
yarn dev        # ishlab chiqish (tsx)
yarn dev:watch  # o'zgarishlarni kuzatib qayta ishga tushirish

yarn build      # production build
yarn start
```

## Foydalanish

`/start` bosgach shunday panel chiqadi:

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

Buyruqlar: `/start`, `/menu`, `/status`, `/help`.

Xabarni o'zgartirish uchun 📝 bosib yangi matnni yuborasiz. Interval uchun tayyor tugmalar (15/30/60/120/240/480) yoki sonni yozib yuborish.

## Ma'lumotlar modeli

**`subscribers`** — foydalanuvchi sozlamalari:

| Maydon | Tavsif |
| ------ | ------ |
| `userId` | Telegram user ID (unique) |
| `message` | Tarqatiladigan matn |
| `intervalMinutes` | Davr |
| `active` | Ishlayaptimi |
| `state` | `idle` / `awaiting-message` / `awaiting-interval` |
| `nextRunAt` | Keyingi yuborish vaqti (indexed) |
| `lastRunAt` | Oxirgi yuborish |

**`managedchats`** — bot qo'shilgan guruhlar:

| Maydon | Tavsif |
| ------ | ------ |
| `chatId` | Guruh ID (unique) |
| `ownerId` | Botni qo'shgan foydalanuvchi |
| `title` | Guruh nomi |
| `active` | Bot hali guruhdami |

## Test

```bash
yarn smoke
```

Haqiqiy MongoDB'ga qarshi 30 ta tekshiruv o'tkazadi, Telegram o'rniga soxta `Broadcaster` ishlatiladi: ro'yxatga olish, guruh qo'shish/chiqarish/qayta qo'shish, validatsiya, `findDue` tanlovi, o'lik guruhni tozalash, scheduler qayta rejalashtirishi, stop. Test o'z ma'lumotlarini oxirida tozalaydi.

## Diqqat qaratish kerak

- **Botni har bir guruhga qo'lda qo'shish kerak.** Bot API guruhlar ro'yxatini bermaydi — bu Telegram cheklovi, kod kamchiligi emas.
- **Spam chegaralari.** Bir xil matnni ko'p guruhga takror yuborish Telegram tomonidan cheklanishi mumkin. Yuborishlar orasida 1 soniya pauza bor (`BROADCAST_THROTTLE_MS`), lekin guruh ko'p bo'lsa intervalni kattaroq oling.
- **Guruhdagi ruxsat.** Bot guruhga qo'shilgani yetarli emas — unga xabar yuborish ruxsati berilgan bo'lishi kerak. Aks holda ro'yxatda ko'rinadi, lekin yuborishda xato beradi va hisobotda ko'rsatiladi.
- **Bir guruh — bir egasi.** Botni guruhga kim oxirgi qo'shgan bo'lsa, guruh o'shanga biriktiriladi.
- **Scheduler aniqligi.** Tekshiruv har 15 soniyada bo'ladi, shuning uchun yuborish belgilangan vaqtdan 15 soniyagacha kechikishi mumkin.

## Litsenziya

ISC
