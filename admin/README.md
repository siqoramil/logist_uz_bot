# Logistic Bot CRM

Botdan foydalanish ruxsatlarini boshqaradigan admin panel.

## Stack

- React 19 + TypeScript + Vite
- Zustand — login sessiyasi
- TanStack React Query — API cache va mutationlar
- Tailwind CSS 4 — UI
- i18next + react-i18next — ruscha va inglizcha interfeys
- Feature-Sliced Design va `@app`, `@pages`, `@widgets`, `@features`, `@entities`, `@shared` aliaslari

## Ishga tushirish

Avval `telegram-bot` backendini ishga tushiring. Uning admin API porti standart holatda `3000`.

```bash
yarn install
yarn dev
```

Panel: `http://localhost:5173`. Vite `/api` so'rovlarini `http://localhost:3000` ga proxy qiladi.

Standart til — ruscha. `RU / EN` almashtirgichi orqali tanlangan til brauzerda saqlanadi.

Production build:

```bash
yarn build
yarn preview
```

Docker bilan bot papkasidan hamma servis birga ishga tushadi:

```bash
cd ../telegram-bot
cp .env.example .env
docker compose up -d --build
```

CRM: `http://localhost:8080`.

## FSD tuzilma

```text
src/
├── app/        # provider va global style
├── pages/      # dashboard sahifasi
├── widgets/    # statistika va ruxsatlar jadvali
├── features/   # login, qo'shish, bloklash, o'chirish
├── entities/   # access grant va session modellari
└── shared/     # API client va umumiy UI
```
