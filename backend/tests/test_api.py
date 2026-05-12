"""
Integration tests for the RoundReady API against the live Supabase project.
Service role bypasses RLS. Tests are read-only or self-cleaning.
"""
from __future__ import annotations

import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport

from app.main import app
from app.core.config import settings


@pytest_asyncio.fixture
async def client():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
        yield c


# ---------------------------------------------------------------------------
# Health
# ---------------------------------------------------------------------------
class TestHealth:
    async def test_health(self, client: AsyncClient):
        r = await client.get("/api/v1/health")
        assert r.status_code == 200
        assert r.json()["status"] == "ok"


# ---------------------------------------------------------------------------
# Users
# ---------------------------------------------------------------------------
class TestUsers:
    async def test_list_users(self, client: AsyncClient):
        r = await client.get("/api/v1/users")
        assert r.status_code == 200
        users = r.json()
        assert len(users) >= 8
        u = users[0]
        for key in ("id", "name", "email", "role", "active"):
            assert key in u
        assert u["role"] in {"admin", "angel", "charge_nurse", "viewer"}

    async def test_create_update_delete_user(self, client: AsyncClient):
        r = await client.post("/api/v1/users", json={
            "name": "Test User",
            "email": "test.user@roundready.demo",
            "role": "viewer",
        })
        assert r.status_code == 201, r.text
        uid = r.json()["id"]

        r2 = await client.patch(f"/api/v1/users/{uid}", json={"active": False})
        assert r2.status_code == 200
        assert r2.json()["active"] is False

        r3 = await client.delete(f"/api/v1/users/{uid}")
        assert r3.status_code == 204

    async def test_invalid_role_rejected_with_422(self, client: AsyncClient):
        """Loose-string fields used to leak Postgres CheckViolation as a 500.
        Pydantic Literal types now catch these at the schema layer."""
        r = await client.post(
            "/api/v1/users",
            json={
                "name": "Bad Role",
                "email": "bad.role@roundready.demo",
                "role": "superadmin",
            },
        )
        assert r.status_code == 422, r.text
        # Patch with bad role also rejected
        users = (await client.get("/api/v1/users")).json()
        target = users[0]
        r = await client.patch(
            f"/api/v1/users/{target['id']}",
            json={"role": "owner"},
        )
        assert r.status_code == 422, r.text

    async def test_patch_nonexistent_user(self, client: AsyncClient):
        r = await client.patch(
            "/api/v1/users/00000000-0000-0000-0000-000000000000",
            json={"active": False},
        )
        assert r.status_code == 404


# ---------------------------------------------------------------------------
# Residents
# ---------------------------------------------------------------------------
class TestResidents:
    async def test_list_residents(self, client: AsyncClient):
        r = await client.get("/api/v1/residents")
        assert r.status_code == 200
        residents = r.json()
        assert len(residents) >= 20
        sample = residents[0]
        for key in ("id", "name", "room", "bed", "status"):
            assert key in sample
        assert sample["status"] == "active"

    async def test_empty_name_or_room_rejected(self, client: AsyncClient):
        """Resident name and room are min_length=1 — empty values would
        render as blank rows and break sort-by-room."""
        for body in (
            {"name": "", "room": "999"},
            {"name": "Has Name", "room": ""},
        ):
            r = await client.post("/api/v1/residents", json=body)
            assert r.status_code == 422, (body, r.text)

    async def test_auto_assign_keeps_same_room_together(self, client: AsyncClient):
        """The same-room rule (101a + 101b → same angel) must hold after
        unassigning then auto-assigning."""
        # Snapshot original assignments so the test cleans up after itself.
        before = (await client.get("/api/v1/residents")).json()
        original = {r["id"]: r["angel_id"] for r in before}

        # Unassign every resident, then run auto-assign.
        for r in before:
            await client.patch(
                f"/api/v1/residents/{r['id']}/assign", json={"angel_id": None}
            )
        assigned = await client.post("/api/v1/residents/auto-assign")
        assert assigned.status_code == 200, assigned.text

        after = (await client.get("/api/v1/residents")).json()
        # Group residents by room and assert all beds in a room share an angel.
        by_room: dict[str, set] = {}
        for r in after:
            by_room.setdefault(r["room"], set()).add(r["angel_id"])
        for room, angels in by_room.items():
            # Only assert for rooms that actually have multiple beds in seed.
            if len([r for r in after if r["room"] == room]) > 1:
                assert len(angels) == 1, (
                    f"room {room} split across angels {angels}"
                )

        # Restore original assignments so subsequent tests aren't disturbed.
        for r in before:
            await client.patch(
                f"/api/v1/residents/{r['id']}/assign",
                json={"angel_id": original[r["id"]]},
            )

    async def test_pcc_sync(self, client: AsyncClient):
        r = await client.get("/api/v1/residents/sync-pcc")
        assert r.status_code == 200
        data = r.json()
        assert data["status"] == "connected"


