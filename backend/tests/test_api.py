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
        assert len(active) == 1
        assert len(archived) == 3
        # Active is Skin Integrity, has items with full QAPI fields populated
        skin = active[0]
        assert "Skin" in skin["title"]
        assert len(skin["items"]) == 3
        item = skin["items"][0]
        for key in ("root_cause", "systemic_change", "monitoring_type", "responsible"):
            assert item[key], f"expected {key} to be non-empty"

    async def test_create_update_delete_qapi(self, client: AsyncClient):
        r = await client.post("/api/v1/qapis", json={"title": "Test QAPI"})
        assert r.status_code == 201
        qapi_id = r.json()["id"]

        r2 = await client.patch(f"/api/v1/qapis/{qapi_id}", json={"status": "archived"})
        assert r2.status_code == 200
        assert r2.json()["status"] == "archived"

        r3 = await client.delete(f"/api/v1/qapis/{qapi_id}")
        assert r3.status_code == 204


# ---------------------------------------------------------------------------
# Questions repository (new)
# ---------------------------------------------------------------------------
class TestQuestions:
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


# ---------------------------------------------------------------------------
# QAA notes
# ---------------------------------------------------------------------------
class TestQaaNotes:
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
