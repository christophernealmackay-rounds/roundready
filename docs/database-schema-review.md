# RoundReady Database Schema Review

Date: 2026-05-18
Reviewer: automated schema audit (local `db/schema.sql` + live Supabase project `kzrjfctrcvqahfdgdfdv` / `christophernealmackay-rounds's Project`, Postgres 17)
Scope: read-only. No DDL or data was modified.

---

## Summary

### Table inventory (18 tables, live row counts)

| Table | Rows | PK | Notes |
|---|---:|---|---|
| departments | 14 | `id` | |
| users | 8 | `id` | `email` UNIQUE |
| angels | 5 | `id` | `user_id` UNIQUE |
| residents | 20 | `id` | |
| resident_groups | 3 | `id` | |
| resident_group_memberships | 20 | `(resident_id, group_id)` | composite PK (correct) |
| qapis | 4 | `id` | |
| qapi_items | 8 | `id` | |
| questions | 27 | `id` | |
| round_templates | 2 | `id` | |
| template_sections | 4 | `id` | |
| template_questions | 15 | `id` | |
| rounds | 345 | `id` | |
| round_answers | 5175 | `id` | largest table |
| issues | 30 | `id` | |
| issue_notifications | 54 | `id` | |
| qaa_notes | 1 | `id` | legacy singleton |
| qaa_meeting_notes | 1 | `id` | active table |
| facility_settings | 1 | `id` | |

The live schema is an exact match to `db/schema.sql` — same columns, types, defaults, CHECK constraints, PKs, FKs, RLS policies. **No schema drift detected.** (One inactive sibling Supabase project, `cli_roundready` / `sftgrrxdufwdkmioxpes`, exists but is dormant and not the app DB.)

### Findings by category and priority

| Category | High | Medium | Low |
|---|---:|---:|---:|
| Unused / unnecessary fields | 0 | 1 | 4 |
| Primary keys | 0 | 0 | 0 |
| Foreign keys & indexes | 0 | 1 | 1 |
| Portability | 0 | 1 | 1 |

### Overall portability verdict

**Portable with one trivial fix.** A `pg_dump`/`pg_restore` onto a vanilla Postgres 13+ instance would succeed with a single edit: the RLS policies grant to the Supabase-managed `authenticated` role, which does not exist on a plain server, so `CREATE POLICY ... TO authenticated` will fail. There is **no use of the `auth.*` schema**, no policies referencing Supabase auth functions, no `auth.*` column defaults, and `gen_random_uuid()` resolves from core `pg_catalog` (Postgres 13+), not the Supabase `extensions` schema. The schema is fundamentally vanilla-Postgres clean.

---

## Unused / Unnecessary Fields

Methodology: each suspect column was grepped across `backend/` and `frontend/src/`, and population was measured on the live DB with `count(*) FILTER (WHERE col IS NOT NULL)` queries.

### MEDIUM — `qaa_notes` table (entire table is legacy/dead)

- Evidence: `qaa_notes` (1 row) is read/written only by the legacy singleton route `backend/app/api/v1/qaa_notes.py` and surfaced into the bootstrap payload as `qaaNotes` (`frontend/src/lib/api/bootstrap.ts`, `HydrationGate.tsx`). A grep of the entire `frontend/src/app/(app)/qapi/` tab returned **no references** to `qaaNotes`/`qaa_notes` — the QAPI "QAA Committee notes" UI is driven by the newer `qaa_meeting_notes` table instead. `db/schema.sql:283-285` itself comments the table is "replaces[d by] qaa_meeting_notes for everything except legacy compatibility."
- Risk: a whole table + route + RLS policy + bootstrap field maintained for a feature that the UI no longer uses. Confusing for new contributors; widens the bootstrap payload.
- Recommendation: confirm no client path renders `qaaNotes`, then retire the table and its route in a follow-up. DDL when ready:
  ```sql
  DROP TABLE IF EXISTS qaa_notes CASCADE;
  ```
  (Keep it if you want backward-compatible API consumers; otherwise remove the table, the `qaa_notes_router`, and the `qaaNotes` bootstrap field together.)

### LOW — columns that are app-wired but always NULL/default in current seed data