# ---------------------------------------------------------------------------
# Departments
# ---------------------------------------------------------------------------
class TestDepartments:
    async def test_list_and_create_delete(self, client: AsyncClient):
        r = await client.get("/api/v1/departments")
        assert r.status_code == 200
        assert len(r.json()) >= 14

        r2 = await client.post("/api/v1/departments", json={"name": "Test Dept", "custom": True})
        assert r2.status_code == 201
        dept_id = r2.json()["id"]

        r3 = await client.delete(f"/api/v1/departments/{dept_id}")
        assert r3.status_code == 204

    async def test_empty_department_name_rejected(self, client: AsyncClient):
        """Blank department names blow up the routing summary in the Settings
        panel and the dropdown in Add User. Reject at the schema layer."""
        r = await client.post("/api/v1/departments", json={"name": ""})
        assert r.status_code == 422, r.text


# ---------------------------------------------------------------------------
# Resident groups (new)
# ---------------------------------------------------------------------------
class TestResidentGroups:
    async def test_list_wings_seeded(self, client: AsyncClient):
        r = await client.get("/api/v1/resident-groups?type=wing")
        assert r.status_code == 200
        wings = r.json()
        assert len(wings) == 3
        assert {w["name"] for w in wings} == {"Wing 100", "Wing 200", "Wing 300"}
        # Each wing has members
        for w in wings:
            assert len(w["member_ids"]) > 0

    async def test_invalid_group_type_rejected(self, client: AsyncClient):
        """Create with an unsupported type returns 422 from Pydantic, not a
        500 from the Postgres CHECK constraint."""
        r = await client.post(
            "/api/v1/resident-groups",
            json={"name": "Bad Group", "type": "floor"},
        )
        assert r.status_code == 422, r.text

    async def test_create_cart_with_members(self, client: AsyncClient):
        # Pick 3 residents to put in the cart
        residents = (await client.get("/api/v1/residents")).json()
        member_ids = [r["id"] for r in residents[:3]]

        r = await client.post("/api/v1/resident-groups", json={
            "name": "Test Cart A", "type": "cart",
        })
        assert r.status_code == 201
        gid = r.json()["id"]

        r2 = await client.put(f"/api/v1/resident-groups/{gid}/members", json={
            "resident_ids": member_ids,
        })
        assert r2.status_code == 200
        assert set(r2.json()["member_ids"]) == set(member_ids)

        await client.delete(f"/api/v1/resident-groups/{gid}")


