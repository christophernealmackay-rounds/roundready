"""
Integration tests for the RoundReady API.
Runs against the real Supabase database — uses the service role which bypasses RLS.
Each test is read-only or cleans up after itself to stay idempotent.
"""
import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport

from app.main import app


@pytest_asyncio.fixture
async def client():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
        yield c


# Health
class TestHealth:
    async def test_health(self, client: AsyncClient):
        r = await client.get("/api/v1/health")
        assert r.status_code == 200
        assert r.json()["status"] == "ok"


# Users
class TestUsers:
    async def test_list_users(self, client: AsyncClient):
        r = await client.get("/api/v1/users")
        assert r.status_code == 200
        users = r.json()
        assert len(users) >= 1
        assert "full_name" in users[0]

    async def test_create_and_delete_user(self, client: AsyncClient):
        r = await client.post("/api/v1/users", json={
            "full_name": "Test Angel",
            "email": "test.angel@test.com",
            "department": "Nursing",
            "is_angel": True,
            "facility_id": "c3d30612-35dc-48f9-8a58-fd0f4bf1c5a2",
        })
        assert r.status_code == 201
        user_id = r.json()["id"]

        r = await client.delete(f"/api/v1/users/{user_id}")
        assert r.status_code == 204

    async def test_update_user(self, client: AsyncClient):
        # Create, update, delete
        r = await client.post("/api/v1/users", json={
            "full_name": "Temp User",
            "facility_id": "c3d30612-35dc-48f9-8a58-fd0f4bf1c5a2",
        })
        assert r.status_code == 201
        user_id = r.json()["id"]

        r = await client.patch(f"/api/v1/users/{user_id}", json={"active": False})
        assert r.status_code == 200
        assert r.json()["active"] is False

        await client.delete(f"/api/v1/users/{user_id}")

    async def test_patch_nonexistent_user(self, client: AsyncClient):
        r = await client.patch(
            "/api/v1/users/00000000-0000-0000-0000-000000000000",
            json={"active": False},
        )
        assert r.status_code == 404


# Residents
class TestResidents:
    async def test_list_residents(self, client: AsyncClient):
        r = await client.get("/api/v1/residents")
        assert r.status_code == 200
        residents = r.json()
        assert len(residents) >= 48
        assert "full_name" in residents[0]
        assert "room" in residents[0]

    async def test_pcc_sync(self, client: AsyncClient):
        r = await client.get("/api/v1/residents/sync-pcc")
        assert r.status_code == 200
        data = r.json()
        assert data["status"] == "connected"


# Departments
class TestDepartments:
    async def test_create_and_delete(self, client: AsyncClient):
        r = await client.post("/api/v1/departments", json={"name": "Test Dept", "custom": True})
        assert r.status_code == 201
        dept_id = r.json()["id"]

        r2 = await client.get("/api/v1/departments")
        assert any(d["id"] == dept_id for d in r2.json())

        r3 = await client.delete(f"/api/v1/departments/{dept_id}")
        assert r3.status_code == 204


# QAPIs
class TestQapis:
    async def test_list_qapis(self, client: AsyncClient):
        # Seed first to ensure data exists
        await client.post("/api/v1/seed/reset")
        r = await client.get("/api/v1/qapis")
        assert r.status_code == 200
        qapis = r.json()
        assert len(qapis) >= 3
        assert "items" in qapis[0]

    async def test_create_update_delete_qapi(self, client: AsyncClient):
        r = await client.post("/api/v1/qapis", json={"title": "Test QAPI"})
        assert r.status_code == 201
        qapi_id = r.json()["id"]

        r2 = await client.patch(f"/api/v1/qapis/{qapi_id}", json={"status": "archived"})
        assert r2.status_code == 200
        assert r2.json()["status"] == "archived"

        r3 = await client.delete(f"/api/v1/qapis/{qapi_id}")
        assert r3.status_code == 204

    async def test_qapi_items_crud(self, client: AsyncClient):
        r = await client.post("/api/v1/qapis", json={"title": "QAPI with Item"})
        qapi_id = r.json()["id"]

        r2 = await client.post(f"/api/v1/qapis/{qapi_id}/items", json={"title": "Item A", "order": 0})
        assert r2.status_code == 201
        item_id = r2.json()["id"]

        r3 = await client.patch(f"/api/v1/qapis/{qapi_id}/items/{item_id}", json={"title": "Item A Updated"})
        assert r3.status_code == 200
        assert r3.json()["title"] == "Item A Updated"

        await client.delete(f"/api/v1/qapis/{qapi_id}")


