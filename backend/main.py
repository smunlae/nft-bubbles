# SPDX-License-Identifier: GPL-3.0-or-later
# Copyright (c) 2025 Danila Novik & Heorhi Shtsivel


import os
import time
import requests
from typing import List, Dict, Any, Optional
from dotenv import load_dotenv

load_dotenv()


def get_api_key() -> str:
    api_key = os.getenv("OPENSEA_API_KEY")
    if api_key == "YOUR_API_KEY_HERE":
        raise SystemExit("Set your OpenSea API key in the OPENSEA_API_KEY environment variable or replace the placeholder.")
    return api_key


def make_session(api_key: str) -> requests.Session:
    s = requests.Session()
    s.headers.update({
        "Accept": "application/json",
        "X-API-KEY": api_key
    })
    return s


def fetch_collections(session: requests.Session,
                      chain: str = "base",
                      order_by: str = "market_cap",
                      page_limit: int = 100,
                      max_total: int = 1000,
                      pause: float = 0.25) -> List[Dict[str, Any]]:
    """
    Fetch up to `max_total` collections by paging the collections endpoint.
    Returns list of collection objects as returned by the API.
    """
    BASE_URL = "https://api.opensea.io/api/v2/collections"
    params = {
        "chain": chain,
        "order_by": order_by,
        "limit": page_limit
    }

    all_collections: List[Dict[str, Any]] = []
    next_cursor: Optional[str] = None
    backoff = 1.0

    while len(all_collections) < max_total:
        if next_cursor:
            params["cursor"] = next_cursor
        try:
            resp = session.get(BASE_URL, params=params, timeout=15)
        except requests.RequestException as e:
            print("Request failed:", e)
            break

        if resp.status_code == 429:
            # rate limited — exponential backoff
            time.sleep(backoff)
            backoff = min(backoff * 2, 60)
            continue

        resp.raise_for_status()
        data = resp.json()

        page_collections = data.get("collections") or data.get("results") or []
        if not page_collections:
            break

        all_collections.extend(page_collections)
        # stop if we've reached the cap
        if len(all_collections) >= max_total:
            all_collections = all_collections[:max_total]
            break

        # try to read cursor/next from known fields
        next_cursor = data.get("next") or data.get("cursor") or data.get("next_cursor") or data.get("continuation")
        if not next_cursor:
            break

        time.sleep(pause)

    return all_collections


def fetch_collection_stats(session: requests.Session,
                           collection_slug: str,
                           pause: float = 0.05,
                           max_retries: int = 4) -> Optional[Dict[str, Any]]:
    """
    Fetch stats for a single collection slug. Returns JSON dict or None on failure.
    """
    url = f"https://api.opensea.io/api/v2/collections/{collection_slug}/stats"
    backoff = 1.0
    for attempt in range(max_retries):
        try:
            resp = session.get(url, timeout=15)
        except requests.RequestException as e:
            print(f"Stats request failed for {collection_slug}: {e}")
            return None

        if resp.status_code == 429:
            time.sleep(backoff)
            backoff = min(backoff * 2, 60)
            continue

        try:
            resp.raise_for_status()
            return resp.json()
        except requests.HTTPError as e:
            print(f"HTTP error for {collection_slug}: {e} (status {resp.status_code})")
            # if client error (4xx) other than 429 — don't retry
            if 400 <= resp.status_code < 500 and resp.status_code != 429:
                return None
            time.sleep(backoff)
            backoff = min(backoff * 2, 60)

    # last attempt failed
    return None


def build_filtered_collections(session: requests.Session,
                               collections: List[Dict[str, Any]],
                               interval: str = "1d",
                               vol_thresh: float = 0.001,
                               mcap_thresh: float = 0.001,
                               max_results: int = 100) -> Dict[str, Dict[str, Any]]:
    """
    From `collections` list, fetch fresh stats and keep those passing thresholds **based only on the chosen interval**.
    Interval can be provided as "1d", "7d", "30d" or as API interval names "one_day", "seven_day", "thirty_day".
    We only use values that exist in the `intervals` array of the API response (do NOT use `total`).
    Filtering logic:
      - require interval.volume > vol_thresh
      - if interval.average_price exists, require average_price > mcap_thresh (otherwise ignore mcap_thresh)
    Returns a dict mapping slug -> stats_json.
    """
    filtered: Dict[str, Dict[str, Any]] = {}
    counter = 0

    # normalize input interval to API interval names
    interval_map = {
        "1d": "one_day",
        "1day": "one_day",
        "one_day": "one_day",
        "7d": "seven_day",
        "7day": "seven_day",
        "one_week": "seven_day",
        "seven_day": "seven_day",
        "30d": "thirty_day",
        "30day": "thirty_day",
        "thirty_day": "thirty_day"
    }
    target_interval = interval_map.get(interval.lower(), interval.lower())

    for collection in collections:
        collection_slug = collection.get("collection") or collection.get("slug") or collection.get("collection_slug")
        if not collection_slug:
            continue

        stats = fetch_collection_stats(session, collection_slug)
        if not stats:
            continue

        intervals = stats.get("intervals")
        if not isinstance(intervals, list):
            # no interval data — skip as per requirement to use only intervals
            continue

        # find the matching interval dict
        matched = None
        for it in intervals:
            if not isinstance(it, dict):
                continue
            if it.get("interval") == target_interval:
                matched = it
                break

        if not matched:
            # requested interval not present — skip
            continue

        # read required fields from the matched interval (only what actually exists)
        try:
            volume = float(matched.get("volume", 0.0))
        except (TypeError, ValueError):
            volume = 0.0

        avg_price_raw = matched.get("average_price")
        average_price: Optional[float]
        if avg_price_raw is None:
            average_price = None
        else:
            try:
                average_price = float(avg_price_raw)
            except (TypeError, ValueError):
                average_price = None

        # apply filters: must pass volume threshold; average_price must pass mcap_thresh if present
        if volume > vol_thresh and (average_price is None or average_price > mcap_thresh):
            filtered[collection_slug] = stats
            counter += 1
            print(f"Accepted {collection_slug}: interval={target_interval} volume={volume} average_price={average_price} ({counter}/{max_results})")
            if counter >= max_results:
                break

        time.sleep(0.05)

    return filtered



def main():
    api_key = get_api_key()
    session = make_session(api_key)

    # 1) fetch up to 1000 collections sorted by market cap
    print("Fetching collections...")
    all_collections = fetch_collections(session, chain="base", order_by="market_cap", page_limit=100, max_total=1000)
    print(f"Fetched {len(all_collections)} collections")

    # 2) enrich with fresh stats and filter
    print("Building filtered collection stats...")
    filtered_collections = build_filtered_collections(session, all_collections, interval="7d",
                                                      vol_thresh=0.001, mcap_thresh=0.001,
                                                      max_results=100)

    print(f"Filtered collections count: {len(filtered_collections)}")
    # safe access instead of direct indexing to avoid KeyError
    print("Sample 'hypio' entry (if exists):", filtered_collections.get("hypio"))

    # if you want to return or persist results you can do it here
    return filtered_collections


if __name__ == "__main__":
    main()