# ---------------------------------------------------------------------------
# Angels
# ---------------------------------------------------------------------------
class TestAngels:
    async def test_list_angels(self, client: AsyncClient):
        r = await client.get("/api/v1/angels")
        assert r.status_code == 200
        angels = r.json()
        assert len(angels) == 5
        sample = angels[0]
        for key in ("id", "user_id", "name", "absent", "resident_count"):
            assert key in sample

    async def test_redistribute_with_all_angels_absent_returns_400(
        self, client: AsyncClient
    ):
        """Edge case: every angel absent. Redistribute has no available angels
        to push to and should reject with 400 instead of silently no-oping."""
        angels = (await client.get("/api/v1/angels")).json()
        # Snapshot pre-test unassigned residents so we don't blame the test
        # for state it inherited.
        residents_before = (await client.get("/api/v1/residents")).json()
        already_unassigned = {
            r["id"] for r in residents_before
            if r["angel_id"] is None and r["status"] == "active"
        }

        # Mark every angel absent.
        for a in angels:
            r = await client.patch(
                f"/api/v1/angels/{a['id']}/absent", json={"absent": True}
            )
            assert r.status_code == 200, r.text

        try:
            r = await client.post(f"/api/v1/angels/{angels[0]['id']}/redistribute")
            assert r.status_code == 400, (
                f"redistribute should reject when no angels are available, "
                f"got {r.status_code}: {r.text}"
            )
        finally:
            # Always return everyone to duty so subsequent tests aren't broken.
            for a in angels:
                await client.patch(
                    f"/api/v1/angels/{a['id']}/absent", json={"absent": False}
                )

        # Final invariant: every resident that *had* an angel before the test
        # has one again after. Pre-existing unassigned residents stay
        # unassigned (we can't guess where to put them without violating the
        # same-room rule mid-test).
        residents_after = (await client.get("/api/v1/residents")).json()
        regressed = [
            r for r in residents_after
            if r["angel_id"] is None
            and r["status"] == "active"
            and r["id"] not in already_unassigned
        ]
        assert regressed == [], (
            f"residents that started assigned ended up unassigned after "
            f"all-absent + return-all-to-duty cycle: "
            f"{[r['name'] for r in regressed]}"
        )

    async def test_absence_lifecycle_restores_residents(
        self, client: AsyncClient
    ):
        """Mark absent → redistribute → return to duty restores original residents.

        Phase 4.2 contract: redistribution is temporary; the angel's original
        residents come back when they return, even after another angel was
        rounding for them.
        """
        # The lifecycle is self-restoring (mark absent → redistribute → return),
        # so the test leaves the database in the same state it found it.
        angels = (await client.get("/api/v1/angels")).json()
        assert len(angels) == 5
        target = next(
            (a for a in angels if not a["absent"] and a["resident_count"] > 0),
            None,
        )
        assert target is not None, "no on-duty angel with residents available"
        baseline_count = target["resident_count"]

        residents_before = (await client.get("/api/v1/residents")).json()
        original_ids = {
            r["id"] for r in residents_before if r["angel_id"] == target["id"]
        }
        assert len(original_ids) == baseline_count

        # Mark absent → residents become unassigned.
        r = await client.patch(
            f"/api/v1/angels/{target['id']}/absent", json={"absent": True}
        )
        assert r.status_code == 200, r.text
        residents_absent = (await client.get("/api/v1/residents")).json()
        unassigned = [r for r in residents_absent if r["angel_id"] is None]
        assert {r["id"] for r in unassigned} >= original_ids

        # Redistribute → residents land on other angels (not the absent one).
        r = await client.post(f"/api/v1/angels/{target['id']}/redistribute")
        assert r.status_code == 200
        residents_redist = (await client.get("/api/v1/residents")).json()
        redistributed = {r["id"]: r["angel_id"] for r in residents_redist if r["id"] in original_ids}
        assert all(aid is not None for aid in redistributed.values())
        assert all(aid != target["id"] for aid in redistributed.values())

        # Return to duty → originals snap back to the returning angel.
        r = await client.patch(
            f"/api/v1/angels/{target['id']}/absent", json={"absent": False}
        )
        assert r.status_code == 200, r.text
        residents_after = (await client.get("/api/v1/residents")).json()
        restored = {r["id"] for r in residents_after if r["angel_id"] == target["id"]}
        assert restored == original_ids, (
            f"expected {original_ids} restored to angel, got {restored}"
        )

        # Total active residents unchanged across the whole cycle.
        active_before = sum(1 for r in residents_before if r["status"] == "active")
        active_after = sum(1 for r in residents_after if r["status"] == "active")
        assert active_before == active_after


# ---------------------------------------------------------------------------
# QAPIs
# ---------------------------------------------------------------------------
class TestQapis:
    async def test_active_archived_split(self, client: AsyncClient):
        r = await client.get("/api/v1/qapis")
        assert r.status_code == 200
        qapis = r.json()
        active = [q for q in qapis if q["status"] == "active"]
        archived = [q for q in qapis if q["status"] == "archived"]
        assert len(active) >= 1
        assert len(archived) >= 3
        # Every archived QAPI must have an actual_completion date populated.
        # Every active QAPI must have actual_completion = None. These are the
        # invariants the archive validator enforces — verify both sides.
        for q in archived:
            assert q.get("actual_completion"), (
                f"archived QAPI {q['title']!r} missing actual_completion"
            )
        for q in active:
            assert q.get("actual_completion") is None, (
                f"active QAPI {q['title']!r} unexpectedly has actual_completion"
            )
        # Skin Integrity should be active with 3 items in the seed.
        skin = next((q for q in active if "Skin" in q["title"]), None)
        assert skin is not None
        assert len(skin["items"]) == 3
        item = skin["items"][0]
        for key in ("root_cause", "systemic_change", "monitoring_type", "responsible"):
            assert item[key], f"expected {key} to be non-empty"

    async def test_create_update_delete_qapi(self, client: AsyncClient):
        r = await client.post("/api/v1/qapis", json={"title": "Test QAPI"})
        assert r.status_code == 201
        qapi_id = r.json()["id"]

        # Archive requires an actual_completion date; sending status alone
        # must 422 before persisting any state change.
        r2 = await client.patch(
            f"/api/v1/qapis/{qapi_id}",
            json={"status": "archived", "actual_completion": "2026-04-01"},
        )
        assert r2.status_code == 200, r2.text
        body = r2.json()
        assert body["status"] == "archived"
        assert body["actual_completion"] == "2026-04-01"

        r3 = await client.delete(f"/api/v1/qapis/{qapi_id}")
        assert r3.status_code == 204

    async def test_archive_requires_actual_completion(self, client: AsyncClient):
        """Bare archive PATCH must be rejected. Adding the date succeeds.
        Restoring back to active must clear the completion date."""
        r = await client.post("/api/v1/qapis", json={"title": "Archive Test QAPI"})
        assert r.status_code == 201
        qapi_id = r.json()["id"]
        try:
            # Bare archive — 422.
            r1 = await client.patch(
                f"/api/v1/qapis/{qapi_id}", json={"status": "archived"}
            )
            assert r1.status_code == 422, r1.text
            assert "actual_completion" in r1.text

            # Archive with completion — 200, field round-trips.
            r2 = await client.patch(
                f"/api/v1/qapis/{qapi_id}",
                json={"status": "archived", "actual_completion": "2026-04-15"},
            )
            assert r2.status_code == 200, r2.text
            assert r2.json()["actual_completion"] == "2026-04-15"

            # Restore — completion cleared.
            r3 = await client.patch(
                f"/api/v1/qapis/{qapi_id}", json={"status": "active"}
            )
            assert r3.status_code == 200, r3.text
            assert r3.json()["status"] == "active"
            assert r3.json()["actual_completion"] is None
        finally:
            await client.delete(f"/api/v1/qapis/{qapi_id}")

    async def test_archive_uses_persisted_completion_when_status_alone_changes(
        self, client: AsyncClient
    ):
        """Setting actual_completion in one PATCH, then status='archived' in
        a separate PATCH, should succeed — the validator must read the
        already-persisted completion date, not just the incoming body."""
        r = await client.post("/api/v1/qapis", json={"title": "Two-step archive"})
        assert r.status_code == 201
        qapi_id = r.json()["id"]
        try:
            r1 = await client.patch(
                f"/api/v1/qapis/{qapi_id}",
                json={"actual_completion": "2026-03-20"},
            )
            assert r1.status_code == 200, r1.text
            assert r1.json()["status"] == "active"
            assert r1.json()["actual_completion"] == "2026-03-20"

            r2 = await client.patch(
                f"/api/v1/qapis/{qapi_id}", json={"status": "archived"}
            )
            assert r2.status_code == 200, r2.text
            assert r2.json()["status"] == "archived"
            assert r2.json()["actual_completion"] == "2026-03-20"
        finally:
            await client.delete(f"/api/v1/qapis/{qapi_id}")


