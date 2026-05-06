"""
Seed the new Phase 1 tables (departments, angels, qapis, qapi_items, qaa_notes).
Idempotent — clears tables before inserting.
"""
import uuid
import datetime
import httpx
from app.db.client import DB

FACILITY_ID = "c3d30612-35dc-48f9-8a58-fd0f4bf1c5a2"

DEPARTMENTS = [
    "Nursing", "Dietary", "Activities", "MDS", "Therapy",
    "Social Services", "Housekeeping", "Maintenance", "Admissions",
    "Medical Records", "Administration", "Business Office",
    "Physical Therapy", "Accounts Receivable",
]

QAPIS = [
    {
        "title": "Fall Prevention Program",
        "issues_identified": "Increased fall incidents in Q1 2026 — 4 falls in 30 days exceeding benchmark of 2",
        "date_identified": "2026-01-15",
        "items": [
            {
                "title": "Environment Safety Assessment",
                "order": 0,
                "root_cause": "Inconsistent environmental checks during angel rounds",
                "systemic_change": "Added 3 environmental safety questions to daily rounding template",
                "monitoring_type": "rounds",
                "monitoring_cadence": "Daily",
                "monitoring_role": "Angel / Department Head",
                "responsible_person": "Linda R.",
                "start_date": "2026-01-20",
                "expected_completion_date": "2026-04-20",
            },
            {
                "title": "Non-Slip Footwear Compliance",
                "order": 1,
                "root_cause": "Residents not consistently wearing non-slip footwear per care plan",
                "systemic_change": "Added footwear compliance check to rounding questions",
                "monitoring_type": "rounds",
                "monitoring_cadence": "Daily",
                "monitoring_role": "Angel",
                "responsible_person": "Sarah K.",
                "start_date": "2026-01-20",
                "expected_completion_date": "2026-04-20",
            },
        ],
    },
    {
        "title": "Pressure Injury Prevention",
        "issues_identified": "Two Stage II pressure injuries identified during quarterly skin audit",
        "date_identified": "2026-02-01",
        "items": [
            {
                "title": "Repositioning Compliance Monitoring",
                "order": 0,
                "root_cause": "Repositioning schedules not consistently followed during busy shift periods",
                "systemic_change": "Repositioning check added to every round for at-risk residents",
                "monitoring_type": "rounds",
                "monitoring_cadence": "Daily",
                "monitoring_role": "Angel",
                "responsible_person": "Marcus T.",
                "start_date": "2026-02-10",
                "expected_completion_date": "2026-05-10",
            },
        ],
    },
    {
        "title": "Pain Management & Assessment",
        "issues_identified": "Pain scores ≥7 flagged 14 times in February without documented escalation",
        "date_identified": "2026-02-15",
        "items": [
            {
                "title": "High Pain Score Response Protocol",
                "order": 0,
                "root_cause": "No clear escalation pathway when angel observes pain score ≥7",
                "systemic_change": "Defined escalation SOP: pain ≥7 triggers immediate charge nurse notification",
                "monitoring_type": "rounds",
                "monitoring_cadence": "Daily",
                "monitoring_role": "Angel / Charge Nurse",
                "responsible_person": "Jennifer D.",
                "start_date": "2026-02-20",
                "expected_completion_date": "2026-05-20",
            },
            {
                "title": "Pain Documentation Completeness",
                "order": 1,
                "root_cause": "Pain responses in rounds not consistently capturing numeric score",
                "systemic_change": "Pain level question made required on all rounding templates",
                "monitoring_type": "completion",
                "monitoring_cadence": "Weekly review",
                "monitoring_role": "MDS Coordinator",
                "responsible_person": "Tom C.",
                "start_date": "2026-02-20",
                "expected_completion_date": "2026-05-20",
            },
        ],
    },
]

QAA_NOTES = """QAA Committee Meeting Minutes — April 2026

Meeting Date: April 15, 2026
Attendees: Tom C. (Administrator), Jennifer D. (DON), Linda R. (Nursing), Sarah K. (Nursing), Marcus T. (PT)

QAPI Items Reviewed:
1. Fall Prevention Program — Environmental checks showing 94% compliance. Two falls in March, both in evening hours. Recommend adding evening-shift rounding reminder.
2. Pressure Injury Prevention — Repositioning compliance at 91%. No new pressure injuries since February. Continue monitoring.
3. Pain Management — Pain escalation protocol followed in 87% of flagged cases. Still below 95% target. Additional training scheduled for May 3.

Action Items:
- Schedule fall prevention in-service for all angels: May 10, 2026
- Review pain escalation documentation weekly through end of Q2
- Evaluate RapidRound deployment for post-fall surveys

Next Meeting: May 20, 2026"""


async def run_seed(client: httpx.AsyncClient) -> dict:
    db = DB(client)

    # Clear tables in dependency order
    await db.delete_all("qapi_items")
    await db.delete_all("qapis")
    await db.delete_all("qaa_notes")
    await db.delete_all("angels")
    await db.delete_all("departments")

    # Seed departments
    dept_map: dict[str, str] = {}
    for name in DEPARTMENTS:
        dept_id = str(uuid.uuid4())
        dept_map[name.lower()] = dept_id
        await db.insert("departments", {
            "id": dept_id,
            "name": name,
            "facility_id": FACILITY_ID,
            "custom": False,
        })

    # Seed angels from existing users where is_angel=True
    users = await db.select("users", {"is_angel": "eq.true", "active": "eq.true"})
    angel_count = 0
    for user in users:
        user_dept = (user.get("department") or "").lower()
        dept_id = next(
            (v for k, v in dept_map.items() if user_dept in k or k in user_dept),
            None,
        )
        await db.insert("angels", {
            "id": str(uuid.uuid4()),
            "user_id": user["id"],
            "department_id": dept_id,
            "absent": False,
        })
        angel_count += 1

    # Seed QAPIs and items
    for qapi_data in QAPIS:
        qapi_id = str(uuid.uuid4())
        await db.insert("qapis", {
            "id": qapi_id,
            "title": qapi_data["title"],
            "status": "active",
            "issues_identified": qapi_data["issues_identified"],
            "date_identified": qapi_data["date_identified"],
        })
        for item in qapi_data["items"]:
            await db.insert("qapi_items", {"id": str(uuid.uuid4()), "qapi_id": qapi_id, **item})

    # Seed QAA notes
    await db.insert("qaa_notes", {
        "id": str(uuid.uuid4()),
        "facility_id": FACILITY_ID,
        "content": QAA_NOTES,
    })

    return {
        "departments": len(DEPARTMENTS),
        "angels": angel_count,
        "qapis": len(QAPIS),
        "qapi_items": sum(len(q["items"]) for q in QAPIS),
        "qaa_notes": 1,
    }
