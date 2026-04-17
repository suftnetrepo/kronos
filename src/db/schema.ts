import {
  sqliteTable, text, integer, uniqueIndex
} from 'drizzle-orm/sqlite-core'

// ─── Subjects ─────────────────────────────────────────────────────────────────
// A subject is a class/lesson that repeats on certain days of the week

export const subjects = sqliteTable('subjects', {
  id:          text('id').primaryKey(),
  name:        text('name').notNull(),
  teacher:     text('teacher'),
  room:        text('room'),
  color:       text('color').notNull().default('#6366F1'),
  icon:        text('icon').notNull().default('book'),
  // days: comma-separated e.g. "MON,WED,FRI"
  days:        text('days').notNull().default(''),
  startTime:   text('start_time').notNull(),   // "09:00"
  endTime:     text('end_time').notNull(),      // "10:30"
  // Reminder: null = off, 5/10/15/30/60 = minutes before
  reminder:    integer('reminder'),
  // Reminder notification IDs (JSON array of strings, stored as text)
  reminderIds: text('reminder_ids'),             // e.g. '["id1","id2","id3"]' or null
  notes:       text('notes'),
  sortOrder:   integer('sort_order').notNull().default(0),
  createdAt:   integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt:   integer('updated_at', { mode: 'timestamp' }).notNull(),
})

// ─── Homework ─────────────────────────────────────────────────────────────────

export const homework = sqliteTable('homework', {
  id:          text('id').primaryKey(),
  subjectId:   text('subject_id')
               .references(() => subjects.id, { onDelete: 'cascade' }),
  title:       text('title').notNull(),
  description: text('description'),
  dueDate:     integer('due_date', { mode: 'timestamp' }).notNull(),
  done:        integer('done', { mode: 'boolean' }).notNull().default(false),
  createdAt:   integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt:   integer('updated_at', { mode: 'timestamp' }).notNull(),
})

// ─── Exams ────────────────────────────────────────────────────────────────────

export const exams = sqliteTable('exams', {
  id:          text('id').primaryKey(),
  subjectId:   text('subject_id')
               .references(() => subjects.id, { onDelete: 'set null' }),
  title:       text('title').notNull(),
  date:        integer('date', { mode: 'timestamp' }).notNull(),
  room:        text('room'),
  notes:       text('notes'),
  createdAt:   integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt:   integer('updated_at', { mode: 'timestamp' }).notNull(),
})

// ─── Settings (singleton) ─────────────────────────────────────────────────────
// Stores both timetable settings (firstDayOfWeek, semesterStart/End) and
// app-level settings (lockEnabled, biometricEnabled, remindersEnabled)

export const settings = sqliteTable('settings', {
  id:                   text('id').primaryKey().default('singleton'),
  firstDayOfWeek:       text('first_day_of_week').notNull().default('MON'),
  semesterStart:        integer('semester_start', { mode: 'timestamp' }),
  semesterEnd:          integer('semester_end', { mode: 'timestamp' }),
  // App-level settings
  lockEnabled:          integer('lock_enabled', { mode: 'boolean' }).notNull().default(false),
  biometricEnabled:     integer('biometric_enabled', { mode: 'boolean' }).notNull().default(false),
  remindersEnabled:     integer('reminders_enabled', { mode: 'boolean' }).notNull().default(true),
  downloadedExportPath: text('downloaded_export_path'),
  updatedAt:            integer('updated_at', { mode: 'timestamp' }).notNull(),
})

// ─── Types ────────────────────────────────────────────────────────────────────

export type Subject     = typeof subjects.$inferSelect
export type NewSubject  = typeof subjects.$inferInsert
export type Homework    = typeof homework.$inferSelect
export type NewHomework = typeof homework.$inferInsert
export type Exam        = typeof exams.$inferSelect
export type NewExam     = typeof exams.$inferInsert
export type Settings    = typeof settings.$inferSelect

// ─── Day constants ────────────────────────────────────────────────────────────

export const DAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'] as const
export type Day = typeof DAYS[number]

export const DAY_LABELS: Record<Day, string> = {
  MON: 'Mon', TUE: 'Tue', WED: 'Wed',
  THU: 'Thu', FRI: 'Fri', SAT: 'Sat', SUN: 'Sun',
}

export const DAY_FULL: Record<Day, string> = {
  MON: 'Monday', TUE: 'Tuesday',  WED: 'Wednesday',
  THU: 'Thursday', FRI: 'Friday', SAT: 'Saturday', SUN: 'Sunday',
}