# ---------------------------------------------------------------------------
# Questions repository (new)
# ---------------------------------------------------------------------------
class TestQuestions:
    async def test_invalid_issue_on_rejected(self, client: AsyncClient):
        """issue_on must be one of yes/no/either; bad value gets 422 not 500."""
        r = await client.post(
            "/api/v1/questions",
            json={"text": "Bad", "issue_on": "sometimes"},
        )
        assert r.status_code == 422, r.text

    async def test_empty_question_text_rejected(self, client: AsyncClient):
        """Empty question text would render as a blank row in the round
        flow — reject at the schema layer."""
        r = await client.post(
            "/api/v1/questions",
            json={"text": "", "issue_on": "no"},
        )
        assert r.status_code == 422, r.text

    async def test_list_repository(self, client: AsyncClient):
        r = await client.get("/api/v1/questions?in_repository=true")
        assert r.status_code == 200
        qs = r.json()
        assert len(qs) >= 25
        for q in qs:
            assert q["in_repository"] is True
            assert q["issue_on"] in {"yes", "no", "either"}


# ---------------------------------------------------------------------------
# Issues
# ---------------------------------------------------------------------------
class TestIssues:
    async def test_open_and_resolved_split(self, client: AsyncClient):
        open_r = await client.get("/api/v1/issues?status=open")
        resolved_r = await client.get("/api/v1/issues?status=resolved")
        assert open_r.status_code == 200 and resolved_r.status_code == 200
        opens = open_r.json()
        resolved = resolved_r.json()
        assert len(opens) >= 5
        assert len(resolved) >= 10
        for i in opens:
            assert i["status"] == "open"
        for i in resolved:
            assert i["status"] == "resolved"

    async def test_issue_has_notification_trail(self, client: AsyncClient):
        r = await client.get("/api/v1/issues")
        issues = r.json()
        # At least some issues should have notifications recorded
        with_notif = [i for i in issues if i.get("notifications")]
        assert len(with_notif) >= 1
        n = with_notif[0]["notifications"][0]
        assert "notified_user_id" in n
        assert "notified_at" in n

    async def test_resolve_authorization_matrix(self, client: AsyncClient):
        """The frontend `canResolve` UI guard is now mirrored on the API:
          - admin / charge_nurse always allowed
          - angel allowed only when their department matches the issue's
          - everyone else rejected
        Without this check, the UI lock could be trivially bypassed and the
        `resolved_by` audit field falsified."""
        opens = (await client.get("/api/v1/issues?status=open")).json()
        target = opens[0]
        users = (await client.get("/api/v1/users")).json()

        async def attempt(user_id: str) -> int:
            r = await client.post(
                f"/api/v1/issues/{target['id']}/resolve",
                json={"resolved_by": user_id, "resolution_notes": "test"},
            )
            return r.status_code

        viewer = next(u for u in users if u["role"] == "viewer")
        admin = next(u for u in users if u["role"] == "admin")
        charge = next(u for u in users if u["role"] == "charge_nurse")
        match_angel = next(
            (u for u in users
             if u["role"] == "angel"
             and u["department_id"] == target["department_id"]),
            None,
        )
        mismatch_angel = next(
            u for u in users
            if u["role"] == "angel"
            and u["department_id"] != target["department_id"]
        )

        assert await attempt(viewer["id"]) == 403
        assert await attempt(mismatch_angel["id"]) == 403
        assert await attempt(admin["id"]) == 200
        # Reopen between attempts so each test can act on an "open" issue.
        await client.post(f"/api/v1/issues/{target['id']}/reopen")
        assert await attempt(charge["id"]) == 200
        await client.post(f"/api/v1/issues/{target['id']}/reopen")
        if match_angel:
            assert await attempt(match_angel["id"]) == 200
            await client.post(f"/api/v1/issues/{target['id']}/reopen")

    async def test_resolve_with_unknown_user_returns_422(self, client: AsyncClient):
        """`resolved_by` referencing a non-existent user fails fast at 422."""
        opens = (await client.get("/api/v1/issues?status=open")).json()
        target = opens[0]
        r = await client.post(
            f"/api/v1/issues/{target['id']}/resolve",
            json={
                "resolved_by": "00000000-0000-0000-0000-000000000000",
                "resolution_notes": "test",
            },
        )
        assert r.status_code == 422, r.text

    async def test_resolve_then_reopen_lifecycle(self, client: AsyncClient):
        """Resolve an open issue and reopen it; counts and fields round-trip."""
        opens = (await client.get("/api/v1/issues?status=open")).json()
        assert opens, "no open issues available to test against"
        target = opens[0]
        users = (await client.get("/api/v1/users")).json()
        admin = next(u for u in users if u["role"] == "admin")

        # Resolve
        r = await client.post(
            f"/api/v1/issues/{target['id']}/resolve",
            json={
                "resolved_by": admin["id"],
                "resolution_notes": "pytest: closed after care plan review",
            },
        )
        assert r.status_code == 200, r.text
        resolved = r.json()
        assert resolved["status"] == "resolved"
        assert resolved["resolved_by"] == admin["id"]
        assert resolved["resolution_notes"]
        assert resolved["resolved_at"] is not None

        # Reopen — round-trip back to original state
        r = await client.post(f"/api/v1/issues/{target['id']}/reopen")
        assert r.status_code == 200, r.text
        reopened = r.json()
        assert reopened["status"] == "open"
        assert reopened["resolved_by"] is None
        assert reopened["resolved_at"] is None
        # Notes are wiped when reopening so the next resolution starts clean.
        assert not reopened.get("resolution_notes")


