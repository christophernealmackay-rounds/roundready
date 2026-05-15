"""
Thin async client around the Supabase PostgREST REST API.
Uses service_role_key which bypasses all RLS policies.

Connection reuse: the FastAPI lifespan installs a single shared
httpx.AsyncClient at startup and tears it down at shutdown
(see app.main.lifespan). get_db() yields that singleton so every
request reuses the same TCP+TLS connection pool — saving ~50ms
per round-trip on Windows where keep-alive caching is weaker.
"""
import httpx
from app.core.config import settings

REST_BASE = f"{settings.supabase_url}/rest/v1"
HEADERS = {
    "apikey": settings.supabase_service_role_key,
    "Authorization": f"Bearer {settings.supabase_service_role_key}",
    "Content-Type": "application/json",
}


def _make_client() -> httpx.AsyncClient:
    return httpx.AsyncClient(base_url=REST_BASE, headers=HEADERS, timeout=30.0)


_shared_client: httpx.AsyncClient | None = None


def set_shared_client(client: httpx.AsyncClient) -> None:
    global _shared_client
    _shared_client = client


async def close_shared_client() -> None:
    global _shared_client
    if _shared_client is not None:
        await _shared_client.aclose()
        _shared_client = None


async def get_db() -> httpx.AsyncClient:
    # Fast path: reuse the lifespan-managed singleton.
    if _shared_client is not None:
        yield _shared_client
        return
    # Fallback for callers that bypass the FastAPI lifespan
    # (ad-hoc scripts, isolated unit tests). Behaves like before.
    async with _make_client() as c:
        yield c


class DB:
    """Helper for PostgREST operations."""

    def __init__(self, client: httpx.AsyncClient):
        self._c = client

    async def select(self, table: str, params: dict | None = None) -> list[dict]:
        r = await self._c.get(f"/{table}", params=params or {})
        r.raise_for_status()
        return r.json()

    async def select_all(self, table: str, params: dict | None = None,
                          page_size: int = 1000) -> list[dict]:
        """Select that pages past PostgREST's max-rows cap (default 1000).

        Required for any table that can grow past 1000 rows — round_answers
        in particular, where 21 days of demo seed already overflows.
        """
        params = dict(params or {})
        # Caller-supplied limit takes precedence — they explicitly want a cap.
        if "limit" in params:
            return await self.select(table, params)
        all_rows: list[dict] = []
        offset = 0
        while True:
            page = await self.select(
                table,
                {**params, "limit": str(page_size), "offset": str(offset)},
            )
            all_rows.extend(page)
            if len(page) < page_size:
                break
            offset += page_size
        return all_rows

    async def insert(self, table: str, data: dict) -> dict:
        r = await self._c.post(
            f"/{table}",
            json=data,
            headers={"Prefer": "return=representation"},
        )
        r.raise_for_status()
        rows = r.json()
        return rows[0] if rows else data

    async def update(self, table: str, filters: dict, data: dict) -> dict:
        params = {k: f"eq.{v}" for k, v in filters.items()}
        r = await self._c.patch(
            f"/{table}",
            json=data,
            params=params,
            headers={"Prefer": "return=representation"},
        )
        r.raise_for_status()
        rows = r.json()
        return rows[0] if rows else {}

    async def delete(self, table: str, filters: dict) -> None:
        params = {k: f"eq.{v}" for k, v in filters.items()}
        r = await self._c.delete(f"/{table}", params=params)
        r.raise_for_status()

    async def delete_all(self, table: str) -> None:
        """Delete all rows (used for seed reset). Requires neq trick."""
        r = await self._c.delete(
            f"/{table}",
            params={"id": "neq.00000000-0000-0000-0000-000000000000"},
        )
        r.raise_for_status()
