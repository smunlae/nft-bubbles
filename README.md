
# Base NFT Bubbles (Next.js + MiniKit)

Bubble‑визуализация суточных изменений флора NFT на **Base** + интеграция **Base MiniKit** для запуска как Farcaster Mini App.

## Требования
- **Node.js 18+ (LTS)**. Проверка: `node -v`
- IDE: рекомендую **VS Code** (но можно WebStorm / любой редактор).
- Аккаунт в **Coinbase Developer Platform** (для API Key).

## Запуск локально
```bash
# установить зависимости
npm i

# создать файл .env.local (см. ниже)
cp .env.local.example .env.local   # или создайте вручную и заполните

# dev‑режим
npm run dev
# откройте http://localhost:3000
```

## Сборка и продакшн
```bash
npm run build
npm start
```

## Деплой (Vercel, Netlify и т.д.)
- Для Vercel: импортируйте репозиторий, задайте переменные окружения из `.env.local`, деплой.
- Важно: `NEXT_PUBLIC_URL` должен указывать на HTTPS‑URL вашего деплоя.

## Настройка MiniKit / Farcaster
1. Получите **CDP Client API Key** (Coinbase) и положите в `.env.local` как `NEXT_PUBLIC_ONCHAINKIT_API_KEY`.
2. Сгенерируйте значения Farcaster association (если нужно публиковаться в каталоге):
   ```bash
   npx create-onchain --manifest
   ```
   Затем перенесите `FARCASTER_HEADER`, `FARCASTER_PAYLOAD`, `FARCASTER_SIGNATURE` в `.env.local`.
3. Проверьте эндпоинт `/.well-known/farcaster.json` на вашем домене.
4. В `app/layout.tsx` есть `fc:frame`‑метаданные с кнопкой **Launch**.

## Где менять данные графика
Файл: `app/page.tsx` — массив `DATA`. Подставьте реальные значения (или подключите API) вида:
```ts
type Coll = { name: string; floorEth: number; change24hPct: number; link?: string };
```

## Структура
```
app/
  .well-known/farcaster.json/route.ts
  api/webhook/route.ts
  globals.css
  layout.tsx
  page.tsx
components/
  BubbleChart.tsx
providers/
  MiniKitProvider.tsx
```

## Переменные окружения (.env.local)
Скопируйте из примера и заполните:
```
NEXT_PUBLIC_ONCHAINKIT_PROJECT_NAME=Base NFT Bubbles
NEXT_PUBLIC_URL=http://localhost:3000

# Ключ из Coinbase Developer Platform:
NEXT_PUBLIC_ONCHAINKIT_API_KEY=your_cdp_client_api_key

# (опционально) для совместимости:
# NEXT_PUBLIC_CDP_CLIENT_API_KEY=your_cdp_client_api_key

# Farcaster association (опционально, для каталога/валидации):
FARCASTER_HEADER=base64_header
FARCASTER_PAYLOAD=base64_payload
FARCASTER_SIGNATURE=hex_signature

# Доп. поля (не обязательно):
NEXT_PUBLIC_APP_HERO_IMAGE=
NEXT_PUBLIC_APP_SPLASH_IMAGE=
NEXT_PUBLIC_SPLASH_BACKGROUND_COLOR=#0b0b0c
NEXT_PUBLIC_APP_ICON=
NEXT_PUBLIC_APP_PRIMARY_CATEGORY=social
NEXT_PUBLIC_APP_TAGLINE=NFT bubbles on Base
NEXT_PUBLIC_APP_OG_TITLE=Base NFT Bubbles
NEXT_PUBLIC_APP_OG_DESCRIPTION=24h change bubble chart
NEXT_PUBLIC_APP_OG_IMAGE=
```
