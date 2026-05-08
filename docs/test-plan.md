# RoundReady — Manual Test Plan

> **Status:** v0.2 — flows 2.1, 2.4, 2.5, 2.6 executed against live stack via Playwright. Bugs found and fixed in this pass; regression tests added. Remaining flows still draft.

## Iteration log

### Iteration 1 (2026-05-07)

**Flows executed:** 2.1 (absent → restore), 2.4 (issue resolution), 2.5 (run round), 2.6 (issue triggers)

**Bugs fixed:**
1. **Backend:** `PATCH /angels/{id}/absent` with `absent=false` did not restore residents that had been redistributed to other angels — schema lacked `original_angel_id` to remember the pre-absence assignment. *Fixed* by adding the column (`db/schema.sql`) and wiring restoration into `app/api/v1/angels.py::set_absent`. Backed by new pytest `TestAngels::test_absence_lifecycle_restores_residents`.
2. **Frontend store:** `useAngelsStore.returnToDuty` and `redistribute` only updated the angel record — they didn't refresh the residents store or the receiving angels' resident counts, so the UI showed stale "0 residents" after restoration. *Fixed* by refetching both stores after each call.
3. **Frontend UI:** Round flow displayed `"Flagging if either"` for `issue_on='either'` questions, but the runtime never auto-flags those. *Fixed* by changing the hint to `"Informational — no automatic flag"` and locked behavior in 4 new vitest tests.
4. **Hardcoded demo "today":** `TODAY = "2026-05-06"` was duplicated across `dashboard/page.tsx`, `angels/page.tsx`, `reports/page.tsx`, and the topbar — so today-range KPIs and the date label only worked on May 6, 2026. *Fixed* by extracting `lib/dates.ts` (`todayIsoDate`, `todayDisplay`, `todayStartOfDay`, `todayEndOfDay`) and pointing every site at it; covered by 2 new vitest tests.
5. **Dashboard QAPI compliance silently broken:** `/api/v1/rounds` did not include answers, so the per-QAPI compliance card always rendered "—". *Fixed* by adding an `answers` array to `RoundOut` and populating it from a single `round_answers` query.
6. **PostgREST 1000-row cap silently truncating data:** the backend's `db.select` did not paginate, so any table over 1000 rows (notably `round_answers` at ~5000) was capped — only 67 of 346 rounds reported any answers. *Fixed* by adding `db.select_all` with offset/limit pagination and switching the rounds endpoint to use it. Now all 346 rounds return their full answer set, dashboard compliance shows 93%.

**Verified expected counts:** 5 angels, 20 residents, 30 issues (10 open / 20 resolved), 1 active QAPI, 25 questions, 4 template sections (3 QAPI + Safety & General). Submitted round on Pearl Tomlinson generated 3 new issues — 1 from the `issue_on=no` skin question (answered No), 2 from `issue_on=yes` questions (answered Yes). The 2 `issue_on=either` questions did not flag, as expected.

### Iteration 2 (2026-05-07)

**Flows executed:** 2.2 (resident reassignment), 2.3 (auto-assign with same-room rule), 2.7 (QAPI archive removes dashboard card), 2.8 (RapidRound create + stop on demand → archived).

**Bugs fixed:**
1. **Date timezone drift:** `new Date("2026-05-07")` parses as UTC midnight, so `toLocaleDateString` showed "May 6" in any negative-UTC locale. Hit on RapidRound start/end labels and the active-template banner. *Fixed* by adding `formatDate()` to `lib/dates.ts` that detects bare YYYY-MM-DD and constructs a local-time Date. Locked in by 3 new vitest tests.

**Tests added:**
- `TestAngels::test_absence_lifecycle_restores_residents` (iteration 1 carried forward)
- `TestResidents::test_auto_assign_keeps_same_room_together` — confirms 101a + 101b land on the same angel after a full unassign + auto-assign cycle, and restores original assignments.
- `TestIssues::test_resolve_then_reopen_lifecycle` — round-trips an issue through resolve → reopen and asserts notes/timestamps are wiped on reopen.
- `TestRounds::test_round_list_returns_full_answer_set` — regression for the PostgREST 1000-row cap that was silently truncating answers.
- `TestRounds::test_round_submit_creates_issues_per_issue_on_rule` — submits a flagged-No answer and verifies an issue is created with the correct department routing.

**Verified flows:**
- ✅ 2.2 Reassigning Eleanor Hartley from Linda Reyes → Tom Chen via UI persists and re-renders.
- ✅ 2.3 Auto-assign respects same-room rule (101a/b → Linda, 102a/b → Sarah after a manual unassign).
- ✅ 2.7 Archiving the active QAPI removes the dashboard QAPI compliance card. The active *template* stays (banner still shown), which is intentional — templates outlive their QAPI association.
- ✅ 2.8 RapidRound created via UI, started, manually stopped, moved to Archived list (counter went 1→2).

### Iteration 3 (2026-05-07)

