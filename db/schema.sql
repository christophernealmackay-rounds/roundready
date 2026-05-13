-- RoundReady authoritative schema (MVP demo)
--
-- Single source of truth for the database. Drops and recreates all tables.
-- Apply via:
--   psql "$DATABASE_URL" -1 -f db/schema.sql           (-1 wraps in a transaction)
--   or via backend/scripts/reset_demo.py               (wraps in asyncpg transaction)
--
-- Column names use snake_case mirrors of the frontend TypeScript fields in
-- frontend/src/lib/types/index.ts, so the API client mapping is mechanical.

-- NOTE: no explicit BEGIN/COMMIT here. The Python reset path wraps this in an
-- asyncpg transaction. For psql, use the `-1` flag to wrap in a transaction.

-- Drop in reverse-dependency order (CASCADE handles RLS policies and FKs).
DROP TABLE IF EXISTS issue_notifications        CASCADE;
DROP TABLE IF EXISTS issues                     CASCADE;
DROP TABLE IF EXISTS round_answers              CASCADE;
DROP TABLE IF EXISTS rounds                     CASCADE;
DROP TABLE IF EXISTS template_questions         CASCADE;
DROP TABLE IF EXISTS template_sections          CASCADE;
DROP TABLE IF EXISTS round_templates            CASCADE;
DROP TABLE IF EXISTS questions                  CASCADE;
DROP TABLE IF EXISTS qapi_items                 CASCADE;
DROP TABLE IF EXISTS qapis                      CASCADE;
DROP TABLE IF EXISTS resident_group_memberships CASCADE;
DROP TABLE IF EXISTS resident_groups            CASCADE;
DROP TABLE IF EXISTS residents                  CASCADE;
DROP TABLE IF EXISTS angels                     CASCADE;
DROP TABLE IF EXISTS users                      CASCADE;
DROP TABLE IF EXISTS departments                CASCADE;
DROP TABLE IF EXISTS qaa_notes                  CASCADE;

-- Old divergent tables from earlier seeding rounds; drop them too.
DROP TABLE IF EXISTS round_responses    CASCADE;
DROP TABLE IF EXISTS round_history      CASCADE;
DROP TABLE IF EXISTS daily_assignments  CASCADE;
DROP TABLE IF EXISTS angel_absences     CASCADE;
DROP TABLE IF EXISTS templates          CASCADE;
DROP TABLE IF EXISTS facilities         CASCADE;

