# Base NFT Bubbles – Project Documentation

## Overview

**Base NFT Bubbles** is a full-stack application that visualizes 24‑hour, 7‑day, or 30‑day floor‑price changes for NFT collections on the Base network.  
The project combines:

- **Next.js (App Router, TypeScript)** for the front-end.
- **D3.js** to render interactive bubble charts.
- **Coinbase OnchainKit MiniKit** to run as a Farcaster Mini App.
- A **FastAPI** backend with helper utilities for fetching and filtering NFT collection data from OpenSea.
- A periodic scheduler that archives floor prices into a CSV file.

## Repository Structure

```
nft-bubbles/
│
├─ app/                       # Next.js application (App Router)
│  ├─ api/                    # API routes for the front-end
│  ├─ globals.css             # Global styles
│  ├─ layout.tsx              # Root layout + MiniKit provider
│  ├─ logo.png                # App logo asset
│  └─ page.tsx                # Main page with mock/CSV-driven data
│
├─ backend/                   # Python utilities & API wrapper
│  ├─ api.py                  # FastAPI server exposing helper functions
│  ├─ opensea_tools.py        # Core OpenSea helpers (fetch/filter/save)
│  ├─ scheduler.py            # Async scheduler that logs floor prices
│  └─ filtered_collections.csv# Sample output CSV consumed by front-end
│
├─ components/
│  └─ BubbleChart.tsx         # D3-based bubble chart component
│
├─ providers/
│  └─ MiniKitProvider.tsx     # Context provider wrapping MiniKit
│
├─ public/
│  └─ .well-known/farcaster.json # Farcaster Mini App manifest
│
├─ types/                     # Minimal type declarations for D3
├─ package.json               # Node dependencies and scripts
├─ tsconfig.json              # TypeScript configuration
└─ README.md                  # Quick start & high-level instructions
```

## Front-End (Next.js)

### Key Files

- **`app/layout.tsx`**  
  - Configures global metadata, including `fc:frame` tags for Farcaster.  
  - Wraps the app in `MiniKitContextProvider`.

- **`app/page.tsx`**  
  - Fetches NFT collection data via `/api/collections`.  
  - Offers range buttons (day/week/month) to re-fetch data.  
  - Renders the `<BubbleChart>` component.

- **`components/BubbleChart.tsx`**  
  - Uses D3 forces to layout bubbles whose size represents `|24h change|`.  
  - Hovering shows a tooltip with sparkline and floor price info.  
  - Bubble color indicates direction (green = up, red = down).

- **`providers/MiniKitProvider.tsx`**  
  - Supplies `MiniKitProvider` with an API key, enabling Farcaster Mini App launch.

- **`app/api/collections/route.ts`**  
  - Reads `backend/filtered_collections.csv` on each request.  
  - Parses CSV into JSON objects expected by `<BubbleChart>`.

### Environment Variables

Put these in `.env.local` for local development:

```dotenv
NEXT_PUBLIC_ONCHAINKIT_PROJECT_NAME=Base NFT Bubbles
NEXT_PUBLIC_URL=http://localhost:3000
NEXT_PUBLIC_ONCHAINKIT_API_KEY=YOUR_CDP_CLIENT_API_KEY
```

Optional variables (for Farcaster catalog and richer previews) follow the same names shown in `README.md`.

### Running the Front-End

```bash
npm install
npm run dev
# open http://localhost:3000
```

Available scripts (`package.json`):

- `npm run dev` – start development server.
- `npm run build` – build for production.
- `npm start` – run the built app.

## Backend Utilities (Python)

> Located in `backend/`.

### `opensea_tools.py`

A toolkit for interacting with the OpenSea API:

1. **Authentication & Session Management**
   - `get_api_key()` loads the `OPENSEA_API_KEY` from environment.
   - `make_session(api_key)` returns a `requests.Session` configured with the API key.

2. **Data Retrieval**
   - `fetch_collections(...)` – pages through OpenSea collections, respecting rate limits.
   - `fetch_collection_stats(session, slug)` – obtains detailed stats for a single collection.

3. **Filtering**
   - `build_filtered_collections(...)` – fetches stats for each collection and retains only those that pass specified volume and average-price thresholds for a target interval (`1d`, `7d`, `30d`).

