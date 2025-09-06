# Base NFT Bubbles — Next.js + D3 + Base MiniKit

Interactive bubble chart that visualizes **24h floor price changes** for NFT collections on **Base**.  
Built with **Next.js (App Router, TypeScript)**, **D3** for physics/bubbles, and **Base MiniKit** so the app can be launched as a **Farcaster Mini App**.

---

## Features
- Bubble chart: circle **size = |24h % change|**, **color** (green = up, red = down), label shows name + floor (ETH).
- Mocked data (easy to swap with a real API).
- MiniKit integration (`MiniKitProvider`, `useMiniKit`, `setFrameReady`) for Farcaster launch.
- Responsive layout, TypeScript-first.
- Minimal code structure, easy to extend.

---

## Requirements
- **Node.js 18+** (LTS recommended) and **npm**.
- An editor (VS Code recommended).
- For MiniKit in production: a **CDP Client API Key** from Coinbase Developer Platform.

---

## Quick Start
Unzip or clone the project, then:

```bash
npm i
cp .env.local.example .env.local   # or create .env.local manually
npm run dev
# open http://localhost:3000
```

### Scripts
```bash
npm run dev    # development server
npm run build  # production build
npm start      # run built app (after build)
```

---

## Environment Variables (`.env.local`)

Minimal setup for local dev:
```dotenv
NEXT_PUBLIC_ONCHAINKIT_PROJECT_NAME=Base NFT Bubbles
NEXT_PUBLIC_URL=http://localhost:3000
NEXT_PUBLIC_ONCHAINKIT_API_KEY=YOUR_CDP_CLIENT_API_KEY
```

Optional (for Farcaster catalog & richer previews):
```dotenv
FARCASTER_HEADER=
FARCASTER_PAYLOAD=
FARCASTER_SIGNATURE=

# Optional visuals/metadata for frames & OG previews
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

> **Tip:** On first run you can leave a dummy API key. For production and Farcaster catalog you should use a real key and fill the Farcaster association fields.

---

## Where to Change the Data
The mock dataset lives in `app/page.tsx`:
```ts
type Coll = { name: string; floorEth: number; change24hPct: number; link?: string };
const DATA: Coll[] = [ /* ... */ ];
```
You can:
- Replace the array with your own values, or
- Fetch from an external API and pass that array to `<BubbleChart data={...} />`.

`components/BubbleChart.tsx` is pure presentational logic and does not depend on the data source.

---

## MiniKit / Farcaster Integration
Already wired:
- `providers/MiniKitProvider.tsx` wraps the app with `MiniKitProvider`.
- `app/page.tsx` uses `useMiniKit()` and calls `setFrameReady()`.
- `app/layout.tsx` sets **`fc:frame`** metadata to show a “Launch” button in Farcaster.
- `/.well-known/farcaster.json` route serves the app **manifest**.

Steps to go live as a Mini App:
1. Obtain your **CDP Client API Key** (Coinbase Dev Platform) and put it in `.env.local` as `NEXT_PUBLIC_ONCHAINKIT_API_KEY`.
2. (Optional, for catalog) Generate Farcaster association values:
   ```bash
   npx create-onchain --manifest
   ```
   Copy `FARCASTER_HEADER`, `FARCASTER_PAYLOAD`, `FARCASTER_SIGNATURE` to `.env.local`.
3. Deploy to a public HTTPS URL and set `NEXT_PUBLIC_URL` accordingly.
4. Verify `https://<your-domain>/.well-known/farcaster.json` returns your manifest.
5. Share/cast your link; the “Launch” button should appear.

---

## Project Structure
```
app/
  .well-known/farcaster.json/route.ts  # Farcaster manifest endpoint
  api/webhook/route.ts                 # optional webhook stub
  globals.css
  layout.tsx                           # fc:frame metadata + provider
  page.tsx                             # page with mock data + setFrameReady
components/
  BubbleChart.tsx                      # D3 force bubbles
providers/
  MiniKitProvider.tsx                  # MiniKit provider (Base chain)
.env.local.example
```

---

## Deployment (Vercel / Netlify / etc.)
- Import the repo and set the **same environment variables** in the hosting dashboard.
- Ensure `NEXT_PUBLIC_URL` is set to your final HTTPS domain (used in manifest and frame metadata).
- For Vercel, no extra config is necessary for the App Router setup.

---

## Troubleshooting
**1) `Module not found: Package path ./minikit is not exported from @coinbase/onchainkit`**  
Use a recent OnchainKit:
```bash
npm i @coinbase/onchainkit@latest
npm i wagmi@^2 viem@^2
```
Restart `npm run dev` afterwards.

**2) Port 3000 is busy**  
- Windows PowerShell:
  ```powershell
  netstat -ano | findstr :3000
  taskkill /PID <PID> /F
  ```
- macOS/Linux:
  ```bash
  lsof -i :3000
  kill -9 <PID>
  ```

**3) Bubbles appear off-center**  
Use the latest `components/BubbleChart.tsx` included here (it centers via `left/top: calc(50% + x - r)` and clamps nodes by **actual stage width**). If you customized the container widths, ensure the ResizeObserver measures the same element you render into.

---

## License
GPL-3.0