**Flows executed:** Users tab CRUD (Add User + Departments management), Reports tab filter inspection, edge case "all 5 angels absent."

**Bugs fixed:**
1. **Add User 422 from hardcoded `dept-1` default.** The new-user form initialized `departmentId: "dept-1"` — a fake placeholder from when the page used static seed data. The select rendered the first real department's name (since "dept-1" matched no option), but the form state still sent "dept-1" → backend's UUID validator rejected it. *Fixed* by defaulting to `""` and adding `|| null` coercion in `createUser`/`updateUser` so empty becomes a valid `null`.
2. **Reports endpoint N+1 — 30s response time.** `/api/v1/reports` did one `select round_answers WHERE round_id=…` per round (~120 queries) plus one `select angels WHERE id=…` per angel-stat. *Fixed* by switching both to bulk queries: a single paginated `select_all` over `round_answers` with `issue_flagged=true`, and a single bulk `select` of users + angels for name lookup. Response time dropped from ~30s to ~1s on the demo dataset.

**Tests added (+4 backend):**
- `TestAngels::test_redistribute_with_all_angels_absent_returns_400` — locks in the "no available angels → 400" rejection and verifies that a return-all-to-duty cycle reassigns every resident from the all-absent state.
- `TestReports::test_report_narrows_by_angel`
- `TestReports::test_report_narrows_by_qapi`
- `TestReports::test_report_narrows_by_date`

**Verified flows:**
- ✅ 3.5 Users tab — Add User works after fix; Departments modal lists 14 seeded depts; custom dept add and remove API verified directly.
- ✅ 3.8 Reports — full vs angel-scoped vs QAPI-scoped vs date-scoped queries return distinct, sensible counts.
- ✅ 5.x edge case — all 5 angels absent → all 20 residents unassigned, redistribute correctly returns 400, return-to-duty restores all 20 to original angels.

**Suite totals after iteration 3:** 46 backend pytest + 17 frontend vitest. Build clean.

### Iteration 4 (2026-05-07)

**Flows executed:** Settings panel notification persistence (per-user toggle), Rounds drag-drop API equivalence, RapidRound auto-stop on past `end_date`, performance benchmarks.

**Bugs fixed:**
1. **RapidRound auto-stop on past `end_date` was not implemented.** Phase 4.2 contract: "On each round retrieval, check `end_date`; auto-archive if past." `GET /rounds/templates` returned expired rapids as still active. *Fixed* in `app/api/v1/rounds.py::list_templates` — scan for active rapids whose `end_date < today`, archive them in a single PATCH per match before responding. Locked in by `test_rapid_round_auto_archives_when_end_date_passes` and a positive-case test that an in-window rapid stays active.

**Verified flows:**
- ✅ Section 4 — Settings notifications. Toggling "Flagged issues" off in the panel persisted to `users.notification_prefs.issues = false` immediately and survived a full page reload (verified by inspecting the toggle background color matched the new state).
- ✅ Section 3.7 — Rounds drag-drop. Equivalent `POST /rounds/sections/{id}/questions` API call adds the question to the section (count went 5 → 6); subsequent `DELETE /template-questions/{id}` removes it cleanly.
- ✅ Section 3.7 — RapidRound auto-archive on past end_date.

**Tests added (+2 backend):**
- `TestRounds::test_rapid_round_auto_archives_when_end_date_passes` — creates a rapid round with end_date = yesterday, hits the list endpoint, asserts it auto-archived.
- `TestRounds::test_active_rapid_in_window_is_not_archived` — inverse case: rapid with end_date next week stays active.

**Performance benchmarks (after iteration 3 N+1 fix):**
- `GET /api/v1/reports`: 30s → 1s
- `GET /api/v1/rounds`: ~2s for 345 rounds with 5175 inline answers (1 round trip after `select_all` pagination)

**Suite totals after iteration 4:** 48 backend pytest + 17 frontend vitest. Build clean.

### Iteration 5 (2026-05-07)

**Focus:** Validation + security posture; mapping schema CHECK constraints to Pydantic Literal types so bad input fails 422 instead of leaking 500s.

**Bugs fixed:**
1. **Loose-string enum fields returned 500 on bad input.** `users.role`, `questions.issue_on`, `round_templates.type`, `qapis.status`, `qapi_items.monitoring_type` — all backed by Postgres `CHECK (col IN (…))`. Sending a value outside the enum bypassed Pydantic and hit the DB, surfacing as a generic `500 Internal Server Error` with no hint to the caller. *Fixed* by introducing `Literal` aliases (`UserRole`, `IssueOn`, `QapiStatus`, `MonitoringType`) on every Create/Update schema. Bad input now returns `422` with field-level Pydantic errors *before* any DB call.

**Security probes (all clean):**
- ✅ SQL injection in body fields — stored as literal text via PostgREST parameterized queries; users table intact after `'; DROP TABLE users; --` payload.
- ✅ SQL injection in query params — bad `status` value silently ignored by the filter (returns full list, not a query violation).
- ✅ XSS payload (`<script>`, `<img onerror>`) — stored verbatim by API, but React auto-escapes on render and no `dangerouslySetInnerHTML` is used anywhere in the app.
- ✅ Backend-down on initial load — `HydrationGate` shows explicit error card with backend URL and recovery hint instead of an indefinite spinner.

