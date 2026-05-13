"""
Authoritative demo seed.

All dates rolling, anchored to NOW() at seed time, so the dashboard always
looks current. Single asyncpg transaction (caller wraps it).

Story (DON/Admin demo):
  1 facility, 14 departments, 8 users (admin Mary Smith + 5 angels + charge nurse + viewer),
  5 angels, 20 residents (Wings 100/200/300, 3 groups), 1 active QAPI (Skin Integrity)
  + 3 archived (Falls, Pain, Antipsychotic), ~25 questions, 1 active Angel Rounds template
  with sections per QAPI item, 1 archived RapidRound, 21 days of rounds at ~85% completion,
  ~30 issues split ~10 open / ~20 resolved, full notification trail, sample QAA notes.
"""
from __future__ import annotations

import datetime as dt
import json
import random
import uuid
from typing import Any

import asyncpg

FACILITY_ID = "c3d30612-35dc-48f9-8a58-fd0f4bf1c5a2"


def _uuid() -> str:
    return str(uuid.uuid4())


# ============================================================================
# Static reference data
# ============================================================================

DEPARTMENTS = [
    "Nursing", "Dietary", "Activities", "MDS", "Therapy",
    "Social Services", "Housekeeping", "Maintenance", "Admissions",
    "Medical Records", "Administration", "Business Office",
    "Physical Therapy", "Accounts Receivable",
]

# Each angel is one user with role='angel'. These map to angel records too.
ANGEL_PROFILES = [
    {"name": "Linda Reyes",   "email": "lreyes@roundready.demo",    "department": "Nursing"},
    {"name": "Sarah Klein",   "email": "sklein@roundready.demo",    "department": "Dietary"},
    {"name": "Marcus Tate",   "email": "mtate@roundready.demo",     "department": "Activities"},
    {"name": "Jennifer Diaz", "email": "jdiaz@roundready.demo",     "department": "Therapy"},
    {"name": "Tom Chen",      "email": "tchen@roundready.demo",     "department": "Social Services"},
]

ADMIN_USER = {"name": "Mary Smith",   "email": "msmith@roundready.demo", "role": "admin",        "department": "Administration"}
CHARGE_USER = {"name": "Rachel Park", "email": "rpark@roundready.demo",  "role": "charge_nurse", "department": "Nursing"}
VIEWER_USER = {"name": "David Lee",   "email": "dlee@roundready.demo",   "role": "viewer",       "department": "Medical Records"}

# 20 residents across wings 100/200/300
RESIDENTS = [
    # Wing 100
    {"name": "Eleanor Hartley",    "room": "101", "bed": "a"},
    {"name": "Walter Brennan",     "room": "101", "bed": "b"},
    {"name": "Margaret O'Neill",   "room": "102", "bed": "a"},
    {"name": "Frank Whitaker",     "room": "102", "bed": "b"},
    {"name": "Doris Steinberg",    "room": "103", "bed": "a"},
    {"name": "Harold Vance",       "room": "104", "bed": "a"},
    {"name": "Ruth Caldwell",      "room": "105", "bed": "a"},
    # Wing 200
    {"name": "Arthur Lindgren",    "room": "201", "bed": "a"},
    {"name": "Beatrice Nakamura",  "room": "202", "bed": "a"},
    {"name": "Charles Doherty",    "room": "202", "bed": "b"},
    {"name": "Iris Pemberton",     "room": "203", "bed": "a"},
    {"name": "George Halloran",    "room": "204", "bed": "a"},
    {"name": "Lillian Voss",       "room": "205", "bed": "a"},
    # Wing 300
    {"name": "Raymond Castellano", "room": "301", "bed": "a"},
    {"name": "Vera Ashford",       "room": "302", "bed": "a"},
    {"name": "Stanley McBride",    "room": "303", "bed": "a"},
    {"name": "Pearl Tomlinson",    "room": "304", "bed": "a"},
    {"name": "Howard Kowalski",    "room": "305", "bed": "a"},
    {"name": "Mildred Aldridge",   "room": "306", "bed": "a"},
    {"name": "Edwin Brockman",     "room": "307", "bed": "a"},
]

