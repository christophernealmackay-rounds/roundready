-- RoundReady Database Schema
-- Apply via Supabase SQL editor or MCP apply_migration

-- Departments (no dependencies — must be created first)
CREATE TABLE IF NOT EXISTS departments (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT        NOT NULL,
  facility_id UUID,
  custom      BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Users
CREATE TABLE IF NOT EXISTS users (
  id                 UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name               TEXT        NOT NULL,
  email              TEXT        UNIQUE NOT NULL,
  role               TEXT        NOT NULL CHECK (role IN ('admin', 'angel', 'charge_nurse', 'viewer')),
  department_id      UUID        REFERENCES departments(id) ON DELETE SET NULL,
  notification_prefs JSONB       NOT NULL DEFAULT '{}',
  active             BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Angels
CREATE TABLE IF NOT EXISTS angels (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  department_id UUID        REFERENCES departments(id) ON DELETE SET NULL,
  absent        BOOLEAN     NOT NULL DEFAULT FALSE,
  absent_since  TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Residents
CREATE TABLE IF NOT EXISTS residents (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT        NOT NULL,
  room_number TEXT        NOT NULL,
  bed         TEXT,
  angel_id    UUID        REFERENCES angels(id) ON DELETE SET NULL,
  status      TEXT        NOT NULL DEFAULT 'active',
  pcc_id      TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- QAPIs
CREATE TABLE IF NOT EXISTS qapis (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  title      TEXT        NOT NULL,
  status     TEXT        NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- QAPI Items
CREATE TABLE IF NOT EXISTS qapi_items (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  qapi_id    UUID        NOT NULL REFERENCES qapis(id) ON DELETE CASCADE,
  title      TEXT        NOT NULL,
  "order"    INTEGER     NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Questions
CREATE TABLE IF NOT EXISTS questions (
  id                   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  text                 TEXT        NOT NULL,
  section              TEXT,
  issue_on             TEXT        CHECK (issue_on IN ('yes', 'no', 'either')),
  notify_department_id UUID        REFERENCES departments(id) ON DELETE SET NULL,
  repository           BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Round Templates
CREATE TABLE IF NOT EXISTS round_templates (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT        NOT NULL,
  type        TEXT        NOT NULL CHECK (type IN ('angel', 'rapid')),
  active      BOOLEAN     NOT NULL DEFAULT TRUE,
  start_date  DATE,
  end_date    DATE,
  archived_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Template Questions (join: template ↔ question, optionally linked to a QAPI item)
CREATE TABLE IF NOT EXISTS template_questions (
  id           UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id  UUID    NOT NULL REFERENCES round_templates(id) ON DELETE CASCADE,
  question_id  UUID    NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  qapi_item_id UUID    REFERENCES qapi_items(id) ON DELETE SET NULL,
  "order"      INTEGER NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Rounds (a completed or in-progress round by an angel against a template)
CREATE TABLE IF NOT EXISTS rounds (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id  UUID        NOT NULL REFERENCES round_templates(id) ON DELETE CASCADE,
  angel_id     UUID        NOT NULL REFERENCES angels(id) ON DELETE CASCADE,
  completed_at TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Round Answers
CREATE TABLE IF NOT EXISTS round_answers (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  round_id      UUID        NOT NULL REFERENCES rounds(id) ON DELETE CASCADE,
  question_id   UUID        NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  answer        BOOLEAN,
  issue_flagged BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- QAA Notes (open-text meeting minutes per facility)
CREATE TABLE IF NOT EXISTS qaa_notes (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id UUID,
  content     TEXT        NOT NULL DEFAULT '',
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE departments      ENABLE ROW LEVEL SECURITY;
ALTER TABLE users            ENABLE ROW LEVEL SECURITY;
ALTER TABLE angels           ENABLE ROW LEVEL SECURITY;
ALTER TABLE residents        ENABLE ROW LEVEL SECURITY;
ALTER TABLE qapis            ENABLE ROW LEVEL SECURITY;
ALTER TABLE qapi_items       ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions        ENABLE ROW LEVEL SECURITY;
ALTER TABLE round_templates  ENABLE ROW LEVEL SECURITY;
ALTER TABLE template_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE rounds           ENABLE ROW LEVEL SECURITY;
ALTER TABLE round_answers    ENABLE ROW LEVEL SECURITY;
ALTER TABLE qaa_notes        ENABLE ROW LEVEL SECURITY;

-- Permissive RLS policies (authenticated users have full access; tightened in Phase 4)
CREATE POLICY "auth_all" ON departments        FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all" ON users              FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all" ON angels             FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all" ON residents          FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all" ON qapis             FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all" ON qapi_items         FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all" ON questions          FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all" ON round_templates    FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all" ON template_questions FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all" ON rounds             FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all" ON round_answers      FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all" ON qaa_notes          FOR ALL TO authenticated USING (true) WITH CHECK (true);
