# Logistic Account Sender

Bitta boshqaruvchi Telegram bot orqali maxsus ishchi Telegram accountdagi barcha guruhlarga matn tarqatadi.

## Ishlash tartibi

1. Admin boshqaruvchi botga matn yuboradi.
2. Ishchi account o‘zi a’zo bo‘lgan guruhlarni Telegram API orqali oladi.
3. Xabar guruhlarga ketma-ket, xavfsiz pauza bilan yuboriladi.
4. Bot progress va yakuniy xatolar hisobotini UZ/RU/EN tilida ko‘rsatadi.

Bir vaqtning o‘zida ikkinchi tarqatish boshlanmaydi. Joriy ishni `/cancel` orqali to‘xtatish mumkin.

## Sozlash

`telegram-bot/.env` ichiga quyidagilarni qo‘shing:

```dotenv
BOT_TOKEN=BotFather_token
CONTROLLER_USER_ID=admin_telegram_numeric_id
TELEGRAM_API_ID=my_telegram_org_api_id
TELEGRAM_API_HASH=my_telegram_org_api_hash
TELEGRAM_ACCOUNT_SESSION=private_string_session

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

Session yaratish:

```bash
yarn session
```

Telefon, Telegram kodi va kerak bo‘lsa 2FA parol kiritiladi. Chiqqan qiymatni `TELEGRAM_ACCOUNT_SESSION` ga yozing. Session accountga to‘liq kirish huquqini beradi: uni parol kabi maxfiy saqlang va Git’ga commit qilmang.

## Ishga tushirish

```bash
yarn dev
```

Production:

```bash
yarn build
yarn start
```

Eski multi-user bot vaqtincha saqlangan va kerak bo‘lsa `yarn dev:legacy` bilan ishga tushadi.

## Bot buyruqlari

- `/start` — holat va qisqa ko‘rsatma
- `/groups` — ishchi accountdagi guruhlar soni
- `/cancel` — joriy tarqatishni to‘xtatish
- `/help` — yordam

Faqat `CONTROLLER_USER_ID` egasi botni boshqara oladi. Hozircha faqat matnli xabar qo‘llab-quvvatlanadi.

## Telegram limitlari

Xabarlar barcha guruhlarga `ACCOUNT_SEND_CONCURRENCY` bo‘yicha parallel yuboriladi. Telegram `FLOOD_WAIT` qaytarsa, dastur ruxsat etilgan vaqtgacha kutadi; account cheklansa tarqatishni to‘xtatadi.

Telegram API’dan flooding yoki spam uchun foydalanish accountning butunlay bloklanishiga olib kelishi mumkin. Faqat xabar olishga rozilik bergan ishchi guruhlardan foydalaning.

## Tekshirish

```bash
yarn build
yarn smoke:account
```