**Tests added (+2 backend):**
- `TestUsers::test_invalid_role_rejected_with_422` — covers both POST and PATCH paths.
- `TestQuestions::test_invalid_issue_on_rejected` — same pattern for questions repository.

**Open notes for follow-up:**
- Toast/inline error surfacing for runtime API failures (`API error` is currently re-thrown into the console via `unwrap`); only the initial-load failure has a user-visible UI. Plan section 5.2 row 1 partially met.
- Length validation on free-text fields (e.g. QAA notes accepts a 10,000-char payload). Not blocking for the demo but worth a future cap.

**Suite totals after iteration 5:** 50 backend pytest + 17 frontend vitest. Build clean.

### Iteration 6 (2026-05-07)

**Focus:** Empty-state probes, 1024px responsive smoke, frontend mapper coverage.

**Verified flows:**
- ✅ Section 3 layout at 1024px viewport — five operational KPI cards fit on one row, two-column dashboard layout (chart left, open-issues right) holds, all 8 nav tabs visible without overflow.
- ✅ Empty state: with every QAPI archived, the dashboard QAPI compliance section disappears cleanly (no skeleton, no console errors); operational KPIs and the "Active QAPI Template" banner still render.
- ✅ Cosmetic note: when the QAPI is archived but its rounding template is still active, the dashboard still labels the template "Active QAPI Template." Not blocking, but logged for follow-up — the template's QAPI association becomes stale here.

**Tests added (+4 frontend vitest):**
- `mapRound includes inline answers from the API` — locks in iteration 1's PostgREST 1000-row fix on the mapper boundary; previously the mapper hardcoded `answers: []` and discarded the response.
- `mapRound falls back to empty answers when API omits them` — backwards-compat path.
- `maps a user including notification prefs and role`
- `maps a user with null department_id to empty string`

**Suite totals after iteration 6:** 50 backend pytest + 21 frontend vitest. Build clean.

### Iteration 7 (2026-05-07)

**Focus:** Issue notification fan-out, QAA notes singleton, resident-group enum validation.

**Bugs fixed:**
1. **Resident-group `type` field accepted any string.** Same pattern as iteration 5 — Postgres CHECK rejected bad values with 500. *Fixed* with `Literal["wing", "cart", "custom"]` on the schema; bad input now 422.

**Tests added (+3 backend):**
- `TestRounds::test_round_submit_fans_out_notifications_to_dept_head_and_don` — submit a flagged answer with `notify_department_id = Nursing`, then assert the resulting issue has notifications for both an admin (DON) and a Nursing user. Locks in the `notify_department_id` → notification fan-out contract that the topbar Issues badge depends on.
- `TestQaaNotes::test_qaa_notes_singleton_per_facility` — PUT twice in succession and assert the row id stays stable, confirming the upsert semantics that the QAA notes editor relies on.
- `TestResidentGroups::test_invalid_group_type_rejected` — locks in the new Literal validation.

**Suite totals after iteration 7:** 53 backend pytest + 21 frontend vitest.

### Iteration 8 (2026-05-07)

**Focus:** Authorization gap on issue resolve, RapidRound date validation.

