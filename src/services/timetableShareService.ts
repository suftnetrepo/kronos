/**
 * timetableShareService
 *
 * Encodes subjects into a compact shareable payload and decodes it back.
 * Format: base64(JSON) — works as a copy-paste code or embedded in a QR.
 *
 * Only subjects are shared (name, teacher, room, color, icon, days,
 * startTime, endTime, reminder). Homework and exams are personal.
 */
import type { Subject } from '../db/schema'

// ─── Payload shape ─────────────────────────────────────────────────────────────

export interface ShareableSubject {
  n:  string           // name
  t:  string | null    // teacher
  r:  string | null    // room
  c:  string           // color
  ic: string           // icon
  d:  string           // days  e.g. "MON,WED"
  s:  string           // startTime
  e:  string           // endTime
  rm: number | null    // reminder minutes
}

export interface TimetablePayload {
  v:  number              // schema version
  ts: number              // timestamp (ms) — when it was exported
  ss: ShareableSubject[]  // subjects
}

const SCHEMA_VERSION = 1

// ─── Encode ────────────────────────────────────────────────────────────────────

export function encodeTimetable(subjects: Subject[]): string {
  const payload: TimetablePayload = {
    v:  SCHEMA_VERSION,
    ts: Date.now(),
    ss: subjects.map(s => ({
      n:  s.name,
      t:  s.teacher  ?? null,
      r:  s.room     ?? null,
      c:  s.color,
      ic: s.icon,
      d:  s.days,
      s:  s.startTime,
      e:  s.endTime,
      rm: s.reminder ?? null,
    })),
  }
  return btoa(unescape(encodeURIComponent(JSON.stringify(payload))))
}

// ─── Decode ────────────────────────────────────────────────────────────────────

export function decodeTimetable(code: string): TimetablePayload {
  try {
    const json = decodeURIComponent(escape(atob(code.trim())))
    const payload = JSON.parse(json) as TimetablePayload
    if (
      typeof payload.v  !== 'number' ||
      typeof payload.ts !== 'number' ||
      !Array.isArray(payload.ss)
    ) {
      throw new Error('Invalid payload structure')
    }
    return payload
  } catch {
    throw new Error('Invalid timetable code. Make sure you copied it correctly.')
  }
}

// ─── Build subject inserts from payload ────────────────────────────────────────

export function payloadToSubjects(
  payload: TimetablePayload
): Omit<Subject, 'id' | 'createdAt' | 'updatedAt' | 'sortOrder'>[] {
  return payload.ss.map(s => ({
    name:      s.n,
    teacher:   s.t,
    room:      s.r,
    color:     s.c,
    icon:      s.ic,
    days:      s.d,
    startTime: s.s,
    endTime:   s.e,
    reminder:  s.rm,
    notes:     null,
  }))
}
