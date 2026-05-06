"""
Thin async client around the Supabase PostgREST REST API.
Uses service_role_key which bypasses all RLS policies.
"""
import os
from functools import lru_cache
from typing import Any
import httpx
from app.core.config import settings

REST_BASE = f"{settings.supabase_url}/rest/v1"
HEADERS = {
    "apikey": settings.supabase_service_role_key,
    "Authorization": f"Bearer {settings.supabase_service_role_key}",
    "Content-Type": "application/json",
}


def _client() -> httpx.AsyncClient:
    return httpx.AsyncClient(base_url=REST_BASE, headers=HEADERS, timeout=30.0)


async def get_db() -> httpx.AsyncClient:
    async with _client() as c:
        yield c


class DB:
    """Helper for PostgREST operations."""

    def __init__(self, client: httpx.AsyncClient):
        self._c = client

    async def select(self, table: str, params: dict | None = None) -> list[dict]:
        r = await self._c.get(f"/{table}", params=params or {})
        r.raise_for_status()
        return r.json()

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
