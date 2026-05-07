"""Diagnose the loaded DATABASE_URL without revealing the password."""
from __future__ import annotations

from urllib.parse import urlparse

from app.core.config import settings


def main() -> int:
    raw = settings.database_url
    print(f"Length: {len(raw)} chars")
    print(f"Starts with: {raw[:25]!r}")
    parsed = urlparse(raw.replace("postgresql+asyncpg://", "postgresql://"))
    print(f"  scheme:   {parsed.scheme}")
    print(f"  username: {parsed.username}")
    print(f"  has_password: {bool(parsed.password)}")
    print(f"  password length: {len(parsed.password) if parsed.password else 0}")
    print(f"  password starts: {(parsed.password or '')[:2]}...")
    print(f"  hostname: {parsed.hostname}")
    print(f"  port:     {parsed.port}")
    print(f"  path:     {parsed.path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