4. **Persistence**
   - `save_filtered_collections_csv(all_collections, filtered_collections, filename)` – writes a CSV with columns `collection_slug`, `general_info` (stringified JSON), and `stats` (stringified JSON).

5. **`main()`**
   - Demonstrates a full pipeline: fetch collections → build filtered stats → save results to CSV.

### `api.py` (FastAPI Server)

Wraps the helper functions and exposes them as HTTP endpoints:

- `GET /health` – simple health check.
- `GET /collections` – fetch collections based on query params.
- `GET /collections/{slug}/stats` – fetch stats for a specific collection.
- `POST /filter` – fetch or accept collections, then return filtered stats.
- `POST /save_csv` – persist filtered results to CSV.
- `GET /download/{filename}` – download a file produced by `save_csv`.
- `POST /run_pipeline` – convenience endpoint that runs the entire fetch/filter/save pipeline.
- On startup, launches `scheduler_loop` in the background (see below).

**Running the API**

```bash
pip install fastapi uvicorn python-multipart
uvicorn api:app --reload --port 8000
```

### `scheduler.py`

Asynchronous loop that periodically records floor prices:

- Uses `fetch_collections` and `fetch_collection_stats` to gather current floors.
- Writes rows `[timestamp_utc, collection_slug, floor_price]` into `floor_prices.csv`.
- Schedule interval (`interval_seconds`), list of slugs, and maximum slugs can be customized.
- Ensures CSV header exists before writing.

## Data Flow

1. **Backend (Python)**  
   - `opensea_tools.py` fetches and filters NFT collection data from OpenSea.
   - `save_filtered_collections_csv` writes results into `backend/filtered_collections.csv`.
   - `api.py` can automate these steps and optionally run them on a schedule.

2. **Front-End (Next.js)**  
   - `/api/collections` API route reads `backend/filtered_collections.csv` and transforms it into chart-ready JSON.
   - `page.tsx` fetches this JSON and renders the bubbles.
   - `BubbleChart.tsx` displays interactive bubbles that react to user hover and window size.

3. **Deployment**  
   - Any static hosting (Vercel, Netlify) works for the front-end.  
   - The backend FastAPI app can run on a separate service (e.g., Railway, Render, Docker container).  
   - Both parts must share environment variables (especially `NEXT_PUBLIC_URL` and `OPENSEA_API_KEY`).  
   - `public/.well-known/farcaster.json` provides the required manifest for Farcaster Mini Apps.

## Deployment & Farcaster Notes

1. **Farcaster Mini App**
   - Manifest: `public/.well-known/farcaster.json`.
   - Requires `NEXT_PUBLIC_URL` to be set to your public HTTPS domain.
   - To publish in the Farcaster catalog, set `FARCASTER_HEADER`, `FARCASTER_PAYLOAD`, and `FARCASTER_SIGNATURE` in the environment and ensure the manifest is reachable.

2. **Production Tips**
   - Use real API keys for OpenSea and Coinbase OnchainKit.
   - Restrict CORS in `api.py` once deployed.
   - Consider persisting data to a database instead of CSV for scalable deployments.
   - Use a process manager or service (systemd, Docker, etc.) to keep the FastAPI server and scheduler running.

## Troubleshooting

Common issues and fixes:

1. **`Module not found: Package path ./minikit is not exported from @coinbase/onchainkit`**  
   - Install latest OnchainKit + dependencies:
     ```bash
     npm i @coinbase/onchainkit@latest wagmi@^2 viem@^2
     ```

2. **Port 3000 in use**  
   - Windows:
     ```powershell
     netstat -ano | findstr :3000
     taskkill /PID <PID> /F
     ```
   - macOS/Linux:
     ```bash
     lsof -i :3000
     kill -9 <PID>
     ```

3. **Bubbles misaligned or off-screen**  
   - Ensure you use the current `BubbleChart.tsx` implementation, which clamps node positions and updates radii on container resize.

## License

GNU General Public License v3.0 (GPL-3.0)  
See `LICENSE` for details.

---
*This document is derived from repository contents and can be saved as `PROJECT_DOCUMENTATION.md`.*