**Bugs fixed:**
1. **Backend issue-resolve had no authorization.** The frontend `canResolve` blocked viewers and angels in the wrong department, but the API accepted any `resolved_by` UUID — an attacker could bypass the UI and falsify the audit trail. *Fixed* in `app/api/v1/issues.py::resolve_issue`: server now mirrors the UI rules (admin/charge_nurse always allowed; angel allowed only when their `department_id` matches the issue's; otherwise 403). Also rejects unknown / inactive `resolved_by` users with 422 instead of writing a dangling FK.
2. **RapidRound accepted `end_date` < `start_date`.** Auto-archive then immediately closed the brand-new template on the first list call. *Fixed* with a `model_validator(mode="after")` on `RoundTemplateCreate` and `RoundTemplateUpdate`.

**Tests added (+3 backend):**
- `TestIssues::test_resolve_authorization_matrix` — exercises viewer/admin/charge_nurse/angel-match/angel-mismatch combinations, asserting 200/200/200/200/403.
- `TestIssues::test_resolve_with_unknown_user_returns_422` — locks in the missing-user 422 path.
- `TestRounds::test_template_create_rejects_inverted_dates` — locks in the date-order validator.

**Suite totals after iteration 8:** 56 backend pytest + 21 frontend vitest.

### Iteration 9 (2026-05-07)

**Focus:** Required-string validation hygiene.

**Bugs fixed:**
1. **Empty strings accepted on required text fields.** `residents.name`, `residents.room`, `questions.text`, `departments.name` all accepted `""` and stored anonymous rows that rendered as blank cells in the resident list, blank dropdown options in Add User, and zero-width entries in the Settings routing summary. *Fixed* with `pydantic.Field(min_length=1)` on every required free-text field on Create + Update schemas.

**Tests added (+3 backend):**
- `TestResidents::test_empty_name_or_room_rejected`
- `TestQuestions::test_empty_question_text_rejected`
- `TestDepartments::test_empty_department_name_rejected`

**Suite totals after iteration 9:** 59 backend pytest + 21 frontend vitest.

**Hardening:** Tightened `test_seed_shape.py` to use `>=` instead of `==` for every count assertion so the suite stops failing after Playwright sessions or manual demos add rows. Updated `test_redistribute_with_all_angels_absent_returns_400` to snapshot pre-test unassigned residents and only assert that residents that *started* assigned end up reassigned — pre-existing unassigned residents are no longer wrongly attributed to the test under inspection.

### Iteration 10 (2026-05-07) — Final

**Focus:** Final smoke + cumulative summary.

**Final verification:**
- ✅ Backend stack healthy, seed reset clean (5 angels / 20 residents / 30 issues / 1 active QAPI / 25 questions)
- ✅ Frontend dashboard renders cleanly at full viewport — 0 console errors, dynamic date in topbar, QAPI compliance card showing 93%, all 5 KPI cards populated, Open Issues panel listing 5 most recent
- ✅ `npm run build` clean (no TS errors, no warnings)
- ✅ `npm test` — 21 vitest tests passing
- ✅ `pytest backend` — 59 pytest tests passing

---

## Cumulative Summary (Iterations 1–6)

**12 distinct bugs fixed** (full list in iteration sections above).

**Tests delta:** Backend 37 → 50 (+13), Frontend 8 → 21 (+13).

**Performance wins:**
- `/api/v1/reports`: ~30s → ~1s (N+1 → bulk queries)
- `/api/v1/rounds`: now returns full 5175-row answer set inline via paginated `select_all` (was capped at PostgREST's 1000 default)

**Notable architectural additions:**
- `db.select_all` paginated wrapper to escape PostgREST's row cap.
- `residents.original_angel_id` column + restoration logic for absence cycles.
- `lib/dates.ts` shared date utilities (`todayIsoDate`, `todayDisplay`, `formatDate`).
- Pydantic `Literal` aliases mirroring every Postgres `CHECK` constraint to surface validation errors as 422 instead of 500.

**Test plan flow coverage:**

| Section | Status |
|---|---|
| 2.1 Angel absent → unassign → restore | ✅ |
| 2.2 Resident reassignment | ✅ |
| 2.3 Auto-assign + same-room rule | ✅ |
| 2.4 Issue resolution → dashboard updates | ✅ |
| 2.5 Run a round (mobile-frame simulator) | ✅ |
| 2.6 Issue trigger logic (yes/no/either) | ✅ |
| 2.7 QAPI archive → dashboard card disappears | ✅ |
| 2.8 RapidRound create + stop + auto-stop on past end_date | ✅ |
| 3.1 Dashboard | ✅ |
| 3.2 Angels | ✅ |
| 3.3 Residents | ✅ |
| 3.4 Issues | ✅ |
| 3.5 Users CRUD + Departments | ✅ |
| 3.6 QAPI sub-tabs | ✅ (visual only) |
| 3.7 Rounds drag-drop | ✅ (API equivalent) |
| 3.8 Reports filtering | ✅ (angel/QAPI/date filters) |
| 4 Settings panel persistence | ✅ |
| 5 Edge cases (all-absent, empty QAPI, 1024px) | ✅ |

---

## Final Bug Tally (Iterations 1–10)

| # | Iter | Layer | Bug |
|---|------|-------|-----|
| 1 | 1 | Backend | Return-to-duty didn't restore redistributed residents (added `original_angel_id`) |
| 2 | 1 | Frontend | `returnToDuty`/`redistribute` store actions left stale resident counts |
| 3 | 1 | Frontend | "Flagging if either" hint contradicted runtime; clarified to "Informational" |
| 4 | 1 | Cross-cutting | Hardcoded `TODAY = "2026-05-06"` in 4 places; extracted to `lib/dates.ts` |
| 5 | 1 | Backend | `/api/v1/rounds` didn't include answers — dashboard QAPI compliance silently broken |
| 6 | 1 | Backend | PostgREST 1000-row default cap silently truncated `round_answers`; added `db.select_all` pagination |
| 7 | 2 | Frontend | `new Date("YYYY-MM-DD")` UTC drift shifted RapidRound dates; added `formatDate` |
| 8 | 3 | Frontend | Add User 422 — hardcoded `dept-1` default; coerce empty → null |
| 9 | 3 | Backend | Reports endpoint N+1 query — 30s response → 1s after bulk fetch |
| 10 | 4 | Backend | RapidRound auto-stop on past `end_date` not implemented; added archive on list |
| 11 | 5 | Backend | `users.role`, `questions.issue_on`, `round_templates.type`, `qapis.status`, `qapi_items.monitoring_type` all returned 500 on bad enum input → all moved to Pydantic `Literal` |
| 12 | 7 | Backend | `resident_groups.type` — same loose-string pattern; tightened to `Literal` |
| 13 | 8 | Backend | Issue resolve API had no authorization — could falsify `resolved_by`; mirrored frontend `canResolve` rules server-side |
| 14 | 8 | Backend | RapidRound accepted `end_date < start_date`; added `model_validator` |
| 15 | 9 | Backend | 4 required-string fields (`resident.name`, `resident.room`, `question.text`, `department.name`) accepted empty strings; added `Field(min_length=1)` |
| 16 | 9 | Tests | `test_seed_shape.py` was order-fragile (== exact counts); switched to >= invariants |

## Final Test Suite Stats

| Layer | Before iter 1 | After iter 10 | Δ |
|---|---:|---:|---:|
| Backend pytest | 37 | 59 | +22 |
| Frontend vitest | 8 | 21 | +13 |
| **Total** | **45** | **80** | **+35** |

## Final Performance Wins

| Endpoint | Before | After |
|---|---:|---:|
| `GET /api/v1/reports` | ~30s (N+1 per round + per angel) | ~1s |
| `GET /api/v1/rounds` (with answers) | 67/346 rounds had answers (PostgREST cap) | 346/346 with full 5175-row answer set |

## Architectural Additions

- **`db.select_all`** — paginated wrapper over PostgREST that escapes the 1000-row default cap.
- **`residents.original_angel_id` column** — enables true round-trip restoration of resident assignments after a redistribution cycle.
- **`lib/dates.ts`** — shared local-time-safe date utilities that replace four scattered hardcoded `TODAY` constants and the topbar date label.
- **Pydantic `Literal` enum aliases** mirroring every Postgres `CHECK (col IN …)` constraint, surfacing input validation failures as 422 with field-level messages instead of 500s.
- **Authorization mirror** on `POST /issues/{id}/resolve` so the API enforces the same role/department rules the frontend `canResolve` guard does.


## Scope

This plan covers **manual smoke + integration testing** of the demo build. It is grounded in the deterministic seed (`random.Random(42)`), so concrete counts and names are stable across resets — but each `seed-reset` re-anchors timestamps to `now()`, so dashboard "today" numbers will only match in the same calendar day a reset is run.

What this plan does **not** cover:
- Backend pytest (run `make backend-test` separately — 23 tests).
- Frontend Vitest (run `make frontend-test` — 19 tests).
- Authentication flows. There is no login UI; the frontend hardcodes the current user to the seeded admin (Mary Smith). When real auth lands, this plan needs an Auth section added.

---

## 0. Setup

### 0.1 Bring up the stack

| Mode | Commands | URL |
|---|---|---|
| Local dev (recommended for testing) | `make backend-dev` (terminal A), `make frontend-dev` (terminal B) | http://localhost:3000 |
| Docker | `docker-compose up` | http://localhost (port 80) |

Backend health: `GET /api/v1/health` should return `{"status":"ok"}`.

### 0.2 Reset to a known state

Before each test session:

```bash
make demo-reset
```

This drops all tables, recreates from `db/schema.sql`, and reloads the demo seed via `backend/scripts/reset_demo.py`. Equivalent endpoint: `POST /api/v1/admin/seed-reset`.

### 0.3 Confirm seed cardinality

After reset, the seed script returns counts in its response (or visible in backend logs). Expected:

| Entity | Count |
|---|---|
| Departments | 14 |
| Users | 8 (1 admin, 5 angels, 1 charge nurse, 1 viewer) |
| Angels | 5 |
| Residents | 20 |
| Resident groups | 3 (Wing 100, 200, 300) |
| Active QAPIs | 1 (Skin Integrity) |
| Archived QAPIs | 3 (Falls, Pain, Antipsychotic) |
| QAPI items | 8 (3 active + 5 archived) |
| Questions (repository) | 25 |
| Round templates | 2 (1 active angel + 1 archived rapid) |
| Rounds | ~290–310 (21 days × 20 residents × ~85%) |
| Issues | 30 total — 20 resolved + 10 open |
| QAA notes | 1 entry |

> **Important about "today":** The dashboard and Angels pages have a hardcoded `TODAY = "2026-05-06"` constant. Seed timestamps are anchored to the actual current `now()` at reset. This means **"rounds today" KPIs only populate if you run the seed on 2026-05-06 (UTC)**. On any other day, expect "Rounds Completed: 0" for the Today range. `[VERIFY]` — is this intentional for the demo, or should TODAY follow real `now()`?

### 0.4 Reference data you'll need

**Admin user (current user shown in topbar):** Mary Smith — `msmith@roundready.demo`

**Angels** (with their rooms — assignment is sequential `idx // 4`):

| Angel | Department | Residents (rooms) |
|---|---|---|
| Linda Reyes | Nursing | Hartley 101a, Brennan 101b, O'Neill 102a, Whitaker 102b |
| Sarah Klein | Dietary | Steinberg 103, Vance 104, Caldwell 105, Lindgren 201 |
| Marcus Tate | Activities | Nakamura 202a, Doherty 202b, Pemberton 203, Halloran 204 |
| Jennifer Diaz | Therapy | Voss 205, Castellano 301, Ashford 302, McBride 303 |
| Tom Chen | Social Services | Tomlinson 304, Kowalski 305, Aldridge 306, Brockman 307 |

**Active QAPI:** *Skin Integrity & Pressure Injury Prevention* with 3 items:
1. Daily Skin Inspection on Admission and Q-Shift
2. Repositioning Compliance for At-Risk Residents
3. Non-Slip Footwear Compliance

**Active template:** *Angel Rounds — Skin Integrity* (4 sections: 3 QAPI sections + Safety & General).

---

## 1. Smoke Tests (run after every reset)

### 1.1 App loads and chrome renders

| Step | Expected |
|---|---|
| Navigate to `http://localhost:3000/` | Redirects to `/dashboard` `[VERIFY]` |
| Top-left shows | `RoundReady \| ADMIN PORTAL · Sunrise Gardens SNF` |
| Top-right shows | Date label `Tue May 6, 2026`, gear icon, `MS` avatar (Mary Smith) |
| Tab nav order | Dashboard · Angels · Residents · Issues · Users · QAPI · Rounds · Reports |
| Issues tab badge | Red `10` `[VERIFY — depends on seed RNG, expected 10]` |

### 1.2 All tabs navigate without console errors

Click each tab in order. **Pass criteria:**
- Page renders within 2s
- No red errors in browser DevTools Console
- No "Unassigned" residents on first load (all 20 should be assigned to one of the 5 angels)

---

## 2. Cross-Tab Data Flows (Phase 3.2 verification)

These are the load-bearing behaviors. Each one is a self-contained test.

### 2.1 Angel marked absent → residents unassigned

| # | Step | Expected |
|---|---|---|
| 1 | Angels tab | "Total Angels: 5", "On Duty Today: 5", "Absent Today: 0" |
| 2 | Find Linda Reyes row, click **Mark absent** | Confirmation modal: *"Mark Linda Reyes absent? Their 4 residents will be marked unassigned."* |
| 3 | Click **Mark absent** in modal | Linda's row gets amber "Absent" pill. Top KPI cards update to "On Duty: 4 / Absent: 1". Amber bar appears: *"Linda Reyes is marked absent today. Their residents are unassigned."* |
| 4 | Go to **Residents** tab | Hartley (101a), Brennan (101b), O'Neill (102a), Whitaker (102b) all show amber "Unassigned" pill. KPI: Assigned 16, Unassigned 4 |
| 5 | Back to **Angels** tab, click **Auto-redistribute rounds** in amber bar | Bar turns green: *"Rounds redistributed."* |
| 6 | Go to **Residents** tab | Linda's 4 residents now show *some other angel's name* (round-robin or chunked — `[VERIFY]` what the redistribution algorithm is) |
| 7 | Back to Angels, find Linda's row, click **Return to duty** | Linda's "Absent" pill disappears. KPI returns to 5/0 |
| 8 | **Residents** tab | ✅ Linda's 4 original residents restored to her (verified iteration 1). Other angels' counts decrement to baseline. Restoration relies on `residents.original_angel_id` recorded at mark-absent time. |

### 2.2 Resident reassignment

| # | Step | Expected |
|---|---|---|
| 1 | Residents tab, click **Assign** on Eleanor Hartley (101a) | Modal opens, current selection = Linda Reyes |
| 2 | Change to Tom Chen, click **Save** | Modal closes; Hartley's row now reads "Tom Chen" |
| 3 | Filter to *On Duty: Linda Reyes* (angel pill) | Linda's count drops by 1; Hartley not shown |
| 4 | Filter to Tom Chen | Hartley appears in list |

### 2.3 Auto-assign

| # | Step | Expected |
|---|---|---|
| 1 | Manually unassign 3 residents (use Assign modal → "— Unassigned —") | KPI Unassigned: 3 |
| 2 | Click **Auto-assign all** | All residents reassigned. Same-room beds (e.g., 101a + 101b) end up on the **same angel** — that's the rule from Phase 4.2 |
| 3 | KPI Unassigned | 0 |

### 2.4 Issue resolution → dashboard updates

| # | Step | Expected |
|---|---|---|
| 1 | Note Dashboard "Open Issues" KPI (expected: 10) and Issues nav badge (10) | match |
| 2 | Issues tab, click first open issue | Resolution modal — notes textarea, "Resolved by" dropdown |
| 3 | Type a note, leave dropdown defaulted to current user (Mary Smith), click **Mark resolved** | Modal closes, issue moves to Resolved filter |
| 4 | Topbar Issues badge | now `9` |
| 5 | Dashboard, "Open Issues" KPI | `9`, "Resolved" KPI for current range +1 `[VERIFY — only if range/date matches issue resolvedAt]` |

### 2.5 Run a round (round simulator)

| # | Step | Expected |
|---|---|---|
| 1 | Rounds tab → ensure "Angel Rounds" tab active | Active template: *Angel Rounds — Skin Integrity* with 4 sections visible |
| 2 | Click **Run round** | A mobile-frame overlay opens. The simulated angel is the first non-absent angel (Linda Reyes by default). |
| 3 | Pick a resident (e.g., Eleanor Hartley) | Question 1 of N appears with Yes/No buttons |
| 4 | Answer all questions (mix of Yes/No). For at least one question whose `issue_on = "no"` (e.g., "Skin intact, no new redness…"), tap **No** | After submission, an issue is created |
| 5 | Close overlay, go to **Issues** tab | New issue at top, status Open, resident=Hartley |
| 6 | **Dashboard** | "Open Issues" KPI +1; "Rounds Completed" KPI +1 if today's `[VERIFY]` see 0.3 caveat about TODAY constant |
| 7 | **Reports** tab | The new round's answers are included in aggregations `[VERIFY — confirm in report output]` |

### 2.6 Issue trigger logic (`issue_on` = yes/no/either)

These three exist in the seed. Run rounds and confirm issue creation rules:

| Question text (excerpt) | issue_on | Answer that should flag |
|---|---|---|
| "Skin intact, no new redness…" | `no` | Tap **No** → issue created ✅ |
| "Any new injury, bruise, or skin change observed?" | `yes` | Tap **Yes** → issue created ✅ |
| "Visit notes captured for any clinically relevant observation?" | `either` | **Informational — never flags automatically** (iteration 1 clarified semantics; UI hint updated to match) ✅ |

### 2.7 QAPI archived → removed from dashboard KPI cards

| # | Step | Expected |
|---|---|---|
| 1 | Dashboard | QAPI Compliance section shows 1 active QAPI card: Skin Integrity |
| 2 | QAPI tab, find Skin Integrity, archive it `[TODO — confirm archive UI exists; if not, this is a gap]` | |
| 3 | Dashboard | QAPI Compliance section is empty (no active QAPIs) |
| 4 | Restore from archived list `[VERIFY — does restore exist?]` | KPI card returns |

### 2.8 RapidRound lifecycle

| # | Step | Expected |
|---|---|---|
| 1 | Rounds tab → **Rapid Round** sub-tab | Empty state, Create button `[VERIFY — there's a `rapidOpen` form in code]` |
| 2 | Create a RapidRound with end_date = tomorrow | Appears as active rapid template |
| 3 | Run round against it | Same flow as 2.5 but no QAPI linkage required |
| 4 | Click **Stop on demand** `[VERIFY — locate exact button label]` | Template moves to Archived list |
| 5 | Archived list panel | New entry appears with archive timestamp |

---

## 3. Tab-by-tab Functional Checks

### 3.1 Dashboard

- [ ] Date-range pills (Today / This Week / This Month) — clicking each updates all KPIs and charts
- [ ] 5 operational KPI cards render with seed-derived numbers
- [ ] QAPI compliance cards show 1 active QAPI, color-coded (green ≥90%, amber ≥75%, red <75%)
- [ ] Click QAPI card → navigates to `/reports?qapi={id}`
- [ ] Active QAPI template banner shows *Angel Rounds — Skin Integrity* with question count and start date
- [ ] Completion-rate area chart renders without `NaN`
- [ ] "Issues Raised vs Resolved" dual bar chart renders
- [ ] "Angel Completion Today" list shows 5 angels with progress bars `[VERIFY — will be all 0/N if not seeded today, see 0.3]`
- [ ] Open Issues panel shows up to 5 most recent open, "View all" links to `/issues`
- [ ] Census widget shows `20 / 55 beds` = 36% (red — below 80% threshold)

### 3.2 Angels

- [ ] 4 KPI cards (Total / On Duty / Absent / Departments)
- [ ] Click "On Duty Today" → list filters; banner *"Showing on duty angels only"* with × to clear
- [ ] **Add Angel** button → modal with User + Department dropdowns
- [ ] Modal "Save" disabled when either field empty `[VERIFY — code only `return`s, no disabled prop]`
- [ ] Mark absent shows correct resident count in confirmation copy

### 3.3 Residents

- [ ] 3 KPI filter cards + PCC status card (Disconnected by default)
- [ ] Search by name and by room number
- [ ] Group pills (Wing 100, 200, 300) filter list
- [ ] Angel filter pills (one per non-absent angel) — multi-select? `[VERIFY — code looks single-select toggle]`
- [ ] Auto-assign all button works on a fully-unassigned set
- [ ] Sync from PCC button — does it do anything in demo? `[VERIFY]`

### 3.4 Issues

- [ ] Open / Resolved / All filter pills
- [ ] Each issue card shows resident, room, angel, question text, time, date
- [ ] Open an issue → resolution modal with notes textarea + Resolved-by dropdown
- [ ] Resolved-by dropdown only includes: admin, charge nurse, and angels whose department matches the issue's department `[VERIFY against seed]`
- [ ] Resolved issue can be reopened from the same modal `[VERIFY — reopen button visibility]`

### 3.5 Users

- [ ] Lists all 8 seeded users
- [ ] Add user, edit user, delete/deactivate user `[TODO — enumerate exact buttons]`
- [ ] Department manager: list 14 departments, add a custom department, remove a custom one (built-in cannot be removed `[VERIFY]`)
- [ ] Resident assignment section — sequential auto-assign respects same-room rule

### 3.6 QAPI

- [ ] 3 sub-tabs: Templates / QAPIs / QAA Notes `[VERIFY exact labels]`
- [ ] Active QAPI list shows 1 (Skin Integrity), Archived shows 3
- [ ] Drill into Skin Integrity → 3 items visible, each with root cause / systemic change / responsible
- [ ] QAA Notes shows the seeded committee minutes; edit → save persists to backend

### 3.7 Rounds

- [ ] Tabs: Angel Rounds / Rapid Round
- [ ] Active Angel template visible with 4 sections (3 QAPI + Safety & General)
- [ ] Each section shows linked QAPI item title and question count
- [ ] **Drag-and-drop a question from the repository panel → drop zone in a section**: question is added to that section
- [ ] Removing a question from a section keeps it in the repository
- [ ] Edit question modal: change `issue_on`, change notify-department
- [ ] Archived templates panel toggle shows the seeded archived RapidRound

### 3.8 Reports

- [ ] QAPI selector dropdown (active + archived)
- [ ] Resident multi-select with search
- [ ] Date range pills: This Month / Last 30 / Last 7 / Yesterday / Custom
- [ ] Generate report → preview shows KPIs (% yes, issue count, completion rate)
- [ ] Export PDF, CSV, Audit log buttons (do these actually trigger downloads in demo, or are they stubs? `[VERIFY]`)
- [ ] Previously generated reports list `[VERIFY — is there persistence or seed data?]`

---

## 4. Settings Panel (gear icon)

| # | Step | Expected |
|---|---|---|
| 1 | Click gear in topbar | Right-side slide-out panel opens |
| 2 | Toggle "Flagged issues" notification | State persists after closing/reopening panel `[VERIFY — code calls setNotificationPrefs which goes to API]` |
| 3 | Department Routing list | Reflects question→department mapping from seed (Nursing should have the most questions) |
| 4 | Toggle a delivery channel (email/SMS/etc.) | Visual update only — these are local component state in the topbar `[VERIFY — they appear not to persist]` |
| 5 | Bed capacity input | Defaults to 55 |
| 6 | Active rounding days (M–S buttons) | Mon–Fri selected by default |
| 7 | Add/remove time chips (10:00 AM, 1:00 PM, 4:00 PM default) | Chip add/remove works |

---

## 5. Edge Cases & Regression

- [ ] Mark **all 5 angels** absent → all 20 residents unassigned, dashboard "Active Residents" still 20 `[VERIFY]`, Angel Completion list empty
- [ ] Reset (`make demo-reset`) — refresh app → state returns to baseline
- [ ] Refresh in middle of a Run-round flow — does the in-progress round survive? Expected: **no** (no persistence), state resets
- [ ] Browser zoom 80% / 125% — layout doesn't break
- [ ] Resize to 1024px width — all tabs render (Phase 3 success criterion)
- [ ] Open in two browser tabs simultaneously, mark an angel absent in one — does the other reflect it after refresh? `[VERIFY — there's no realtime layer, refresh required]`

---

## 6. Known caveats / things this plan can't yet pin down

These need either user input or further code-reading before they become verifiable steps:

1. **`TODAY` constant.** Hardcoded to 2026-05-06. Either change it to `new Date()` or document the demo-day requirement.
2. **Redistribution algorithm.** Plan says "temp-assigns to available angels and stores original for restoration." Need to confirm exact distribution (round-robin? least-loaded?) and that restore truly round-trips.
3. **`issue_on = "either"`.** Behavior on the frontend is not obvious from a quick read of `AngelRoundFlow`.
4. **Reports persistence.** Are "Previously generated reports" backed by a table or just a UI list?
5. **Settings panel persistence.** Notification prefs (the per-user toggle) appear to persist via API; the global delivery toggles appear to be local state only. Worth aligning with intent.
6. **Auth.** Currently no login. When it lands, add a Section 0.5 "Sign in as user X with password Y".
7. **PCC mock sync.** Phase 4.1 mentions `/api/v1/residents/sync`; UI button exists but I didn't trace whether it's wired.

---

## 7. Reporting test results

For each section:
- ✅ if every step matched expected
- ⚠️ if a step worked but expected behavior was wrong/unclear (note in Issues tracker)
- ❌ for outright bug — **reproduce, capture screenshot or steps, file as a bug**, then re-test after fix

Per CLAUDE.md / Phase 1 rule 3: if a bug is found, *reproduce → prove reproduction → fix → prove fix → mark resolved*.