# Issues
class TestIssues:
    async def test_list_issues(self, client: AsyncClient):
        r = await client.get("/api/v1/issues")
        assert r.status_code == 200
        issues = r.json()
        assert len(issues) >= 1
        assert "issue" in issues[0]

    async def test_filter_open_issues(self, client: AsyncClient):
        r = await client.get("/api/v1/issues?status=open")
        assert r.status_code == 200
        for issue in r.json():
            assert issue["resolved"] is False

    async def test_resolve_and_reopen_issue(self, client: AsyncClient):
        issues_r = await client.get("/api/v1/issues?status=open")
        issues = issues_r.json()
        if not issues:
            pytest.skip("No open issues to test")

        issue_id = issues[0]["id"]

        r = await client.patch(f"/api/v1/issues/{issue_id}", json={
            "resolved": True, "resolved_by": "pytest", "resolution_notes": "Test resolution"
        })
        assert r.status_code == 200
        assert r.json()["resolved"] is True

        # Reopen
        r2 = await client.patch(f"/api/v1/issues/{issue_id}", json={"resolved": False})
        assert r2.status_code == 200
        assert r2.json()["resolved"] is False


# Rounds
class TestRounds:
    async def test_list_templates(self, client: AsyncClient):
        r = await client.get("/api/v1/rounds/templates")
        assert r.status_code == 200
        templates = r.json()
        assert len(templates) >= 1
        assert "questions" in templates[0]

    async def test_list_rounds(self, client: AsyncClient):
        r = await client.get("/api/v1/rounds")
        assert r.status_code == 200
        rounds = r.json()
        assert len(rounds) >= 1
        assert "angel_name" in rounds[0]

    async def test_rounds_date_filter(self, client: AsyncClient):
        r = await client.get("/api/v1/rounds?date_from=2026-04-01&date_to=2026-04-30")
        assert r.status_code == 200
        for round_ in r.json():
            if round_["submitted_at"]:
                assert round_["submitted_at"] >= "2026-04-01"


# Reports
class TestReports:
    async def test_report_no_filter(self, client: AsyncClient):
        r = await client.get("/api/v1/reports")
        assert r.status_code == 200
        data = r.json()
        assert data["total_rounds"] > 0
        assert "angel_stats" in data
        assert "daily_stats" in data

    async def test_report_date_filter(self, client: AsyncClient):
        r = await client.get("/api/v1/reports?date_from=2026-04-01&date_to=2026-04-30")
        assert r.status_code == 200
        data = r.json()
        assert data["total_rounds"] > 0
        assert all(s["date"] >= "2026-04-01" for s in data["daily_stats"])

    async def test_report_angel_filter(self, client: AsyncClient):
        r = await client.get("/api/v1/reports?angel_name=Sarah K.")
        assert r.status_code == 200
        data = r.json()
        for stat in data["angel_stats"]:
            assert stat["angel_name"] == "Sarah K."


# QAA Notes
class TestQaaNotes:
    async def test_get_and_update_notes(self, client: AsyncClient):
        r = await client.get("/api/v1/qaa-notes")
        assert r.status_code == 200
        assert "content" in r.json()

        r2 = await client.put("/api/v1/qaa-notes", json={"content": "Updated meeting notes"})
        assert r2.status_code == 200
        assert r2.json()["content"] == "Updated meeting notes"


# Seed
class TestSeed:
    async def test_seed_reset(self, client: AsyncClient):
        r = await client.post("/api/v1/seed/reset")
        assert r.status_code == 200
        data = r.json()
        assert data["status"] == "ok"
        assert data["seeded"]["departments"] >= 10
        assert data["seeded"]["angels"] >= 7
        assert data["seeded"]["qapis"] == 3