# 1 active + 3 archived QAPIs. Active QAPI must have items the demo can drill into.
QAPIS_ACTIVE = [
    {
        "title": "Skin Integrity & Pressure Injury Prevention",
        "issues_identified": "Two Stage II pressure injuries identified during quarterly skin audit; repositioning compliance below 90% on evening shift.",
        "date_offset_days": -30,
        "items": [
            {
                "title": "Daily Skin Inspection on Admission and Q-Shift",
                "root_cause": "Skin checks not consistently documented on evening shift.",
                "systemic_change": "Skin inspection question added to all rounding templates; required field.",
                "monitoring_type": "rounds",
                "monitoring_detail": "Daily — every angel round captures skin integrity status.",
                "responsible": "Linda Reyes, Nursing",
                "start_offset": -28, "complete_offset": +60,
                "order": 0,
            },
            {
                "title": "Repositioning Compliance for At-Risk Residents",
                "root_cause": "Repositioning schedules slip during busy evening shift periods.",
                "systemic_change": "Added repositioning check to every round for at-risk residents; charge nurse review.",
                "monitoring_type": "rounds",
                "monitoring_detail": "Daily — angel confirms repositioning status on each round.",
                "responsible": "Marcus Tate, Therapy",
                "start_offset": -28, "complete_offset": +60,
                "order": 1,
            },
            {
                "title": "Non-Slip Footwear Compliance",
                "root_cause": "Residents not consistently wearing non-slip footwear per care plan.",
                "systemic_change": "Footwear compliance check added to rounding template.",
                "monitoring_type": "rounds",
                "monitoring_detail": "Daily — checked during morning and afternoon rounds.",
                "responsible": "Sarah Klein, Dietary",
                "start_offset": -28, "complete_offset": +60,
                "order": 2,
            },
        ],
    },
]

QAPIS_ARCHIVED = [
    {
        "title": "Fall Prevention Program",
        "issues_identified": "Fall rate exceeded benchmark in Q4 2025.",
        "date_offset_days": -90,
        # Archived ~30 days after identification — typical PIP cycle length.
        "complete_offset_days": -60,
        "items": [
            {"title": "Environment Safety Assessment",     "responsible": "Linda Reyes, Nursing",  "order": 0},
            {"title": "High-Risk Resident Identification", "responsible": "Marcus Tate, Therapy",  "order": 1},
        ],
    },
    {
        "title": "Pain Management & Assessment",
        "issues_identified": "Pain scores >=7 not consistently escalated to charge nurse.",
        "date_offset_days": -120,
        "complete_offset_days": -90,
        "items": [
            {"title": "High Pain Score Response Protocol",  "responsible": "Jennifer Diaz, Therapy",   "order": 0},
            {"title": "Pain Documentation Completeness",    "responsible": "Tom Chen, Social Services","order": 1},
        ],
    },
    {
        "title": "Antipsychotic Reduction Initiative",
        "issues_identified": "Off-label antipsychotic use above CMS benchmark.",
        "date_offset_days": -180,
        "complete_offset_days": -150,
        "items": [
            {"title": "Quarterly Behavior Health Review",   "responsible": "Rachel Park, Nursing",     "order": 0},
        ],
    },
]


