# scheduler.py
import asyncio
import csv
import os
import datetime
from concurrent.futures import ThreadPoolExecutor
from typing import List, Optional


from opensea_tools import get_api_key, make_session, fetch_collections, fetch_collection_stats

CSV_PATH = "floor_prices.csv"

def ensure_csv_exists():
    if not os.path.exists(CSV_PATH):
        with open(CSV_PATH, "w", newline="") as f:
            writer = csv.writer(f)
            writer.writerow(["timestamp_utc", "collection_slug", "floor_price"])  # header

def append_rows(rows: List[List]):
    """Append rows to CSV (rows = [[ts, slug, floor], ...])"""
    ensure_csv_exists()
    # Небольшая защита: открываем и дописываем в атомарном режиме
    with open(CSV_PATH, "a", newline="") as f:
        writer = csv.writer(f)
        writer.writerows(rows)

def fetch_floor_for_slugs(session, slugs: List[str]):
    rows = []
    now = datetime.datetime.utcnow().replace(microsecond=0).isoformat()  # UTC ISO
    for slug in slugs:
        try:
            stats = fetch_collection_stats(session, slug)
            floor = None
            if stats is None:
                floor = None
            else:
                floor = stats.get("floor_price")
                if floor is None:
                    floor = stats.get("stats", {}).get("floor_price") if isinstance(stats, dict) else None
                if floor is not None:
                    try:
                        floor = float(floor)
                    except Exception:
                        floor = None
        except Exception as e:
            # не ломаем цикл на одной ошибке
            print(f"[scheduler] error fetching {slug}: {e}")
            floor = None

        rows.append([now, slug, floor])
    return rows

async def scheduler_loop(interval_seconds: int = 3600, slugs: Optional[List[str]] = None, limit_slugs: Optional[int] = 200):
    api_key = get_api_key()
    session = make_session(api_key)
    executor = ThreadPoolExecutor(max_workers=4)

    # Ensure CSV has header
    ensure_csv_exists()

    loop = asyncio.get_event_loop()
    while True:
        try:
            if slugs is None:
                cols = await loop.run_in_executor(executor, fetch_collections, session, "base", "market_cap", 100, limit_slugs)
                slugs_list = [c.get("slug") for c in cols if c.get("slug")]
            else:
                slugs_list = slugs

            rows = await loop.run_in_executor(executor, fetch_floor_for_slugs, session, slugs_list)

            await loop.run_in_executor(executor, append_rows, rows)

            print(f"[scheduler] wrote {len(rows)} rows at {datetime.datetime.utcnow().isoformat()}")

        except Exception as e:
            print(f"[scheduler] top-level error: {e}")

        # Ждём интервал
        await asyncio.sleep(interval_seconds)
