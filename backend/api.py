"""
FastAPI wrapper for your existing OpenSea helper functions.

Place this file in the same folder as your original script and name the original file
`opensea_tools.py` (or adjust the import below). The API *does not modify* your
existing functions — it only imports and exposes them as HTTP endpoints.

Run:
    pip install fastapi uvicorn python-multipart
    uvicorn api_fastapi:app --reload --port 8000

Security / notes:
 - This example uses CORS allowing all origins for convenience. Restrict origins for production.
 - OPENSEA_API_KEY should be set in environment (you already have dotenv in your module).
 - The endpoints return JSON and may save CSV files into the current working directory.
"""
from typing import List, Dict, Any, Optional
from fastapi import FastAPI, HTTPException, Query, Body
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel
import os
import uvicorn
import asyncio
from scheduler import scheduler_loop

# Adjust this import name to the filename where your original functions live.
# Example: if your original script is saved as `opensea_tools.py`, leave as-is.
# If it's called `main.py`, change import accordingly.
try:
    from opensea_tools import (
        get_api_key,
        make_session,
        fetch_collections,
        fetch_collection_stats,
        build_filtered_collections,
        save_filtered_collections_csv,
    )
except Exception as e:
    raise ImportError(
        "Failed to import functions from opensea_tools. Make sure your original file is named 'opensea_tools.py' and located in the same directory.\n"
        f"Original import error: {e}"
    )

app = FastAPI(title="OpenSea Tools API", version="0.1")

# Allow frontend from any origin during development. Lock this down in production.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class FilterRequest(BaseModel):
    # If `collections` is not provided, the server will fetch collections using fetch_collections().
    collections: Optional[List[Dict[str, Any]]] = None
    # fetch_collections settings (used only when collections is None)
    chain: Optional[str] = "base"
    order_by: Optional[str] = "market_cap"
    page_limit: Optional[int] = 100
    max_total: Optional[int] = 100

    # Filtering params for build_filtered_collections
    interval: Optional[str] = "7d"
    vol_thresh: Optional[float] = 0.001
    mcap_thresh: Optional[float] = 0.001
    max_results: Optional[int] = 100


class SaveCsvRequest(BaseModel):
    all_collections: List[Dict[str, Any]]
    filtered_collections: Dict[str, Dict[str, Any]]
    filename: Optional[str] = "filtered_collections.csv"


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/collections")
def api_fetch_collections(
        chain: str = Query("base"),
        order_by: str = Query("market_cap"),
        page_limit: int = Query(100, ge=1, le=500),
        max_total: int = Query(100, ge=1, le=5000),
):
    """Fetch collections (wraps fetch_collections).

    Returns list of collections as JSON.
    """
    try:
        api_key = get_api_key()
        session = make_session(api_key)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create session: {e}")

    try:
        cols = fetch_collections(session, chain=chain, order_by=order_by, page_limit=page_limit, max_total=max_total)
        return {"count": len(cols), "collections": cols}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/collections/{collection_slug}/stats")
def api_collection_stats(collection_slug: str):
    """Fetch stats for a specific collection slug.

    Returns the raw stats JSON or 404 if not found.
    """
    try:
        api_key = get_api_key()
        session = make_session(api_key)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create session: {e}")

    stats = fetch_collection_stats(session, collection_slug)
    if stats is None:
        raise HTTPException(status_code=404, detail=f"Stats not available for {collection_slug}")
    return stats


@app.post("/filter")
def api_filter_collections(payload: FilterRequest = Body(...)):
    """Build filtered collections. If `collections` not provided, the server fetches collections first.

    Returns mapping slug -> stats (the same format build_filtered_collections returns).
    """
    try:
        api_key = get_api_key()
        session = make_session(api_key)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create session: {e}")

    collections = payload.collections
    if collections is None:
        # fetch collections using provided fetch params
        try:
            collections = fetch_collections(
                session,
                chain=payload.chain or "base",
                order_by=payload.order_by or "market_cap",
                page_limit=payload.page_limit or 100,
                max_total=payload.max_total or 100,
            )
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to fetch collections: {e}")

    try:
        filtered = build_filtered_collections(
            session,
            collections,
            interval=payload.interval or "7d",
            vol_thresh=payload.vol_thresh or 0.001,
            mcap_thresh=payload.mcap_thresh or 0.001,
            max_results=payload.max_results or 100,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Filtering failed: {e}")

    return {"count": len(filtered), "filtered": filtered}


@app.post("/save_csv")
def api_save_csv(payload: SaveCsvRequest = Body(...)):
    """Save filtered collections to CSV using your existing save_filtered_collections_csv.

    Returns {"ok": True, "filename": "..."} and the file will be written to the server cwd.
    """
    filename = payload.filename or "filtered_collections.csv"
    try:
        save_filtered_collections_csv(payload.all_collections, payload.filtered_collections, filename=filename)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save CSV: {e}")

    if not os.path.exists(filename):
        raise HTTPException(status_code=500, detail=f"CSV was not created: {filename}")

    return {"ok": True, "filename": filename}


@app.get("/download/{filename}")
def download_file(filename: str):
    """Download a previously saved CSV (or any file in the working directory).

    Be careful with directory traversal in production — this simple example does not enforce strict protections.
    """
    safe_path = os.path.abspath(filename)
    cwd = os.path.abspath(os.getcwd())
    if not safe_path.startswith(cwd):
        raise HTTPException(status_code=403, detail="Access forbidden")
    if not os.path.exists(safe_path):
        raise HTTPException(status_code=404, detail="File not found")
    return FileResponse(safe_path, media_type='text/csv', filename=os.path.basename(safe_path))


# Optional: a convenience endpoint to run the full main() pipeline once (fetch -> filter -> save)
@app.post("/run_pipeline")
def run_pipeline(
        interval: str = Body("7d"),
        vol_thresh: float = Body(0.001),
        mcap_thresh: float = Body(0.001),
        max_results: int = Body(10),
        filename: str = Body("filtered_collections.csv"),
):
    """Run the typical pipeline: fetch collections, filter, save CSV.

    This is a convenience wrapper around your main() logic.
    """
    try:
        api_key = get_api_key()
        session = make_session(api_key)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create session: {e}")

    try:
        all_collections = fetch_collections(session, chain="base", order_by="market_cap", page_limit=100, max_total=100)
        filtered = build_filtered_collections(session, all_collections, interval=interval, vol_thresh=vol_thresh, mcap_thresh=mcap_thresh, max_results=max_results)
        save_filtered_collections_csv(all_collections, filtered, filename=filename)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Pipeline failed: {e}")

    return {"ok": True, "count_all": len(all_collections), "count_filtered": len(filtered), "filename": filename}

@app.on_event("startup")
async def start_scheduler_task():
    task = asyncio.create_task(scheduler_loop(interval_seconds=3600, slugs=None, limit_slugs=100))
    app.state.scheduler_task = task

if __name__ == "__main__":
    uvicorn.run("api:app", host="127.0.0.1", port=8000, reload=True)