These are **not** dead columns — they have full read/write code paths and are exercised by state transitions or feature paths. They are only empty because the current seed fixture happens not to populate them. Listed for completeness; **no action recommended**.

| Column | Live population | Why empty | Verdict |
|---|---|---|---|
| `residents.original_angel_id` | 0/20 set | only written during an angel-absence redistribution; no angel is absent in the seed | keep — core absence-cycle mechanic, fully coded in `backend/app/api/v1/angels.py` |
| `angels.absent_since` | 0/5 set | same — set only when an angel is marked absent | keep |
| `round_templates.deployed_at` | 0/2 set | rapid-round "Deploy to Angels" not used in seed; both templates are angel-type | keep — RapidRound deploy gate |
| `round_answers.answer_number` | 0/5175 set | the 2 scale questions have no answers in the seed; yes/no answers correctly leave it NULL | keep — scale-question support is fully wired (`rounds.py`, `mappers.ts`, tests) |
| `departments.custom` | 0/14 true | no custom departments created in seed | keep — drives "remove custom department" UI |

### LOW — `questions.department_id` vs `questions.notify_department_id` (possible redundancy)

- Evidence: both columns exist and both are written/cleared by `backend/app/api/v1/questions.py:36-62`. `notify_department_id` is the documented domain field ("assigned department head to notify if an issue is found", per CLAUDE.md and `db/schema.sql:160-161`). The role of plain `department_id` on `questions` is not clearly distinct in the domain spec.
- Risk: low — two near-synonymous nullable FKs to `departments` invite confusion about which one drives issue routing.
- Recommendation: no change required, but document the intended distinction in `db/schema.sql` (e.g. `department_id` = the department that owns/authored the question for repository organization; `notify_department_id` = who gets the issue). If they always carry the same value in practice, consider collapsing to one column post-MVP.

### LOW — `facility_id` is a free-floating UUID with no `facilities` table

- Evidence: `departments`, `resident_groups`, `qaa_notes`, `qaa_meeting_notes`, `facility_settings` all carry a nullable `facility_id UUID` with **no FK** (there is no `facilities` table — `db/schema.sql:41` explicitly drops a legacy `facilities`). Live data uses a single hardcoded constant `FACILITY_ID = "c3d30612-..."` (`backend/app/api/v1/facility.py:13`); `distinct_facilities = 1`.
- Risk: low for a single-facility MVP, but the column is a soft pointer with no referential integrity. If multi-facility is ever introduced this becomes a data-integrity hazard.
- Recommendation: acceptable for MVP. When multi-tenant is on the roadmap, introduce a real `facilities` table and convert these to enforced FKs. Note in schema that `facility_id` is intentionally unconstrained for now.

---

## Primary Keys

**No issues.** Every table has an appropriate primary key:

- 17 tables use a surrogate `id UUID PRIMARY KEY DEFAULT gen_random_uuid()` — correct, stable, no natural-key coupling.
- `resident_group_memberships` correctly uses a composite PK `(resident_id, group_id)` — the right choice for a pure join table; it also naturally prevents duplicate memberships. No surrogate needed.

No table is missing a PK; no questionable natural keys. This area is sound.

---

## Foreign Keys & Indexes

### Foreign key coverage — all domain relationships are enforced

Every relationship described in the domain is backed by a real FK constraint (verified against the live `pg_constraint` data returned by `list_tables`):