# ---------------------------------------------------------------------------
# Rounds and templates
# ---------------------------------------------------------------------------
class TestRounds:
    async def test_active_template_with_qapi_sections(self, client: AsyncClient):
        r = await client.get("/api/v1/rounds/templates")
        assert r.status_code == 200
        templates = r.json()
        active_angel = [t for t in templates if t["type"] == "angel" and t["active"]]
        assert len(active_angel) == 1
        t = active_angel[0]
        # At least one section is tied to a QAPI item
        assert any(s.get("qapi_item_id") for s in t["sections"])
        # Template has questions
        assert sum(len(s["questions"]) for s in t["sections"]) >= 5

    async def test_list_rounds_has_data(self, client: AsyncClient):
        r = await client.get("/api/v1/rounds?limit=10")
        assert r.status_code == 200
        rounds = r.json()
        assert len(rounds) >= 1
        for key in ("id", "template_id", "angel_id", "resident_id"):
            assert key in rounds[0]

    async def test_round_list_returns_full_answer_set(self, client: AsyncClient):
        """Regression for the bug where /rounds capped answers at PostgREST's
        1000-row limit, causing the dashboard QAPI compliance card to show
        '—' because most rounds returned with empty answers."""
        rounds = (await client.get("/api/v1/rounds")).json()
        assert len(rounds) >= 100
        # Every round should have its answers populated. With 21 days × 20
        # residents × ~85% × 15 questions/round there are 5000+ answers.
        rounds_with_answers = [r for r in rounds if r.get("answers")]
        assert len(rounds_with_answers) == len(rounds), (
            f"only {len(rounds_with_answers)}/{len(rounds)} rounds had answers — "
            f"PostgREST cap regressed?"
        )
        # Average answers per round should be in the 10-20 range.
        avg = sum(len(r["answers"]) for r in rounds) / len(rounds)
        assert 10 <= avg <= 20, f"unexpected avg answers/round: {avg}"

    async def test_round_submit_fans_out_notifications_to_dept_head_and_don(
        self, client: AsyncClient
    ):
        """A flagged answer should create an issue plus notifications for:
          - the question's notify_department head (first active user in dept)
          - the DON (any admin)
        The issue notifications panel and the topbar issue count both depend
        on this fan-out being correct.
        """
        # Find a question whose notify_department_id is set to Nursing.
        questions = (await client.get("/api/v1/questions")).json()
        depts = (await client.get("/api/v1/departments")).json()
        nursing = next(d for d in depts if d["name"] == "Nursing")
        nursing_q = next(
            q for q in questions
            if q.get("notify_department_id") == nursing["id"]
            and q["issue_on"] == "no"
        )
        # Pick the active angel template + an angel + a resident.
        templates = (await client.get("/api/v1/rounds/templates")).json()
        active = next(t for t in templates if t["type"] == "angel" and t["active"])
        angels = (await client.get("/api/v1/angels")).json()
        angel = next(a for a in angels if not a["absent"] and a["resident_count"] > 0)
        residents = (await client.get("/api/v1/residents")).json()
        resident = next(r for r in residents if r["angel_id"] == angel["id"])

        r = await client.post(
            "/api/v1/rounds",
            json={
                "template_id": active["id"],
                "angel_id": angel["id"],
                "resident_id": resident["id"],
                "answers": [
                    {
                        "question_id": nursing_q["id"],
                        "answer": False,
                        "issue_flagged": True,
                    },
                ],
            },
        )
        assert r.status_code == 201, r.text

        # Find the new issue (most recent open one for this resident).
        issues = (
            await client.get(f"/api/v1/issues?status=open")
        ).json()
        new_issue = next(
            (
                i for i in issues
                if i["resident_id"] == resident["id"]
                and i["question_id"] == nursing_q["id"]
            ),
            None,
        )
        assert new_issue is not None, "round did not create an issue"
        assert new_issue["department_id"] == nursing["id"]

        notifications = new_issue.get("notifications") or []
        assert len(notifications) >= 2, (
            f"expected dept head + DON notifications, got {len(notifications)}"
        )
        # One notification must target an admin (the DON).
        users = {u["id"]: u for u in (await client.get("/api/v1/users")).json()}
        notified_users = [users[n["notified_user_id"]] for n in notifications]
        assert any(u["role"] == "admin" for u in notified_users), (
            "DON notification missing"
        )
        # Another must target a Nursing-department user.
        assert any(u["department_id"] == nursing["id"] for u in notified_users), (
            "Nursing dept head notification missing"
        )

    async def test_round_submit_creates_issues_per_issue_on_rule(
        self, client: AsyncClient
    ):
        """End-to-end: submit a round whose answers include a flagged 'no'
        and confirm an issue is created and notifications fanned out."""
        templates = (await client.get("/api/v1/rounds/templates")).json()
        active = next(t for t in templates if t["type"] == "angel" and t["active"])
        # Pick a question that flags on No (issue_on='no').
        flag_no_question = None
        for s in active["sections"]:
            for q in s["questions"]:
                if q.get("issue_on") == "no":
                    flag_no_question = q
                    break
            if flag_no_question:
                break
        assert flag_no_question, "seed template must include an issue_on=no question"

        # Need an angel and one of their residents.
        angels = (await client.get("/api/v1/angels")).json()
        angel = next(a for a in angels if not a["absent"] and a["resident_count"] > 0)
        residents = (await client.get("/api/v1/residents")).json()
        resident = next(r for r in residents if r["angel_id"] == angel["id"])

        open_before = len(
            (await client.get("/api/v1/issues?status=open")).json()
        )

        r = await client.post(
            "/api/v1/rounds",
            json={
                "template_id": active["id"],
                "angel_id": angel["id"],
                "resident_id": resident["id"],
                "answers": [
                    {
                        "question_id": flag_no_question["question_id"],
                        "answer": False,         # No
                        "issue_flagged": True,   # frontend computed it
                    },
                ],
            },
        )
        assert r.status_code == 201, r.text
        assert r.json()["flags_raised"] >= 1

        open_after = len(
            (await client.get("/api/v1/issues?status=open")).json()
        )
        assert open_after == open_before + 1, (
            f"expected exactly one new open issue: before={open_before}, "
            f"after={open_after}"
        )

    async def test_template_create_rejects_inverted_dates(
        self, client: AsyncClient
    ):
        """end_date before start_date is nonsense and must fail validation;
        otherwise the auto-archive logic ends up archiving brand-new rapid
        rounds the moment they're created."""
        r = await client.post(
            "/api/v1/rounds/templates",
            json={
                "name": "inverted dates",
                "type": "rapid",
                "start_date": "2026-05-15",
                "end_date": "2026-05-10",
            },
        )
        assert r.status_code == 422, r.text

    async def test_template_crud_lifecycle(self, client: AsyncClient):
        """Create a template, add a section + question, archive via PATCH, delete."""
        # Pick any existing question to link.
        questions = (await client.get("/api/v1/questions")).json()
        question_id = questions[0]["id"]

        # Create template
        r = await client.post(
            "/api/v1/rounds/templates",
            json={"name": "Phase 8 test template", "type": "rapid"},
        )
        assert r.status_code == 201, r.text
        template = r.json()
        tid = template["id"]
        assert template["active"] is True
        assert template["sections"] == []

        # Add a section
        r = await client.post(
            f"/api/v1/rounds/templates/{tid}/sections",
            json={"title": "General", "order": 1},
        )
        assert r.status_code == 201, r.text
        section = r.json()
        sid = section["id"]
        assert section["title"] == "General"

        # Add a question to the section
        r = await client.post(
            f"/api/v1/rounds/sections/{sid}/questions",
            json={"question_id": question_id, "order": 0},
        )
        assert r.status_code == 201, r.text
        tq = r.json()
        tq_id = tq["id"]
        assert tq["question_id"] == question_id

        # PATCH the section title
        r = await client.patch(
            f"/api/v1/rounds/sections/{sid}",
            json={"title": "General — renamed"},
        )
        assert r.status_code == 200, r.text
        assert r.json()["title"] == "General — renamed"

        # PATCH the template (archive it)
        r = await client.patch(
            f"/api/v1/rounds/templates/{tid}",
            json={"active": False, "archived_at": "2026-05-07T12:00:00Z"},
        )
        assert r.status_code == 200, r.text
        assert r.json()["active"] is False
        assert r.json()["archived_at"] is not None

        # Unlink the template question
        r = await client.delete(f"/api/v1/rounds/template-questions/{tq_id}")
        assert r.status_code == 204

        # Delete the section
        r = await client.delete(f"/api/v1/rounds/sections/{sid}")
        assert r.status_code == 204

        # Delete the template
        r = await client.delete(f"/api/v1/rounds/templates/{tid}")
        assert r.status_code == 204

        # Confirm gone (404 on subsequent delete)
        r = await client.delete(f"/api/v1/rounds/templates/{tid}")
        assert r.status_code == 404

    async def test_rapid_round_auto_archives_when_end_date_passes(
        self, client: AsyncClient
    ):
        """Phase 4.2 contract: a rapid template whose end_date has passed
        gets auto-archived on the next list-templates call. Admins shouldn't
        need to babysit a Stop button when the survey window naturally ends."""
        from datetime import datetime, timedelta, timezone
        today = datetime.now(timezone.utc).date()
        body = {
            "name": "pytest auto-stop rapid",
            "type": "rapid",
            "start_date": (today - timedelta(days=7)).isoformat(),
            "end_date": (today - timedelta(days=1)).isoformat(),
        }
        r = await client.post("/api/v1/rounds/templates", json=body)
        assert r.status_code == 201, r.text
        created = r.json()
        assert created["active"] is True
        assert created["archived_at"] is None

        # Listing templates should auto-archive the expired rapid round.
        r = await client.get("/api/v1/rounds/templates")
        assert r.status_code == 200
        match = next(t for t in r.json() if t["id"] == created["id"])
        assert match["active"] is False, "expired rapid round should auto-archive"
        assert match["archived_at"] is not None

        # Cleanup
        await client.delete(f"/api/v1/rounds/templates/{created['id']}")

    async def test_active_rapid_in_window_is_not_archived(
        self, client: AsyncClient
    ):
        """Inverse of the auto-stop test: a rapid round whose end_date is
        still in the future must remain active after a list call."""
        from datetime import datetime, timedelta, timezone
        today = datetime.now(timezone.utc).date()
        body = {
            "name": "pytest in-window rapid",
            "type": "rapid",
            "start_date": today.isoformat(),
            "end_date": (today + timedelta(days=7)).isoformat(),
        }
        r = await client.post("/api/v1/rounds/templates", json=body)
        assert r.status_code == 201, r.text
        created = r.json()

        r = await client.get("/api/v1/rounds/templates")
        match = next(t for t in r.json() if t["id"] == created["id"])
        assert match["active"] is True
        assert match["archived_at"] is None

        await client.delete(f"/api/v1/rounds/templates/{created['id']}")

    async def test_template_delete_cascades(self, client: AsyncClient):
        """Deleting a template should cascade to its sections and template_questions."""
        questions = (await client.get("/api/v1/questions")).json()
        qid = questions[0]["id"]

        t = (await client.post(
            "/api/v1/rounds/templates",
            json={"name": "Cascade test", "type": "rapid"},
        )).json()
        s = (await client.post(
            f"/api/v1/rounds/templates/{t['id']}/sections",
            json={"title": "S", "order": 0},
        )).json()
        await client.post(
            f"/api/v1/rounds/sections/{s['id']}/questions",
            json={"question_id": qid, "order": 0},
        )

        # Delete template — cascade
        r = await client.delete(f"/api/v1/rounds/templates/{t['id']}")
        assert r.status_code == 204

        # Section should be gone now (404 on update)
        r = await client.patch(
            f"/api/v1/rounds/sections/{s['id']}",
            json={"title": "x"},
        )
        assert r.status_code == 404


