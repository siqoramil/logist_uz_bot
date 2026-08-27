# Logistic Multi-Account Sender

Har bir foydalanuvchi botga o‘z job accountidan yozadi. Bot xabarni aynan shu
job account a’zo bo‘lgan barcha guruhlarga yuboradi va har 60 daqiqada takrorlaydi.
Shaxsiy Telegram account bu oqimda qatnashmaydi.

## Ishlash tartibi

1. Job account boshqaruvchi botga matn yuboradi.
2. Bot `ctx.from.id` orqali aynan shu job accountning Telegram sessionini tanlaydi.
3. Job account o‘zi a’zo bo‘lgan guruhlarni Telegram API orqali oladi.
4. Xabar darhol yuboriladi va keyingi yuborish 60 daqiqaga rejalashtiriladi.
5. Bot progress va yakuniy xatolar hisobotini UZ/RU/EN tilida ko‘rsatadi.

Har job accountning tarqatishi, locki, sozlamasi va hisoboti alohida. Turli job
accountlar parallel ishlashi mumkin. `/cancel` faqat buyruq yuborgan job
accountning joriy va rejalashtirilgan tarqatishini to‘xtatadi.

## Sozlash

`telegram-bot/.env` ichiga quyidagilarni qo‘shing:

```dotenv
BOT_TOKEN=BotFather_token
TELEGRAM_API_ID=my_telegram_org_api_id
TELEGRAM_API_HASH=my_telegram_org_api_hash
TELEGRAM_ACCOUNT_SESSIONS={"123456789":"first_private_string_session","987654321":"second_private_string_session"}
BROADCAST_INTERVAL_MINUTES=60

ACCOUNT_SEND_CONCURRENCY=10
ACCOUNT_MAX_FLOOD_WAIT_SECONDS=300
ADMIN_USERNAME=admin@example.com
ADMIN_PASSWORD=replace_with_a_strong_initial_password
ADMIN_PORT=3000
MONGODB_URI=mongodb://app_user:strong_password@mongo-host:27017/logistic_bot?authSource=logistic_bot
REDIS_PASSWORD=replace_with_strong_password
REDIS_URL=redis://:replace_with_strong_password@redis-host:6379
REDIS_BROADCAST_LOCK_TTL_MS=60000
```

Lokal MongoDB va Redis'ni ishga tushirish:

```bash
yarn infra:up
```

Productionda `MONGODB_URI` va `REDIS_URL` ni boshqariladigan, autentifikatsiyali servis URL'lariga almashtiring. MongoDB user/access/analytics va til sozlamalarini saqlaydi. Redis broadcast lock va oxirgi hisobotni saqlaydi.

`TELEGRAM_API_ID` va `TELEGRAM_API_HASH` [my.telegram.org/apps](https://my.telegram.org/apps) orqali olinadi.

Har bir job account uchun session yaratish:

```bash
yarn session
```

Telefon, Telegram kodi va kerak bo‘lsa 2FA parol kiritiladi. Skript job
accountning Telegram IDsi bilan JSON entry chiqaradi. Barcha entrylarni bitta
`TELEGRAM_ACCOUNT_SESSIONS` JSON objectiga birlashtiring. JSON keyidagi ID
session ichidagi account IDsi bilan mos kelmasa bot sessionni ishlatmaydi.

Session accountga to‘liq kirish huquqini beradi: uni parol kabi maxfiy saqlang,
Git’ga commit qilmang va loglarga chiqarmang.

Eski bitta-account konfiguratsiyasi `CONTROLLER_USER_ID` va session aynan bitta
job accountga tegishli bo‘lsa backward-compatible:

```dotenv
CONTROLLER_USER_ID=123456789
TELEGRAM_ACCOUNT_SESSION=private_string_session
```

## Ishga tushirish

```bash
yarn dev
```

Production:

```bash
yarn build
yarn start
```

Eski Bot API orqali guruhlarni kuzatadigan rejim vaqtincha saqlangan va kerak
bo‘lsa `yarn dev:legacy` bilan ishga tushadi.

## Bot buyruqlari

- `/start` — holat va qisqa ko‘rsatma
- `/groups` — ishchi accountdagi guruhlar soni
- `/cancel` — shu job accountning joriy va rejalashtirilgan tarqatishini to‘xtatish
- `/help` — yordam

Admin panelda ruxsat berilgan va `TELEGRAM_ACCOUNT_SESSIONS` ichida sessioni
sozlangan job accountlargina botni ishlata oladi. Hozircha faqat matnli xabar
qo‘llab-quvvatlanadi.

## Telegram limitlari

Har job account o‘z guruhlariga `ACCOUNT_SEND_CONCURRENCY` bo‘yicha parallel
yuboradi. Telegram `FLOOD_WAIT` qaytarsa, faqat o‘sha account ruxsat etilgan
vaqtgacha kutadi; bir job accountdagi lock yoki hisobot boshqasiga ta’sir qilmaydi.

Telegram API’dan flooding yoki spam uchun foydalanish accountning butunlay bloklanishiga olib kelishi mumkin. Faqat xabar olishga rozilik bergan ishchi guruhlardan foydalaning.

## Tekshirish

```bash
yarn build
yarn smoke:account
```