# Question repository — the pool the user drags from. ~25 questions.
# Each question carries the dept that gets notified when it flags an issue.
QUESTIONS = [
    # Skin / Pressure (Skin Integrity QAPI) — each question scoped to a single QAPI item
    {"text": "Skin intact, no new redness or breakdown observed?",                   "section": "Skin Inspection", "issue_on": "no",  "department": "Nursing"},
    {"text": "Heels offloaded with pillow or boot if at-risk?",                      "section": "Skin Inspection", "issue_on": "no",  "department": "Nursing"},
    {"text": "Resident repositioned per care plan in last 2 hours?",                 "section": "Repositioning",   "issue_on": "no",  "department": "Nursing"},
    {"text": "Wearing non-slip footwear or non-skid socks?",                         "section": "Footwear",        "issue_on": "no",  "department": "Therapy"},
    # Falls
    {"text": "Call light within reach?",                                             "section": "Falls",      "issue_on": "no",  "department": "Nursing"},
    {"text": "Bed in lowest position?",                                              "section": "Falls",      "issue_on": "no",  "department": "Nursing"},
    {"text": "Floor clear of trip hazards?",                                         "section": "Falls",      "issue_on": "no",  "department": "Housekeeping"},
    {"text": "Walker or cane within reach if applicable?",                           "section": "Falls",      "issue_on": "no",  "department": "Therapy"},
    # Pain
    {"text": "Resident reports pain level <=4?",                                     "section": "Pain",       "issue_on": "no",  "department": "Nursing"},
    {"text": "PRN pain medication given when last requested?",                       "section": "Pain",       "issue_on": "no",  "department": "Nursing"},
    {"text": "Pain assessment documented with numeric score?",                       "section": "Pain",       "issue_on": "no",  "department": "MDS"},
    # Hydration / Dietary
    {"text": "Water pitcher within reach and has fresh water?",                      "section": "Dietary",    "issue_on": "no",  "department": "Dietary"},
    {"text": "Meal tray finished or refusal documented?",                            "section": "Dietary",    "issue_on": "no",  "department": "Dietary"},
    {"text": "Snack offered between meals if on supplement order?",                  "section": "Dietary",    "issue_on": "no",  "department": "Dietary"},
    # Hygiene
    {"text": "Resident's clothing clean and appropriate?",                           "section": "Hygiene",    "issue_on": "no",  "department": "Nursing"},
    {"text": "Brief or incontinence product clean and dry?",                         "section": "Hygiene",    "issue_on": "no",  "department": "Nursing"},
    {"text": "Oral care completed today?",                                           "section": "Hygiene",    "issue_on": "no",  "department": "Nursing"},
    # Mood / Activities
    {"text": "Resident engaged in at least one activity today?",                     "section": "Activities", "issue_on": "no",  "department": "Activities"},
    {"text": "Mood appears stable, no signs of distress or withdrawal?",             "section": "Mood",       "issue_on": "no",  "department": "Social Services"},
    # Environment / Maintenance
    {"text": "Room temperature comfortable for resident?",                           "section": "Environment","issue_on": "no",  "department": "Maintenance"},
    {"text": "Lighting adequate, no burned-out bulbs?",                              "section": "Environment","issue_on": "no",  "department": "Maintenance"},
    # Safety / Charge nurse escalation
    {"text": "Any new injury, bruise, or skin change observed?",                     "section": "Safety",     "issue_on": "yes", "department": "Nursing"},
    {"text": "Resident expressed any new complaint or concern?",                     "section": "Safety",     "issue_on": "yes", "department": "Social Services"},
    # General
    {"text": "Visit notes captured for any clinically relevant observation?",        "section": "General",    "issue_on": "either", "department": "MDS"},
    {"text": "Family or POA contacted for any concerns flagged?",                    "section": "General",    "issue_on": "either", "department": "Social Services"},
    # Scale questions — pain (flag if high) and meal satisfaction (flag if low)
    {"text": "What is the resident's pain level (1-10)?",                            "section": "Pain",       "issue_on": "either", "department": "Nursing",
     "type": "scale", "scale_min": 1, "scale_max": 10, "scale_threshold": 7, "scale_threshold_direction": "gte"},
    {"text": "How would the resident rate meal satisfaction today (1-5)?",           "section": "Dietary",    "issue_on": "either", "department": "Dietary",
     "type": "scale", "scale_min": 1, "scale_max": 5,  "scale_threshold": 2, "scale_threshold_direction": "lte"},
]

QAA_NOTES_TEXT = """QAA Committee Meeting Minutes

Attendees: Mary Smith (Administrator/DON), Rachel Park (Charge Nurse), Linda Reyes (Nursing), Sarah Klein (Dietary), Marcus Tate (Therapy)

QAPI Items Reviewed:
1. Skin Integrity & Pressure Injury Prevention - Daily skin inspections at 92% compliance. Repositioning compliance trending up to 88% from 79% baseline. Two open issues currently being addressed.
2. Falls Prevention (archived) - Reviewed final outcomes; non-slip footwear compliance reached 96% sustained over 60 days. Initiative closed.
3. Pain Management (archived) - Escalation protocol successfully integrated into rounding workflow.

Action Items:
- Continue weekly review of repositioning audit data through end of quarter
- Schedule skin assessment in-service for evening shift staff
- Evaluate adding hydration tracking to Skin Integrity rounds

Next Meeting: 4 weeks from today.
"""


# ============================================================================
# Seed entrypoint
# ============================================================================

