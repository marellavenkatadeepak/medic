import os
import httpx
from dotenv import load_dotenv

load_dotenv()

INSFORGE_BASE_URL = os.getenv("INSFORGE_BASE_URL", "")
INSFORGE_SERVICE_KEY = os.getenv("INSFORGE_SERVICE_KEY", "")


def _headers():
    return {
        "apikey": INSFORGE_SERVICE_KEY,
        "Authorization": f"Bearer {INSFORGE_SERVICE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "return=representation",
    }


async def db_insert(table: str, payload: dict) -> dict:
    """Insert a row into an InsForge (PostgREST) table and return the created record."""
    url = f"{INSFORGE_BASE_URL}/api/database/records/{table}"
    # InsForge requires the payload to be an array even for single inserts
    payload_list = [payload]
    
    # We must add Prefer: return=representation if not already present
    headers = _headers()
    headers["Prefer"] = "return=representation"

    async with httpx.AsyncClient() as client:
        resp = await client.post(url, json=payload_list, headers=headers)
        resp.raise_for_status()
        data = resp.json()
        return data[0] if getattr(data, '__iter__', False) and len(data) > 0 else data


async def db_select(table: str, filters: dict = None, order: str = None, limit: int = None, select: str = "*") -> list:
    """Select rows from an InsForge (PostgREST) table."""
    url = f"{INSFORGE_BASE_URL}/api/database/records/{table}"
    params = {"select": select}
    if filters:
        params.update({f"{k}": f"eq.{v}" for k, v in filters.items()})
    if order:
        params["order"] = order
    if limit:
        params["limit"] = str(limit)

    async with httpx.AsyncClient() as client:
        resp = await client.get(url, params=params, headers=_headers())
        resp.raise_for_status()
        return resp.json()


async def db_select_single(table: str, filters: dict = None, select: str = "*", order: str = None) -> dict | None:
    """Select a single row. Returns None if not found."""
    rows = await db_select(table, filters=filters, order=order, limit=1, select=select)
    return rows[0] if rows else None


async def db_update(table: str, row_id: str, payload: dict) -> dict:
    """Update a row by id in an InsForge (PostgREST) table."""
    url = f"{INSFORGE_BASE_URL}/api/database/records/{table}"
    params = {"id": f"eq.{row_id}"}
    
    headers = _headers()
    headers["Prefer"] = "return=representation"

    async with httpx.AsyncClient() as client:
        resp = await client.patch(url, json=payload, params=params, headers=headers)
        if not resp.is_success:
            raise Exception(f"Database update failed with {resp.status_code}: {resp.text}")
        data = resp.json()
        # the response should be an array according to the docs
        if isinstance(data, list) and len(data) > 0:
            return data[0]
        return data


async def db_delete(table: str, row_id: str) -> None:
    """Delete a row by id from an InsForge (PostgREST) table."""
    url = f"{INSFORGE_BASE_URL}/api/database/records/{table}"
    params = {"id": f"eq.{row_id}"}
    async with httpx.AsyncClient() as client:
        resp = await client.delete(url, params=params, headers=_headers())
        resp.raise_for_status()
