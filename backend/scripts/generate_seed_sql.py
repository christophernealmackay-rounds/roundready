"""
Generate the demo seed as a single SQL string with rolling dates baked in.

Usage:
    python -m scripts.generate_seed_sql              # writes to db/seed_render.sql
    python -m scripts.generate_seed_sql <path>       # writes to <path>
"""
from __future__ import annotations

import asyncio
import sys
from pathlib import Path

from app.seed.seed_data import run_seed
from app.seed.sql_render import SqlRenderConn


_DEFAULT_PATH = Path(__file__).resolve().parent.parent.parent / "db" / "seed_render.sql"


async def _main() -> int:
    out_path = Path(sys.argv[1]) if len(sys.argv) > 1 else _DEFAULT_PATH
    conn = SqlRenderConn()
    summary = await run_seed(conn)
    out_path.write_text(conn.render(), encoding="utf-8")
    print(f"Wrote {out_path} ({out_path.stat().st_size:,} bytes)")
    print("Seed summary:")
    for k, v in summary.items():
        print(f"  {k}: {v}")
    return 0


if __name__ == "__main__":
    sys.exit(asyncio.run(_main()))