-- =============================================================================
-- Departments
-- =============================================================================
CREATE TABLE departments (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT        NOT NULL,
  facility_id UUID,
  custom      BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- Users (admins, angels, charge nurses, viewers)
-- =============================================================================
CREATE TABLE users (
  id                 UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name               TEXT        NOT NULL,
  email              TEXT        UNIQUE NOT NULL,
  role               TEXT        NOT NULL CHECK (role IN ('admin','angel','charge_nurse','viewer')),
  department_id      UUID        REFERENCES departments(id) ON DELETE SET NULL,
  notification_prefs JSONB       NOT NULL DEFAULT '{}',
  active             BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- Angels (subset of users who do rounds)
-- =============================================================================
CREATE TABLE angels (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  department_id UUID        REFERENCES departments(id) ON DELETE SET NULL,
  absent        BOOLEAN     NOT NULL DEFAULT FALSE,
  absent_since  TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id)
);

-- =============================================================================
-- Residents
-- =============================================================================
CREATE TABLE residents (
  id                 UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name               TEXT        NOT NULL,
  room               TEXT        NOT NULL,
  bed                TEXT        NOT NULL DEFAULT 'a',
  angel_id           UUID        REFERENCES angels(id) ON DELETE SET NULL,
  -- Set when an angel is marked absent: preserves the resident's pre-absence
  -- angel so that returning the angel to duty can restore the assignment,
  -- even after redistribution to another angel.
  original_angel_id  UUID        REFERENCES angels(id) ON DELETE SET NULL,
  status             TEXT        NOT NULL DEFAULT 'active' CHECK (status IN ('active','discharged','hospital')),
  pcc_id             TEXT,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX residents_angel_idx          ON residents(angel_id);
CREATE INDEX residents_original_angel_idx ON residents(original_angel_id);
CREATE INDEX residents_room_idx           ON residents(room);

-- =============================================================================
-- Resident groups (wings, carts, custom)
-- =============================================================================
CREATE TABLE resident_groups (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT        NOT NULL,
  type        TEXT        NOT NULL CHECK (type IN ('wing','cart','custom')),
  facility_id UUID,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE resident_group_memberships (
  resident_id UUID NOT NULL REFERENCES residents(id) ON DELETE CASCADE,
  group_id    UUID NOT NULL REFERENCES resident_groups(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (resident_id, group_id)
);

-- =============================================================================
-- QAPIs and QAPI items
-- =============================================================================
CREATE TABLE qapis (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  title             TEXT        NOT NULL,
  status            TEXT        NOT NULL DEFAULT 'active' CHECK (status IN ('active','archived')),
  issues_identified TEXT        NOT NULL DEFAULT '',
  date_identified   DATE,
  -- Populated when the QAPI is archived. Required by the API layer at
  -- archive time (see app/api/v1/qapis.py::update_qapi). Cleared on restore.
  -- No DB-level CHECK so existing rows can adopt the column without backfill.
  actual_completion DATE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE qapi_items (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  qapi_id             UUID        NOT NULL REFERENCES qapis(id) ON DELETE CASCADE,
  title               TEXT        NOT NULL,
  root_cause          TEXT        NOT NULL DEFAULT '',
  systemic_change     TEXT        NOT NULL DEFAULT '',
  monitoring_type     TEXT        NOT NULL DEFAULT 'rounds' CHECK (monitoring_type IN ('rounds','completion','cadence')),
  monitoring_detail   TEXT        NOT NULL DEFAULT '',
  responsible         TEXT        NOT NULL DEFAULT '',
  start_date          DATE,
  expected_completion DATE,
  "order"             INTEGER     NOT NULL DEFAULT 0,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX qapi_items_qapi_idx ON qapi_items(qapi_id);

-- =============================================================================
-- Questions (repository + custom)
-- =============================================================================
CREATE TABLE questions (
  id                         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  text                       TEXT        NOT NULL,
  section                    TEXT        NOT NULL DEFAULT '',
  issue_on                   TEXT        NOT NULL DEFAULT 'either' CHECK (issue_on IN ('yes','no','either')),
  notify_department_id       UUID        REFERENCES departments(id) ON DELETE SET NULL,
  department_id              UUID        REFERENCES departments(id) ON DELETE SET NULL,
  type                       TEXT        NOT NULL DEFAULT 'yesno' CHECK (type IN ('yesno','scale')),
  scale_min                  INTEGER,
  scale_max                  INTEGER,
  scale_threshold            INTEGER,
  scale_threshold_direction  TEXT        CHECK (scale_threshold_direction IN ('gte','lte')),
  in_repository              BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at                 TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT scale_fields_complete CHECK (
    type = 'yesno'
    OR (scale_min IS NOT NULL AND scale_max IS NOT NULL
        AND scale_threshold IS NOT NULL AND scale_threshold_direction IS NOT NULL
        AND scale_min < scale_max
        AND scale_threshold BETWEEN scale_min AND scale_max)
  )
);

-- =============================================================================
-- Round templates (Angel Rounds + Rapid Rounds)
-- =============================================================================
CREATE TABLE round_templates (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT        NOT NULL,
  type        TEXT        NOT NULL CHECK (type IN ('angel','rapid')),
  active      BOOLEAN     NOT NULL DEFAULT TRUE,
  start_date  DATE,
  end_date    DATE,
  archived_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE template_sections (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id  UUID        NOT NULL REFERENCES round_templates(id) ON DELETE CASCADE,
  title        TEXT        NOT NULL,
  qapi_id      UUID        REFERENCES qapis(id) ON DELETE SET NULL,
  qapi_item_id UUID        REFERENCES qapi_items(id) ON DELETE SET NULL,
  "order"      INTEGER     NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX template_sections_template_idx ON template_sections(template_id);

CREATE TABLE template_questions (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id  UUID        NOT NULL REFERENCES template_sections(id) ON DELETE CASCADE,
  question_id UUID        NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  "order"     INTEGER     NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX template_questions_section_idx ON template_questions(section_id);

-- =============================================================================
-- Rounds (a completed or in-progress round by an angel for a resident)
-- =============================================================================
CREATE TABLE rounds (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id  UUID        NOT NULL REFERENCES round_templates(id) ON DELETE CASCADE,
  angel_id     UUID        NOT NULL REFERENCES angels(id) ON DELETE CASCADE,
  resident_id  UUID        NOT NULL REFERENCES residents(id) ON DELETE CASCADE,
  completed_at TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX rounds_resident_idx     ON rounds(resident_id);
CREATE INDEX rounds_angel_idx        ON rounds(angel_id);
CREATE INDEX rounds_completed_at_idx ON rounds(completed_at);

CREATE TABLE round_answers (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  round_id      UUID        NOT NULL REFERENCES rounds(id) ON DELETE CASCADE,
  question_id   UUID        NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  answer        BOOLEAN,
  answer_number INTEGER,
  issue_flagged BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX round_answers_round_idx ON round_answers(round_id);

-- =============================================================================
-- Issues (first-class entity with resolution tracking)
-- =============================================================================
CREATE TABLE issues (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  round_id         UUID        REFERENCES rounds(id) ON DELETE SET NULL,
  question_id      UUID        REFERENCES questions(id) ON DELETE SET NULL,
  resident_id      UUID        REFERENCES residents(id) ON DELETE SET NULL,
  angel_id         UUID        REFERENCES angels(id) ON DELETE SET NULL,
  department_id    UUID        REFERENCES departments(id) ON DELETE SET NULL,
  status           TEXT        NOT NULL DEFAULT 'open' CHECK (status IN ('open','resolved')),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at      TIMESTAMPTZ,
  resolved_by      UUID        REFERENCES users(id) ON DELETE SET NULL,
  resolution_notes TEXT
);
CREATE INDEX issues_status_idx     ON issues(status);
CREATE INDEX issues_department_idx ON issues(department_id);

CREATE TABLE issue_notifications (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  issue_id          UUID        NOT NULL REFERENCES issues(id) ON DELETE CASCADE,
  notified_user_id  UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  notified_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  channel           TEXT        NOT NULL DEFAULT 'in_app' CHECK (channel IN ('in_app','email'))
);
CREATE INDEX issue_notifications_issue_idx ON issue_notifications(issue_id);

-- =============================================================================
-- QAA notes (open-text meeting minutes per facility)
-- =============================================================================
CREATE TABLE qaa_notes (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id UUID,
  content     TEXT        NOT NULL DEFAULT '',
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- Row Level Security
-- =============================================================================
ALTER TABLE departments                ENABLE ROW LEVEL SECURITY;
ALTER TABLE users                      ENABLE ROW LEVEL SECURITY;
ALTER TABLE angels                     ENABLE ROW LEVEL SECURITY;
ALTER TABLE residents                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE resident_groups            ENABLE ROW LEVEL SECURITY;
ALTER TABLE resident_group_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE qapis                      ENABLE ROW LEVEL SECURITY;
ALTER TABLE qapi_items                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE round_templates            ENABLE ROW LEVEL SECURITY;
ALTER TABLE template_sections          ENABLE ROW LEVEL SECURITY;
ALTER TABLE template_questions         ENABLE ROW LEVEL SECURITY;
ALTER TABLE rounds                     ENABLE ROW LEVEL SECURITY;
ALTER TABLE round_answers              ENABLE ROW LEVEL SECURITY;
ALTER TABLE issues                     ENABLE ROW LEVEL SECURITY;
ALTER TABLE issue_notifications        ENABLE ROW LEVEL SECURITY;
ALTER TABLE qaa_notes                  ENABLE ROW LEVEL SECURITY;

-- Permissive policies (MVP). Backend uses service role which bypasses RLS;
-- these policies exist so that any authenticated client (e.g., future
-- supabase-js direct reads) can still see data. Tightened post-MVP.
CREATE POLICY "auth_all" ON departments                FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all" ON users                      FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all" ON angels                     FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all" ON residents                  FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all" ON resident_groups            FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all" ON resident_group_memberships FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all" ON qapis                      FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all" ON qapi_items                 FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all" ON questions                  FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all" ON round_templates            FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all" ON template_sections          FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all" ON template_questions         FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all" ON rounds                     FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all" ON round_answers              FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all" ON issues                     FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all" ON issue_notifications        FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all" ON qaa_notes                  FOR ALL TO authenticated USING (true) WITH CHECK (true);