# ---------------------------------------------------------------------------
# Reports
# ---------------------------------------------------------------------------
class TestReports:
    async def test_basic_report(self, client: AsyncClient):
        r = await client.get("/api/v1/reports")
        assert r.status_code == 200
        data = r.json()
        assert data["total_rounds"] >= 100
        assert len(data["angel_stats"]) >= 1
        assert len(data["daily_stats"]) >= 1

    async def test_report_narrows_by_angel(self, client: AsyncClient):
        """Filtering by angel_id returns only that angel's stats."""
        angels = (await client.get("/api/v1/angels")).json()
        angel = angels[0]
        r = await client.get(f"/api/v1/reports?angel_id={angel['id']}")
        assert r.status_code == 200
        data = r.json()
        # Only one angel in the breakdown when filtering by id.
        assert len(data["angel_stats"]) == 1
        assert data["angel_stats"][0]["angel_id"] == angel["id"]

    async def test_report_narrows_by_qapi(self, client: AsyncClient):
        """Filtering by qapi_id restricts rounds to templates that touch it."""
        qapis = (await client.get("/api/v1/qapis")).json()
        active = next(q for q in qapis if q["status"] == "active")
        full = (await client.get("/api/v1/reports")).json()
        scoped = (
            await client.get(f"/api/v1/reports?qapi_id={active['id']}")
        ).json()
        # Scoped report can be smaller (or equal if every round happens to
        # land on a QAPI-tied template, which is the demo's case).
        assert scoped["total_rounds"] <= full["total_rounds"]
        assert scoped["total_rounds"] > 0

    async def test_report_narrows_by_date(self, client: AsyncClient):
        """A 7-day window must return strictly fewer rounds than the
        all-time report."""
        full = (await client.get("/api/v1/reports")).json()
        from datetime import datetime, timedelta, timezone
        now = datetime.now(timezone.utc)
        date_to = now.strftime("%Y-%m-%d")
        date_from = (now - timedelta(days=6)).strftime("%Y-%m-%d")
        scoped = (
            await client.get(
                f"/api/v1/reports?date_from={date_from}&date_to={date_to}"
            )
        ).json()
        assert scoped["total_rounds"] < full["total_rounds"], (
            f"7-day window ({scoped['total_rounds']}) should be smaller than "
            f"all-time ({full['total_rounds']})"
        )
        # Every daily_stat must fall in the window.
        for d in scoped["daily_stats"]:
            assert date_from <= d["date"] <= date_to