- resident → angel: `residents.angel_id` and `residents.original_angel_id` → `angels.id` (both `ON DELETE SET NULL` — correct; losing an angel should not delete residents)
- qapi_item → qapi parent: `qapi_items.qapi_id` → `qapis.id` `ON DELETE CASCADE` (correct parent/child)
- question → template/section: `template_questions.section_id` → `template_sections.id`, `template_questions.question_id` → `questions.id`, `template_sections.template_id` → `round_templates.id` (CASCADE chain — correct)
- section → qapi / qapi_item: `template_sections.qapi_id`, `template_sections.qapi_item_id` (`ON DELETE SET NULL` — correct, deleting a QAPI shouldn't destroy the template structure)
- issue → resident / department / question / round / angel / resolver: all six FKs present, all `ON DELETE SET NULL` (correct — issues are an audit record and should survive deletion of related entities)
- round → template / angel / resident; round_answer → round / question; issue_notification → issue / user; angel → user; resident_group_membership → resident / group

ON DELETE semantics are domain-appropriate throughout: CASCADE only on true ownership/composition edges (qapi→items, template→sections→questions, round→answers, issue→notifications, user→angel), SET NULL on reference edges where the audit/historical record must outlive the referent. No mis-set ON DELETE behavior found.

### MEDIUM — 16 foreign keys lack a covering index

Confirmed both by inspecting `pg_index` directly and by the Supabase performance advisor (`unindexed_foreign_keys`). FK columns without a covering index force sequential scans on the child table when the parent row is deleted/updated, and slow common join/filter paths.

Unindexed FKs:

| Table | FK column |
|---|---|
| angels | department_id |
| users | department_id |
| questions | department_id |
| questions | notify_department_id |
| issues | round_id |
| issues | question_id |
| issues | resident_id |
| issues | angel_id |
| issues | resolved_by |
| issue_notifications | notified_user_id |
| resident_group_memberships | group_id |
| round_answers | question_id |
| rounds | template_id |
| template_questions | question_id |
| template_sections | qapi_id |
| template_sections | qapi_item_id |

Risk: MEDIUM. At current MVP data volumes (largest table `round_answers` = 5,175 rows) the practical impact is small, but `round_answers(question_id)` and the `issues.*` FKs back the Reports/Issues aggregation paths and will degrade as data grows. `resident_group_memberships(group_id)` and the join-table FKs matter for cascade-delete performance.

Recommendation: add covering indexes in `db/schema.sql` (and apply to live DB via a non-destructive migration when convenient). Suggested DDL — prioritize the report/aggregation paths first:

```sql
-- High-value (aggregation / reporting paths)
CREATE INDEX IF NOT EXISTS round_answers_question_idx     ON round_answers(question_id);
CREATE INDEX IF NOT EXISTS issues_round_idx               ON issues(round_id);
CREATE INDEX IF NOT EXISTS issues_question_idx            ON issues(question_id);
CREATE INDEX IF NOT EXISTS issues_resident_idx            ON issues(resident_id);
CREATE INDEX IF NOT EXISTS issues_angel_idx               ON issues(angel_id);

-- Join / cascade paths
CREATE INDEX IF NOT EXISTS issues_resolved_by_idx         ON issues(resolved_by);
CREATE INDEX IF NOT EXISTS issue_notifications_user_idx   ON issue_notifications(notified_user_id);
CREATE INDEX IF NOT EXISTS rgm_group_idx                  ON resident_group_memberships(group_id);
CREATE INDEX IF NOT EXISTS rounds_template_idx            ON rounds(template_id);
CREATE INDEX IF NOT EXISTS template_questions_question_idx ON template_questions(question_id);
CREATE INDEX IF NOT EXISTS template_sections_qapi_idx     ON template_sections(qapi_id);
CREATE INDEX IF NOT EXISTS template_sections_qapi_item_idx ON template_sections(qapi_item_id);

-- Low-cardinality FKs (small benefit at MVP scale; add for correctness/scale)
CREATE INDEX IF NOT EXISTS angels_department_idx          ON angels(department_id);
CREATE INDEX IF NOT EXISTS users_department_idx           ON users(department_id);
CREATE INDEX IF NOT EXISTS questions_department_idx       ON questions(department_id);
CREATE INDEX IF NOT EXISTS questions_notify_department_idx ON questions(notify_department_id);
```

### LOW — several existing indexes are currently unused

The advisor flags `residents_original_angel_idx`, `residents_room_idx`, `rounds_resident_idx`, `rounds_angel_idx`, `rounds_completed_at_idx`, `issues_status_idx`, `issues_department_idx`, `issue_notifications_issue_idx` as never used.

Risk: very low — this is almost certainly an artifact of low traffic on a demo DB and short uptime since reseed, not evidence the indexes are wrong. They cover sensible filter columns (room lookups, rounds-by-angel for the dashboard, open-issues filter). Keep them. Do **not** treat "unused index" here as a removal signal at this stage.

---

## Portability

Goal: assess a clean `pg_dump`/`pg_restore` onto a vanilla (non-Supabase) Postgres server.

### What is clean (verified)

- **No `auth.*` schema usage.** `cols_default_auth = 0`, `policies_referencing_auth = 0`. No column default, CHECK, or policy references Supabase auth.
- **`gen_random_uuid()` is core, not Supabase.** Confirmed it resolves from `pg_catalog` (`gen_random_uuid_in_pg_catalog = 1`). Built into Postgres 13+; the schema does **not** depend on the Supabase `extensions` schema for UUID generation. (`pgcrypto`/`uuid-ossp` are installed in the Supabase `extensions` schema but the schema does not call into them.)
- **No PostgREST-specific DDL.** No computed columns, no `pg_graphql`, no embedded resource hints in the schema file. The backend talks to the DB via asyncpg/PostgREST but the schema itself carries no PostgREST coupling.
- **RLS model is trivial and self-contained.** 19 permissive `USING (true) WITH CHECK (true)` policies; the backend uses the service role and bypasses RLS entirely.

### MEDIUM — RLS policies grant to the Supabase-managed `authenticated` role

- Evidence: `db/schema.sql:336-354`, all 19 `CREATE POLICY "auth_all" ON <t> FOR ALL TO authenticated ...`. The `authenticated` role is created by Supabase's bootstrap, **not** by this schema file. On a vanilla Postgres server `authenticated` does not exist, so every `CREATE POLICY ... TO authenticated` aborts with `role "authenticated" does not exist`, and (with `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` already applied) tables end up RLS-enabled with no policies — locking out non-superuser clients.
- Risk: MEDIUM — this is the single thing that breaks a clean restore onto plain Postgres. Easy to fix.
- Recommendation (pick one):
  - Simplest for portability: drop the role grant and target `PUBLIC`, since the policies are already fully permissive and the backend uses a privileged role anyway:
    ```sql
    CREATE POLICY "auth_all" ON departments FOR ALL USING (true) WITH CHECK (true);
    -- ...repeat per table (omit `TO authenticated`)
    ```
  - Or guard role creation so the file is self-contained on any server:
    ```sql
    DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
        CREATE ROLE authenticated NOLOGIN;
      END IF;
    END $$;
    ```
  - Or, since the backend bypasses RLS entirely and policies add no security at MVP, simply do not enable RLS in the portable path.

### LOW — extensions live in the Supabase `extensions` schema

- Evidence: `pg_stat_statements`, `uuid-ossp`, `pgcrypto` are installed in the `extensions` schema (Supabase convention) rather than `public`. `supabase_vault` lives in `vault`.
- Risk: LOW — the schema file itself never references these (UUIDs come from core `gen_random_uuid()`), so a restore does not need them. Listed only so a future maintainer who adds `uuid_generate_v4()` or `crypt()` knows to `CREATE EXTENSION` explicitly on a vanilla target.
- Recommendation: none required now. If extension functions are introduced later, add explicit `CREATE EXTENSION IF NOT EXISTS ...` to `db/schema.sql` so it stays self-contained.

### Note: `pg_dump` vs `db/schema.sql`

`db/schema.sql` is hand-maintained and is the cleanest portability artifact (it already avoids `auth.*` and Supabase extensions). A raw `pg_dump` of the live DB would additionally carry Supabase role grants and `extensions`-schema noise; prefer shipping `db/schema.sql` (with the `authenticated` fix above) plus a data-only dump for migration off Supabase.

---

## Conclusion

The schema is in good shape: correct surrogate/composite primary keys everywhere, every domain relationship enforced by a real FK with domain-appropriate ON DELETE behavior, and clean, vanilla-Postgres DDL with no `auth.*` coupling. The only material items are (1) 16 FK columns without covering indexes — a scale concern worth addressing before data grows, and (2) the `authenticated` role grant in RLS policies — the one edit needed for a clean restore onto plain Postgres. The legacy `qaa_notes` table is dead weight worth retiring. None of the "always NULL" columns are actually unused — they are transition-driven feature columns that the current seed simply doesn't trigger.
