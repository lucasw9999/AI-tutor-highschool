-- Production schema for the tutor backend.
--
-- The governing rule: nothing is stored that can be derived. Every number the
-- student or parent sees is a query over `attempts`, joined to `topics` for
-- weights.

CREATE TABLE IF NOT EXISTS items (
  id            TEXT PRIMARY KEY,
  subject       TEXT NOT NULL,
  topic         TEXT,
  unit          TEXT,
  practice      TEXT,
  kind          TEXT NOT NULL,          -- mcq | constructed | frq | constructed_model_graded
  stem          TEXT NOT NULL,
  options_json  TEXT,                   -- {"A":"..","B":".."} for mcq
  answer        TEXT,                   -- keyed letter, or canonical short answer
  answer_variants_json TEXT,            -- accepted alternate spellings/forms
  explanation   TEXT,
  rubric_json   TEXT,                   -- frq only
  difficulty    TEXT,
  calc_allowed  INTEGER
);
CREATE INDEX IF NOT EXISTS idx_items_subject_topic ON items(subject, topic);

CREATE TABLE IF NOT EXISTS topics (
  id            TEXT NOT NULL,
  subject       TEXT NOT NULL,
  name          TEXT,
  unit          TEXT,
  ek            TEXT,
  exam_weight_low  REAL,
  exam_weight_high REAL,
  tested_on_exam   INTEGER NOT NULL DEFAULT 1,
  PRIMARY KEY (subject, id)
);

CREATE TABLE IF NOT EXISTS teaching (
  topic          TEXT NOT NULL,
  subject        TEXT NOT NULL,
  plain_idea     TEXT,
  worked_example TEXT,
  common_mistake TEXT,
  source_file    TEXT,
  PRIMARY KEY (subject, topic)
);

-- What the server handed out, and when. This is what makes it impossible for the
-- model to fabricate an item id or invent an elapsed time.
CREATE TABLE IF NOT EXISTS serves (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  subject    TEXT NOT NULL,
  item_id    TEXT NOT NULL,
  served_at  TEXT NOT NULL,
  mock_id    INTEGER,
  logged     INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_serves_open ON serves(subject, logged, id);

-- One row per answer. THE source of every number in the system.
CREATE TABLE IF NOT EXISTS attempts (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  ts         TEXT NOT NULL,             -- server clock
  subject    TEXT NOT NULL,
  item_id    TEXT NOT NULL,
  topic      TEXT,
  unit       TEXT,
  practice   TEXT,
  response   TEXT,
  correct    INTEGER NOT NULL,
  graded_by  TEXT NOT NULL,             -- 'server' | 'model'
  seconds    INTEGER,                   -- server measured
  hints_used INTEGER NOT NULL DEFAULT 0,
  conditions TEXT NOT NULL,             -- cold | tutored | timed | proctored_mock
  mock_id    INTEGER
);
CREATE INDEX IF NOT EXISTS idx_attempts_subject ON attempts(subject, ts);
CREATE INDEX IF NOT EXISTS idx_attempts_topic ON attempts(subject, topic);
CREATE INDEX IF NOT EXISTS idx_attempts_mock ON attempts(mock_id);

-- A proctored sitting. Only attempts tied to one of these can move readiness.
CREATE TABLE IF NOT EXISTS mocks (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  subject       TEXT NOT NULL,
  section       TEXT,                   -- 'I' | 'II' | 'full'
  started_at    TEXT NOT NULL,
  ended_at      TEXT,
  proctored     INTEGER NOT NULL DEFAULT 0,
  source        TEXT NOT NULL DEFAULT 'bank',   -- bank | official
  composite_pct REAL,
  blanks        INTEGER
);
CREATE INDEX IF NOT EXISTS idx_mocks_subject ON mocks(subject, started_at);

-- Teaching gaps the server has ordered, and whether the lesson has been given
-- and then re-tested cold. A gap clears only on an unaided correct answer.
CREATE TABLE IF NOT EXISTS gaps (
  subject    TEXT NOT NULL,
  topic      TEXT NOT NULL,
  opened_at  TEXT NOT NULL,
  taught_at  TEXT,
  cleared_at TEXT,
  PRIMARY KEY (subject, topic, opened_at)
);
