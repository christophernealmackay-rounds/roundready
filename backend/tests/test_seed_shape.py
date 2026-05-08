"""
Seed-shape contract test: assert the database matches the canonical demo
shape (run after `make demo-reset`). These counts come from the seed_data
spec in the plan file.

Counts are asserted with `>=` instead of `==` because the suite is run
against a live Supabase project that demos and Playwright sessions also
touch — extra rows are normal, missing rows are the failure mode.
"""
from __future__ import annotations

import asyncpg

from app.core.config import settings
from app.db.asyncpg_pool import _normalize_dsn


async def _connect_with_retry(retries: int = 3) -> asyncpg.Connection:
    """Supabase pgbouncer occasionally rejects auth on rapid reconnects;
    retry a couple of times before giving up."""
    import asyncio

    last_exc: Exception | None = None
    for i in range(retries):
        try:
            return await asyncpg.connect(
                _normalize_dsn(settings.database_url),
                ssl="require",
                statement_cache_size=0,  # pgbouncer transaction mode requirement
            )
        except asyncpg.exceptions.InvalidPasswordError as e:
            last_exc = e
            await asyncio.sleep(0.5 * (i + 1))
    raise last_exc  # type: ignore[misc]


async def _count(table: str, where: str = "") -> int:
    conn = await _connect_with_retry()
    try:
        sql = f"SELECT COUNT(*)::int FROM {table}"
        if where:
            sql += f" WHERE {where}"
        return await conn.fetchval(sql)
    finally:
        await conn.close()


class TestSeedShape:
    async def test_departments(self):
        # Seed inserts 14 named departments. Custom dept rows added via the
        # Settings UI inflate this count, so use >=.
        assert await _count("departments") >= 14

    async def test_users(self):
        assert await _count("users") >= 8
        assert await _count("users", "role = 'admin'") >= 1
        assert await _count("users", "role = 'angel'") >= 5
        assert await _count("users", "role = 'charge_nurse'") >= 1
        assert await _count("users", "role = 'viewer'") >= 1

    async def test_angels(self):
        assert await _count("angels") >= 5

    async def test_residents(self):
        # Add Resident UI / pytest test_round_submit_creates_issues_per_issue_on_rule
        # paths can add residents; at least the seeded 20 must be present.
        assert await _count("residents") >= 20
        assert await _count("residents", "status = 'active'") >= 20

    async def test_resident_groups(self):
        assert await _count("resident_groups", "type = 'wing'") == 3
        # All 20 seeded residents are in exactly one wing; custom adds keep
        # the >=20 invariant.
        assert await _count("resident_group_memberships") >= 20

    async def test_qapis(self):
        # Demo flows can archive the active QAPI; assert active+archived ≥ 4.
        active = await _count("qapis", "status = 'active'")
        archived = await _count("qapis", "status = 'archived'")
        assert active + archived >= 4
        assert archived >= 3

    async def test_qapi_items(self):
        # 3 active items + 5 archived items at seed; custom additions inflate.
        assert await _count("qapi_items") >= 8

    async def test_questions(self):
        # 25 seeded; UI adds inflate.
        assert await _count("questions") >= 25
        assert await _count("questions", "in_repository = true") >= 25

    async def test_round_templates(self):
        # Seed has 1 active angel + 1 archived rapid. Demos may create more.
        assert await _count("round_templates") >= 2
        assert await _count("round_templates", "type = 'angel' AND active = true") >= 1
        assert await _count("round_templates", "type = 'rapid' AND archived_at IS NOT NULL") >= 1

    async def test_rounds(self):
        # ~85% of 21 days × 20 residents = ~357. Allow window.
        n = await _count("rounds")
        assert 250 <= n <= 420

    async def test_round_answers(self):
        n = await _count("round_answers")
        assert n >= 3000  # ~5000 expected

    async def test_issues(self):
        # Seed inserts exactly 30, but live demos may add more after a reset
        # (Playwright runs, manual rounds). Require at least the seed baseline
        # and that the resolved-vs-open ratio is sensible.
        total = await _count("issues")
        open_count = await _count("issues", "status = 'open'")
        resolved = await _count("issues", "status = 'resolved'")
        assert total >= 30
        assert open_count >= 10
        assert resolved >= 20
        assert open_count + resolved == total

    async def test_issue_notifications(self):
        # At least one notification per issue
        n = await _count("issue_notifications")
        assert n >= 30

    async def test_qaa_notes(self):
        assert await _count("qaa_notes") == 1
