"""
Adapter that captures asyncpg-style execute() / executemany() calls and renders
them as a single SQL string with values inlined.

Used by `scripts/generate_seed_sql.py` to produce a seed SQL blob that can be
sent through the Supabase MCP `execute_sql` tool when the asyncpg DATABASE_URL
is unavailable.

Only INSERT/UPDATE/DELETE-style writes are supported. Any read (fetch / fetchrow)
raises -- the seed must be pure-write to use this path.
"""
from __future__ import annotations

import datetime as dt
import re
import uuid
from contextlib import asynccontextmanager
from typing import Any, Iterable


_PARAM_RE = re.compile(r"\$(\d+)")
_UUID_RE = re.compile(
    r"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$",
    re.IGNORECASE,
)
_INSERT_VALUES_RE = re.compile(
    r"^\s*(INSERT\s+INTO\s+\S+\s*\([^)]+\))\s*VALUES\s*(\([^)]+\))\s*$",
    re.IGNORECASE | re.DOTALL,
)


def _looks_like_uuid(v: str) -> bool:
    return bool(_UUID_RE.match(v))


def _format_value(v: Any) -> str:
    if v is None:
        return "NULL"
    if isinstance(v, bool):
        return "TRUE" if v else "FALSE"
    if isinstance(v, (int, float)):
        return str(v)
    if isinstance(v, uuid.UUID):
        return f"'{v}'::uuid"
    if isinstance(v, dt.datetime):
        return f"'{v.isoformat()}'::timestamptz"
    if isinstance(v, dt.date):
        return f"'{v.isoformat()}'::date"
    if isinstance(v, str):
        if _looks_like_uuid(v):
            return f"'{v}'::uuid"
        escaped = v.replace("'", "''")
        return f"'{escaped}'"
    raise TypeError(f"Unsupported value type for SQL render: {type(v)!r}")


def _substitute(sql: str, args: tuple) -> str:
    def repl(m: re.Match[str]) -> str:
        idx = int(m.group(1)) - 1
        if idx >= len(args):
            raise ValueError(f"Missing argument for placeholder ${idx + 1} in SQL: {sql!r}")
        return _format_value(args[idx])

    return _PARAM_RE.sub(repl, sql)


def _collapse_insert_executemany(sql: str, rows: list[tuple]) -> str | None:
    """If sql is a simple INSERT ... VALUES (...) template, return one
    statement with all rows folded into a multi-row VALUES list."""
    m = _INSERT_VALUES_RE.match(sql)
    if not m:
        return None
    header, values_template = m.group(1), m.group(2)
    rendered_rows = [_substitute(values_template, tuple(row)) for row in rows]
    return f"{header} VALUES\n  " + ",\n  ".join(rendered_rows)


class SqlRenderConn:
    """Mock asyncpg.Connection that records statements as SQL strings."""

    def __init__(self) -> None:
        self.statements: list[str] = []

    @asynccontextmanager
    async def transaction(self):
        yield self

    async def execute(self, sql: str, *args: Any) -> None:
        self.statements.append(_substitute(sql.strip(), args))

    async def executemany(self, sql: str, rows: Iterable[tuple]) -> None:
        rows = list(rows)
        if not rows:
            return
        merged = _collapse_insert_executemany(sql.strip(), rows)
        if merged is not None:
            self.statements.append(merged)
        else:
            for row in rows:
                self.statements.append(_substitute(sql.strip(), tuple(row)))

    async def fetch(self, sql: str, *args: Any) -> list:
        raise RuntimeError("SqlRenderConn.fetch is not supported; seed must be pure-write.")

    async def fetchrow(self, sql: str, *args: Any):
        raise RuntimeError("SqlRenderConn.fetchrow is not supported; seed must be pure-write.")

    def render(self) -> str:
        return ";\n".join(self.statements) + ";\n"