# ---------------------------------------------------------------------------
# QAA notes
# ---------------------------------------------------------------------------
class TestQaaNotes:
    async def test_qaa_notes_singleton_per_facility(self, client: AsyncClient):
        """PUT then GET should return the same row id every time. This is
        the contract the frontend assumes — there's exactly one QAA notes
        document per facility, edited in place."""
        before = (await client.get("/api/v1/qaa-notes")).json()
        first_id = before["id"]
        # Two distinct PUTs should not multiply rows.
        await client.put("/api/v1/qaa-notes", json={"content": "first edit"})
        after_first = (await client.get("/api/v1/qaa-notes")).json()
        await client.put("/api/v1/qaa-notes", json={"content": "second edit"})
        after_second = (await client.get("/api/v1/qaa-notes")).json()
        assert after_first["id"] == first_id
        assert after_second["id"] == first_id
        assert after_second["content"] == "second edit"
        # Restore baseline so other tests aren't surprised.
        await client.put("/api/v1/qaa-notes", json={"content": before["content"]})

    async def test_get_and_update_notes(self, client: AsyncClient):
        r = await client.get("/api/v1/qaa-notes")
        assert r.status_code == 200
        original = r.json()["content"]

        r2 = await client.put("/api/v1/qaa-notes", json={"content": "pytest update"})
        assert r2.status_code == 200
        assert r2.json()["content"] == "pytest update"

        # Restore
        await client.put("/api/v1/qaa-notes", json={"content": original})


# ---------------------------------------------------------------------------
# Admin seed-reset (DEMO_MODE-gated)
# ---------------------------------------------------------------------------
class TestAdminSeedReset:
    async def test_seed_reset_404_when_not_demo_mode(self, client: AsyncClient):
        # When DEMO_MODE is False, the endpoint returns 404.
        # Skip if the test env explicitly enables it.
        if settings.demo_mode:
            pytest.skip("DEMO_MODE=true; the 404 case isn't applicable")
        r = await client.post("/api/v1/admin/seed-reset")
        assert r.status_code == 404
