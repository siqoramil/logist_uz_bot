# Logistic Telegram Bot

Ko‘p foydalanuvchili logistika bot. Har bir foydalanuvchi o‘z telefon raqami
orqali dostupni tasdiqlaydi, botni o‘z guruhlariga qo‘shadi va o‘z xabarini
sozlaydi. Foydalanuvchilarning xabari, guruhlari va yuborish holati bir-biridan
alohida saqlanadi.

Bot xabarni Telegram Bot API orqali, botning o‘z nomidan yuboradi. Shaxsiy yoki
job account, Telegram StringSession, `api_id` va `api_hash` kerak emas.

## Foydalanuvchi oqimi

1. Admin panelda mijozning ism-familiyasi va telefon raqamiga bir oylik dostup beradi.
   Telegram username ixtiyoriy va tasdiqlashda ishlatilmaydi.
2. Foydalanuvchi botda `/start` bosadi va bot so‘ragan tugma bilan o‘z Telegram
   kontaktini yuboradi.
3. Telefon raqami aktiv dostup bilan mos kelsa, foydalanuvchi bot menyusiga kiradi.
4. Foydalanuvchi botni kerakli guruhlarga qo‘shib, unga xabar yuborish huquqini beradi.
5. Foydalanuvchi xabarini yozadi va tarqatishni boshlaydi. Bot xabarni darhol,
   keyin har 60 daqiqada faqat shu foydalanuvchiga tegishli guruhlarga yuboradi.

Dostup bo‘lmasa bot bir oylik narx `100 000 so‘m` ekanini ko‘rsatadi va
`@siqoramil` bilan bog‘lanishni so‘raydi.

## Sozlash

`.env.example` dan `.env` yarating va quyidagilarni kiriting:

```dotenv
BOT_TOKEN=BotFather_token
MONGODB_URI=mongodb://app_user:strong_password@mongo-host:27017/logistic_bot?authSource=logistic_bot

ADMIN_USERNAME=admin@example.com
ADMIN_PASSWORD=replace_with_a_strong_initial_password
ADMIN_PORT=3000
ADMIN_ORIGIN=https://admin.example.com
ADMIN_CONTACT=@siqoramil
```

## Ishga tushirish

```bash
yarn install
yarn dev
```

Production:

```bash
yarn build
yarn start
```

`yarn start` va Docker image `dist/index.js` Bot API multi-user rejimini ishga
tushiradi.

## Bot buyruqlari

- `/start` — dostupni tekshirish va botni ishga tushirish
- `/menu` — bosh menyu
- `/status` — foydalanuvchining joriy holati
- `/language` — tilni tanlash
- `/help` — yordam

Bot guruhga qo‘shilganda uni qo‘shgan foydalanuvchining aktiv dostupi tekshiriladi.
Dostup bo‘lmasa bot guruhni tark etadi. Dostup muddati tugasa tarqatish avtomatik
to‘xtatiladi.

## Tekshirish

```bash
yarn build
```

MongoDB ishlayotgan muhitda to‘liq persistence/scheduler smoke testi:

```bash
yarn smoke
```
