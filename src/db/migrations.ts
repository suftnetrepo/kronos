export const SQL_MIGRATIONS = [
  // Migration 001 — initial schema
  `CREATE TABLE IF NOT EXISTS subjects (
    id           TEXT PRIMARY KEY,
    name         TEXT NOT NULL,
    teacher      TEXT,
    room         TEXT,
    color        TEXT NOT NULL DEFAULT '#6366F1',
    icon         TEXT NOT NULL DEFAULT 'book',
    days         TEXT NOT NULL DEFAULT '',
    start_time   TEXT NOT NULL,
    end_time     TEXT NOT NULL,
    reminder     INTEGER,
    notes        TEXT,
    sort_order   INTEGER NOT NULL DEFAULT 0,
    created_at   INTEGER NOT NULL,
    updated_at   INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS homework (
    id           TEXT PRIMARY KEY,
    subject_id   TEXT REFERENCES subjects(id) ON DELETE CASCADE,
    title        TEXT NOT NULL,
    description  TEXT,
    due_date     INTEGER NOT NULL,
    done         INTEGER NOT NULL DEFAULT 0,
    created_at   INTEGER NOT NULL,
    updated_at   INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS exams (
    id           TEXT PRIMARY KEY,
    subject_id   TEXT REFERENCES subjects(id) ON DELETE SET NULL,
    title        TEXT NOT NULL,
    date         INTEGER NOT NULL,
    room         TEXT,
    notes        TEXT,
    created_at   INTEGER NOT NULL,
    updated_at   INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS settings (
    id                TEXT PRIMARY KEY DEFAULT 'singleton',
    first_day_of_week TEXT NOT NULL DEFAULT 'MON',
    semester_start    INTEGER,
    semester_end      INTEGER,
    updated_at        INTEGER NOT NULL
  );

  INSERT OR IGNORE INTO settings (id, first_day_of_week, updated_at)
  VALUES ('singleton', 'MON', ${Date.now()});`,

  // Migration 002 — add app-level settings (Phase 2)
  `ALTER TABLE settings ADD COLUMN lock_enabled INTEGER NOT NULL DEFAULT 0;
  ALTER TABLE settings ADD COLUMN biometric_enabled INTEGER NOT NULL DEFAULT 0;
  ALTER TABLE settings ADD COLUMN reminders_enabled INTEGER NOT NULL DEFAULT 1;
  ALTER TABLE settings ADD COLUMN downloaded_export_path TEXT;`,

  // Migration 003 — add reminder IDs tracking to subjects (Phase 3)
  `ALTER TABLE subjects ADD COLUMN reminder_ids TEXT;`,

  // Migration 004 — add default tab setting (Phase 4)
  `ALTER TABLE settings ADD COLUMN default_tab TEXT NOT NULL DEFAULT 'index';`,

  // Migration 005 — add exam reminders (Phase 5)
  `ALTER TABLE exams ADD COLUMN reminder INTEGER;
  ALTER TABLE exams ADD COLUMN reminder_id TEXT;`,

  // Migration 006 — Kronos V2 task domain
  `CREATE TABLE IF NOT EXISTS tasks (
    id TEXT PRIMARY KEY, title TEXT NOT NULL, notes TEXT, type TEXT NOT NULL DEFAULT 'task',
    subject_id TEXT REFERENCES subjects(id) ON DELETE SET NULL, exam_id TEXT REFERENCES exams(id) ON DELETE SET NULL,
    due_at INTEGER, priority TEXT NOT NULL DEFAULT 'normal', is_completed INTEGER NOT NULL DEFAULT 0,
    completed_at INTEGER, reminder_at INTEGER, notification_id TEXT, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_tasks_due_at ON tasks(due_at);
  CREATE INDEX IF NOT EXISTS idx_tasks_completed_due ON tasks(is_completed, due_at);
  CREATE INDEX IF NOT EXISTS idx_tasks_subject ON tasks(subject_id);`,

  // Migration 007 — surface existing Homework records in the unified V2 Tasks workflow
  `INSERT OR IGNORE INTO tasks (id, title, notes, type, subject_id, exam_id, due_at, priority, is_completed, completed_at, reminder_at, notification_id, created_at, updated_at)
   SELECT 'legacy-homework-' || id, title, description, 'homework', subject_id, NULL, due_date, 'normal', done,
          CASE WHEN done = 1 THEN updated_at ELSE NULL END, NULL, NULL, created_at, updated_at
   FROM homework;`,
]