async def run_seed(conn: asyncpg.Connection) -> dict:
    """Insert all demo data. Caller wraps in a transaction."""
    rng = random.Random(42)  # deterministic seed for repeatable demos
    now = dt.datetime.now(dt.timezone.utc)
    today = now.date()

    # ---- departments ----
    dept_ids: dict[str, str] = {name: _uuid() for name in DEPARTMENTS}
    facility_uuid = uuid.UUID(FACILITY_ID)
    await conn.copy_records_to_table(
        "departments",
        records=[(uuid.UUID(dept_ids[n]), n, facility_uuid, False) for n in DEPARTMENTS],
        columns=["id", "name", "facility_id", "custom"],
    )

    # ---- users ----
    # Track first-user-per-department so we can route notifications without a SELECT later.
    dept_to_first_user: dict[str, str] = {}

    def _record_dept_user(dept_id: str | None, user_id: str) -> None:
        if dept_id and dept_id not in dept_to_first_user:
            dept_to_first_user[dept_id] = user_id

    default_prefs = json.dumps({"issues": True, "reminders": True, "summaries": True})
    admin_id = _uuid()
    angel_user_ids = [_uuid() for _ in ANGEL_PROFILES]
    charge_id = _uuid()
    viewer_id = _uuid()

    user_records: list[tuple] = []
    def _add_user(uid: str, profile: dict[str, Any], role: str) -> None:
        dept_id = dept_ids.get(profile["department"])
        _record_dept_user(dept_id, uid)
        user_records.append((
            uuid.UUID(uid),
            profile["name"],
            profile["email"],
            role,
            uuid.UUID(dept_id) if dept_id else None,
            default_prefs,
            True,
        ))

    _add_user(admin_id, ADMIN_USER, "admin")
    for uid, profile in zip(angel_user_ids, ANGEL_PROFILES):
        _add_user(uid, profile, "angel")
    _add_user(charge_id, CHARGE_USER, CHARGE_USER["role"])
    _add_user(viewer_id, VIEWER_USER, VIEWER_USER["role"])

    await conn.copy_records_to_table(
        "users",
        records=user_records,
        columns=["id", "name", "email", "role", "department_id", "notification_prefs", "active"],
    )

    # ---- angels (one row per angel user) ----
    angel_ids = [_uuid() for _ in ANGEL_PROFILES]
    await conn.copy_records_to_table(
        "angels",
        records=[
            (uuid.UUID(aid), uuid.UUID(uid), uuid.UUID(dept_ids[p["department"]]), False)
            for aid, uid, p in zip(angel_ids, angel_user_ids, ANGEL_PROFILES)
        ],
        columns=["id", "user_id", "department_id", "absent"],
    )

    # ---- residents (assigned sequentially to angels by room order) ----
    resident_ids: list[str] = [_uuid() for _ in RESIDENTS]
    rooms_by_angel: dict[int, list[str]] = {i: [] for i in range(len(angel_ids))}
    resident_records: list[tuple] = []
    for idx, (rid, r) in enumerate(zip(resident_ids, RESIDENTS)):
        # Sequential assignment so all beds in a room go to the same angel.
        # Group rooms in chunks of 4-5 per angel.
        angel_idx = min(idx // 4, len(angel_ids) - 1)
        rooms_by_angel[angel_idx].append(rid)
        resident_records.append((
            uuid.UUID(rid),
            r["name"],
            r["room"],
            r["bed"],
            uuid.UUID(angel_ids[angel_idx]),
            "active",
            f"PCC-{idx+1001}",
        ))
    await conn.copy_records_to_table(
        "residents",
        records=resident_records,
        columns=["id", "name", "room", "bed", "angel_id", "status", "pcc_id"],
    )

    # ---- resident groups (Wing 100/200/300) ----
    wing_groups = {wing: _uuid() for wing in ["100", "200", "300"]}
    await conn.copy_records_to_table(
        "resident_groups",
        records=[
            (uuid.UUID(wing_groups[w]), f"Wing {w}", "wing", facility_uuid)
            for w in ["100", "200", "300"]
        ],
        columns=["id", "name", "type", "facility_id"],
    )

    # Wing membership derived from room number (e.g., 1xx -> Wing 100)
    await conn.copy_records_to_table(
        "resident_group_memberships",
        records=[
            (uuid.UUID(rid), uuid.UUID(wing_groups[r["room"][0] + "00"]))
            for rid, r in zip(resident_ids, RESIDENTS)
        ],
        columns=["resident_id", "group_id"],
    )

    # ---- QAPIs and items ----
    active_qapi_id: str | None = None
    active_item_ids: list[str] = []
    qapi_item_dept_hint: dict[str, str] = {}  # item_id -> department name

    qapi_records: list[tuple] = []
    qapi_item_records: list[tuple] = []

    for qapi in QAPIS_ACTIVE:
        qid = _uuid()
        active_qapi_id = qid
        qapi_records.append((
            uuid.UUID(qid), qapi["title"], "active",
            qapi["issues_identified"],
            today + dt.timedelta(days=qapi["date_offset_days"]),
            # Active QAPIs have not completed yet.
            None,
        ))
        for item in qapi["items"]:
            iid = _uuid()
            active_item_ids.append(iid)
            qapi_item_records.append((
                uuid.UUID(iid),
                uuid.UUID(qid),
                item["title"],
                item["root_cause"],
                item["systemic_change"],
                item["monitoring_type"],
                item["monitoring_detail"],
                item["responsible"],
                today + dt.timedelta(days=item["start_offset"]),
                today + dt.timedelta(days=item["complete_offset"]),
                item["order"],
            ))
            qapi_item_dept_hint[iid] = item["responsible"].split(",")[-1].strip()

    for qapi in QAPIS_ARCHIVED:
        qid = _uuid()
        qapi_records.append((
            uuid.UUID(qid), qapi["title"], "archived",
            qapi["issues_identified"],
            today + dt.timedelta(days=qapi["date_offset_days"]),
            today + dt.timedelta(days=qapi["complete_offset_days"]),
        ))
        for item in qapi["items"]:
            qapi_item_records.append((
                uuid.UUID(_uuid()), uuid.UUID(qid), item["title"],
                "", "", "rounds", "", item["responsible"],
                None, None, item["order"],
            ))

    await conn.copy_records_to_table(
        "qapis",
        records=qapi_records,
        columns=["id", "title", "status", "issues_identified", "date_identified", "actual_completion"],
    )
    await conn.copy_records_to_table(
        "qapi_items",
        records=qapi_item_records,
        columns=[
            "id", "qapi_id", "title", "root_cause", "systemic_change",
            "monitoring_type", "monitoring_detail", "responsible",
            "start_date", "expected_completion", "order",
        ],
    )

    # ---- questions (repository) ----
    question_ids: list[str] = []
    questions_by_section: dict[str, list[tuple[str, dict[str, Any]]]] = {}
    q_to_dept: dict[str, str | None] = {}  # question_id -> notify_department_id (for issue routing)
    question_records: list[tuple] = []
    for q in QUESTIONS:
        qid = _uuid()
        question_ids.append(qid)
        dept_id = dept_ids.get(q["department"])
        q_to_dept[qid] = dept_id
        qtype = q.get("type", "yesno")
        question_records.append((
            uuid.UUID(qid),
            q["text"],
            q["section"],
            q["issue_on"],
            uuid.UUID(dept_id) if dept_id else None,
            uuid.UUID(dept_id) if dept_id else None,  # department_id mirrors notify dept in seed
            qtype,
            q.get("scale_min"),
            q.get("scale_max"),
            q.get("scale_threshold"),
            q.get("scale_threshold_direction"),
            True,
        ))
        questions_by_section.setdefault(q["section"], []).append((qid, q))
    await conn.copy_records_to_table(
        "questions",
        records=question_records,
        columns=[
            "id", "text", "section", "issue_on", "notify_department_id", "department_id",
            "type", "scale_min", "scale_max", "scale_threshold", "scale_threshold_direction",
            "in_repository",
        ],
    )

    # ---- templates, sections, template_questions: build all rows then COPY ----
    angel_template_id = _uuid()
    archived_rapid_id = _uuid()

    template_records = [
        (
            uuid.UUID(angel_template_id), "Angel Rounds — Skin Integrity", "angel",
            True,                                                # active
            today + dt.timedelta(days=-28),                      # start_date
            None,                                                # end_date
            None,                                                # archived_at
        ),
        (
            uuid.UUID(archived_rapid_id), "Flu Outbreak Survey (archived)", "rapid",
            False,
            today + dt.timedelta(days=-90),
            today + dt.timedelta(days=-83),
            now - dt.timedelta(days=83),
        ),
    ]
    await conn.copy_records_to_table(
        "round_templates",
        records=template_records,
        columns=["id", "name", "type", "active", "start_date", "end_date", "archived_at"],
    )

    # Section per active QAPI item, populated with relevant questions.
    # Each pool maps to exactly one QAPI item so no question is duplicated
    # across sections.
    section_question_map = [
        ["Skin Inspection", "Hygiene"],   # Item 0: Daily Skin Inspection
        ["Repositioning"],                # Item 1: Repositioning
        ["Footwear", "Falls"],            # Item 2: Non-Slip Footwear (+ Falls overlap)
    ]
    template_question_ids: list[str] = []
    section_records: list[tuple] = []
    template_question_records: list[tuple] = []

    for idx, item_id in enumerate(active_item_ids):
        sec_id = _uuid()
        item_title = QAPIS_ACTIVE[0]["items"][idx]["title"]
        section_records.append((
            uuid.UUID(sec_id),
            uuid.UUID(angel_template_id),
            item_title,
            uuid.UUID(active_qapi_id) if active_qapi_id else None,
            uuid.UUID(item_id),
            idx,
        ))
        order = 0
        for section_name in section_question_map[idx]:
            for qid, _qmeta in questions_by_section.get(section_name, []):
                template_question_ids.append(qid)
                template_question_records.append((
                    uuid.UUID(_uuid()),
                    uuid.UUID(sec_id),
                    uuid.UUID(qid),
                    order,
                ))
                order += 1

    # Always include Safety section in the active template (catch-all for issue raising)
    safety_section_id = _uuid()
    section_records.append((
        uuid.UUID(safety_section_id),
        uuid.UUID(angel_template_id),
        "Safety & General",
        None,    # qapi_id
        None,    # qapi_item_id
        99,
    ))
    safety_order = 0
    for section_name in ["Safety", "General"]:
        for qid, _qmeta in questions_by_section.get(section_name, []):
            template_question_records.append((
                uuid.UUID(_uuid()),
                uuid.UUID(safety_section_id),
                uuid.UUID(qid),
                safety_order,
            ))
            template_question_ids.append(qid)
            safety_order += 1

    await conn.copy_records_to_table(
        "template_sections",
        records=section_records,
        columns=["id", "template_id", "title", "qapi_id", "qapi_item_id", "order"],
    )
    await conn.copy_records_to_table(
        "template_questions",
        records=template_question_records,
        columns=["id", "section_id", "question_id", "order"],
    )


    # ---- 21 days of rounds: each angel rounds each of their residents ~85% of days ----
    template_unique_qids = list(dict.fromkeys(template_question_ids))  # dedupe, preserve order
    rounds_inserted = 0
    rounds_buffer: list[tuple] = []
    answers_buffer: list[tuple] = []
    issues_buffer: list[dict] = []

    for day_offset in range(21, 0, -1):
        round_date = now - dt.timedelta(days=day_offset)
        for angel_idx, residents_for_angel in rooms_by_angel.items():
            if not residents_for_angel:
                continue
            angel_id = angel_ids[angel_idx]
            for resident_id in residents_for_angel:
                # ~85% completion rate, biased toward more-complete on recent days
                completion_chance = 0.92 if day_offset < 7 else 0.83
                if rng.random() > completion_chance:
                    continue
                round_id = _uuid()
                completed_at = round_date.replace(
                    hour=rng.randint(8, 18),
                    minute=rng.randint(0, 59),
                    second=rng.randint(0, 59),
                    microsecond=0,
                )
                rounds_buffer.append((
                    uuid.UUID(round_id),
                    uuid.UUID(angel_template_id),
                    uuid.UUID(angel_id),
                    uuid.UUID(resident_id),
                    completed_at,
                    completed_at,  # created_at
                ))
                rounds_inserted += 1
                # Generate an answer per question
                for qid in template_unique_qids:
                    # ~7% chance the answer triggers an issue based on issue_on
                    flagged = rng.random() < 0.07
                    answer = not flagged  # most answers OK
                    answers_buffer.append((
                        uuid.UUID(_uuid()),
                        uuid.UUID(round_id),
                        uuid.UUID(qid),
                        answer,
                        None,  # answer_number — null for yes/no questions
                        flagged,
                        completed_at,
                    ))
                    if flagged:
                        issues_buffer.append({
                            "round_id": round_id,
                            "question_id": qid,
                            "resident_id": resident_id,
                            "angel_id": angel_id,
                            "completed_at": completed_at,
                        })

    # Bulk-load rounds via COPY (single round-trip vs. ~345 INSERTs).
    if rounds_buffer:
        await conn.copy_records_to_table(
            "rounds",
            records=rounds_buffer,
            columns=["id", "template_id", "angel_id", "resident_id", "completed_at", "created_at"],
        )

    # Bulk-load round_answers via COPY (single round-trip vs. ~5175 INSERTs).
    if answers_buffer:
        await conn.copy_records_to_table(
            "round_answers",
            records=answers_buffer,
            columns=["id", "round_id", "question_id", "answer", "answer_number", "issue_flagged", "created_at"],
        )

    # ---- issues (cap to ~30 with realistic open/resolved split) ----
    rng.shuffle(issues_buffer)
    issues_capped = issues_buffer[:30]
    issue_resolution_split = 20  # first 20 resolved, last 10 open

    resolution_notes_pool = [
        "Discussed with care team; care plan updated.",
        "Resident repositioned and reassessed; no further concern.",
        "Family contacted, plan reviewed.",
        "In-service scheduled for staff. Compliance verified next round.",
        "Reordered supplies; restocked at unit.",
        "Pain reassessed and PRN administered; effective in 30 min.",
        "Skin breakdown wound-care nurse consulted; new dressing applied.",
        "Footwear replaced; resident educated on importance.",
        "Maintenance work order submitted and resolved same day.",
        "Mood concern referred to social services; visit conducted.",
    ]

    issues_records: list[tuple] = []
    notifications_records: list[tuple] = []
    for idx, issue in enumerate(issues_capped):
        iid = _uuid()
        is_resolved = idx < issue_resolution_split
        dept_id = q_to_dept.get(issue["question_id"])
        issues_records.append((
            uuid.UUID(iid),
            uuid.UUID(issue["round_id"]),
            uuid.UUID(issue["question_id"]),
            uuid.UUID(issue["resident_id"]),
            uuid.UUID(issue["angel_id"]),
            uuid.UUID(dept_id) if dept_id else None,
            "resolved" if is_resolved else "open",
            issue["completed_at"],
            issue["completed_at"] + dt.timedelta(hours=rng.randint(2, 36)) if is_resolved else None,
            uuid.UUID(charge_id) if is_resolved else None,
            rng.choice(resolution_notes_pool) if is_resolved else None,
        ))

        # ---- issue_notifications: notify the responsible dept head + DON for every issue ----
        notify_user = dept_to_first_user.get(dept_id) if dept_id is not None else None
        if notify_user is not None and notify_user != admin_id:
            notifications_records.append((
                uuid.UUID(_uuid()),
                uuid.UUID(iid),
                uuid.UUID(notify_user),
                issue["completed_at"],
                "in_app",
            ))
        # Always notify the DON
        notifications_records.append((
            uuid.UUID(_uuid()),
            uuid.UUID(iid),
            uuid.UUID(admin_id),
            issue["completed_at"],
            "in_app",
        ))

    if issues_records:
        await conn.copy_records_to_table(
            "issues",
            records=issues_records,
            columns=[
                "id", "round_id", "question_id", "resident_id", "angel_id",
                "department_id", "status", "created_at", "resolved_at",
                "resolved_by", "resolution_notes",
            ],
        )
    if notifications_records:
        await conn.copy_records_to_table(
            "issue_notifications",
            records=notifications_records,
            columns=["id", "issue_id", "notified_user_id", "notified_at", "channel"],
        )

    # ---- QAA notes ----
    await conn.execute(
        "INSERT INTO qaa_notes (id, facility_id, content) VALUES ($1, $2, $3)",
        _uuid(), FACILITY_ID, QAA_NOTES_TEXT,
    )

    return {
        "departments": len(DEPARTMENTS),
        "users": 1 + len(ANGEL_PROFILES) + 2,  # admin + angels + charge + viewer
        "angels": len(angel_ids),
        "residents": len(RESIDENTS),
        "resident_groups": 3,
        "qapis_active": len(QAPIS_ACTIVE),
        "qapis_archived": len(QAPIS_ARCHIVED),
        "qapi_items": sum(len(q["items"]) for q in QAPIS_ACTIVE + QAPIS_ARCHIVED),
        "questions": len(QUESTIONS),
        "round_templates": 2,
        "rounds": rounds_inserted,
        "round_answers": len(answers_buffer),
        "issues_total": len(issues_capped),
        "issues_open": max(0, len(issues_capped) - issue_resolution_split),
        "issues_resolved": min(issue_resolution_split, len(issues_capped)),
        "qaa_notes": 1,
    }
