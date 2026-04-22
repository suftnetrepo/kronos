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
]
