/**
 * timetableShareService
 *
 * Encodes subjects into a compact shareable payload and decodes it back.
 * Format: base64(JSON) — works as a copy-paste code or embedded in a QR.
 *
 * Only subjects are shared (name, teacher, room, color, icon, days,
 * startTime, endTime, reminder). Homework and exams are personal.
 *
 * Phase 5: Hardened validation, duplicate detection, import preview, and undo support.
 */
import type { Subject } from '../db/schema'
import { DAYS, DAY_LABELS } from '../db/schema'

// ─── Limits & Constants ────────────────────────────────────────────────────────

// All subject colors that can be exported (must match SUBJECT_COLORS in constants/themes.ts)
const SUPPORTED_SUBJECT_COLORS = [
  '#6366F1', // indigo
  '#8B5CF6', // violet
  '#EC4899', // pink
  '#EF4444', // red
  '#F97316', // orange
  '#EAB308', // yellow
  '#22C55E', // green
  '#14B8A6', // teal
  '#3B82F6', // blue
  '#06B6D4', // cyan
  '#84CC16', // lime
  '#F59E0B', // amber
  '#6B7280', // gray
  '#1F2937', // dark
] as const

export const IMPORT_LIMITS = {
  MAX_PAYLOAD_SIZE:    500_000,      // 500 KB max (base64 encoded)
  MAX_SUBJECTS:        50,           // Max subjects per import
  MAX_NAME_LENGTH:     100,
  MAX_TEACHER_LENGTH:  100,
  MAX_ROOM_LENGTH:     50,
  MAX_NOTES_LENGTH:    500,
  MAX_ICON_LENGTH:     20,
  VALID_COLORS:        SUPPORTED_SUBJECT_COLORS,
  VALID_ICONS:         [
    'book', 'calculator', 'language', 'science', 'sport',
    'art', 'music', 'code', 'compass', 'microscope',
  ] as const,
}

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

export interface ImportPreview {
  valid:              boolean
  subjects:           Array<{
    name:             string
    days:             string
    time:             string
    status:           'new' | 'duplicate' | 'conflict'
    conflict?:        string  // description of conflict if any
  }>
  duplicates:         string[]  // Subject names that already exist
  conflicts:          string[]  // Conflicting timetable slots
  errors:             ImportValidationError[]
  warnings:           ImportValidationWarning[]  // Non-blocking warnings (e.g., color fallback)
  summary:            {
    total:            number
    new:              number
    duplicates:       number
    conflicts:        number
    invalid:          number
  }
}

export interface ImportValidationError {
  index:              number        // Subject index in payload (-1 for payload-level error)
  field:              string        // Field name that failed
  value:              any           // The problematic value
  reason:             string        // Human-readable reason
}

export interface ImportValidationWarning {
  index:              number        // Subject index in payload
  field:              string        // Field name that triggered warning
  value:              any           // The problematic value
  reason:             string        // Human-readable reason
  suggestedValue?:    any           // The suggested replacement value
}

export interface ImportResult {
  success:            boolean
  imported:           number        // Number of subjects successfully imported
  skipped:            number        // Number of subjects skipped (duplicates/conflicts)
  errors:             ImportValidationError[]
  importId:           string        // ID for undo capability
  timestamp:          Date
}

// ─── Import history (for undo) ────────────────────────────────────────────────

interface ImportHistoryEntry {
  id:                 string
  timestamp:          Date
  subjectIds:         string[]       // IDs of imported subjects
  reason:             'test' | 'user_import'
}

// Simple in-memory history (cleared on app restart)
const importHistory: Record<string, ImportHistoryEntry> = {}

// ─── Constants ────────────────────────────────────────────────────────────────

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

// ─── Decode with improved error handling ──────────────────────────────────────

export function decodeTimetable(code: string): TimetablePayload {
  try {
    const trimmed = code.trim()

    // Check size before decoding
    if (trimmed.length > IMPORT_LIMITS.MAX_PAYLOAD_SIZE) {
      throw new Error(`Import too large (${trimmed.length} bytes, max ${IMPORT_LIMITS.MAX_PAYLOAD_SIZE})`)
    }

    const json = decodeURIComponent(escape(atob(trimmed)))
    const payload = JSON.parse(json) as TimetablePayload

    // Validate payload structure
    if (
      typeof payload.v  !== 'number' ||
      typeof payload.ts !== 'number' ||
      !Array.isArray(payload.ss)
    ) {
      throw new Error('Invalid timetable structure. Missing required fields.')
    }

    if (payload.v !== SCHEMA_VERSION) {
      console.warn(`[timetableShareService] Payload version ${payload.v}, expected ${SCHEMA_VERSION}`)
    }

    return payload
  } catch (err: any) {
    if (err.message?.includes('Invalid payload') || err.message?.includes('Import too large')) {
      throw err
    }
    throw new Error('Invalid timetable code. Make sure you copied it correctly.')
  }
}

// ─── Field validation helpers ─────────────────────────────────────────────────

/**
 * Find the closest color in the supported palette using RGB distance.
 * This ensures any color can be imported by falling back to the nearest safe color.
 */
function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16),
  } : null
}

function colorDistance(hex1: string, hex2: string): number {
  const c1 = hexToRgb(hex1)
  const c2 = hexToRgb(hex2)
  if (!c1 || !c2) return Infinity
  const dr = c1.r - c2.r
  const dg = c1.g - c2.g
  const db = c1.b - c2.b
  return Math.sqrt(dr * dr + dg * dg + db * db)
}

/**
 * Map any color to the closest supported color in the palette.
 * Returns the mapped color and whether the color was already valid.
 */
export function mapColorToSupported(color: string): { mapped: string; wasValid: boolean } {
  // If already valid, return as-is
  if ((IMPORT_LIMITS.VALID_COLORS as readonly string[]).includes(color)) {
    return { mapped: color, wasValid: true }
  }

  // Find the closest color by RGB distance
  let closest = SUPPORTED_SUBJECT_COLORS[0]
  let minDistance = colorDistance(color, closest)

  for (const supportedColor of SUPPORTED_SUBJECT_COLORS) {
    const distance = colorDistance(color, supportedColor)
    if (distance < minDistance) {
      minDistance = distance
      closest = supportedColor
    }
  }

  return { mapped: closest, wasValid: false }
}

function validateTimeFormat(time: string): { valid: boolean; reason?: string } {
  if (typeof time !== 'string') return { valid: false, reason: 'Time must be a string' }
  const match = time.match(/^(\d{1,2}):(\d{2})$/)
  if (!match) return { valid: false, reason: 'Invalid time format (use HH:MM)' }
  const [, hourStr, minStr] = match
  const hour = parseInt(hourStr, 10)
  const min = parseInt(minStr, 10)
  if (hour < 0 || hour > 23) return { valid: false, reason: 'Hour must be 0-23' }
  if (min < 0 || min > 59) return { valid: false, reason: 'Minutes must be 0-59' }
  return { valid: true }
}

function validateDays(days: string): { valid: boolean; reason?: string } {
  if (typeof days !== 'string') return { valid: false, reason: 'Days must be a string' }
  if (days.length === 0) return { valid: false, reason: 'Must select at least one day' }
  const dayArray = days.split(',')
  for (const day of dayArray) {
    if (!DAYS.includes(day as any)) {
      return { valid: false, reason: `Invalid day: ${day}` }
    }
  }
  return { valid: true }
}

function validateColor(color: string): { valid: boolean; reason?: string } {
  if (typeof color !== 'string') return { valid: false, reason: 'Color must be a string' }
  // Color is always valid — we can map unsupported colors to the nearest safe color
  return { valid: true }
}

function getColorWarning(color: string): ImportValidationWarning | null {
  if (typeof color !== 'string') return null
  const { wasValid, mapped } = mapColorToSupported(color)
  if (!wasValid) {
    return {
      index: -1,  // Will be set by caller
      field: 'color',
      value: color,
      reason: `Color ${color} not in palette, using closest match ${mapped}`,
      suggestedValue: mapped,
    }
  }
  return null
}

function validateIcon(icon: string): { valid: boolean; reason?: string } {
  if (typeof icon !== 'string') return { valid: false, reason: 'Icon must be a string' }
  if (!IMPORT_LIMITS.VALID_ICONS.includes(icon as any)) {
    return { valid: false, reason: `Icon not allowed: ${icon}` }
  }
  return { valid: true }
}

function validateString(
  value: any,
  fieldName: string,
  minLength: number = 1,
  maxLength: number = 100
): { valid: boolean; reason?: string } {
  if (typeof value !== 'string') {
    return { valid: false, reason: `${fieldName} must be a string` }
  }
  if (value.length < minLength) {
    return { valid: false, reason: `${fieldName} too short (min ${minLength})` }
  }
  if (value.length > maxLength) {
    return { valid: false, reason: `${fieldName} too long (max ${maxLength})` }
  }
  return { valid: true }
}

// ─── Comprehensive subject validation ──────────────────────────────────────────

export function validateSubject(
  subject: ShareableSubject,
  index: number
): { errors: ImportValidationError[]; warnings: ImportValidationWarning[] } {
  const errors: ImportValidationError[] = []
  const warnings: ImportValidationWarning[] = []

  // Required fields
  if (!subject.n) {
    errors.push({
      index,
      field: 'name',
      value: subject.n,
      reason: 'Subject name is required',
    })
  } else {
    const nameCheck = validateString(subject.n, 'Name', 1, IMPORT_LIMITS.MAX_NAME_LENGTH)
    if (!nameCheck.valid) {
      errors.push({
        index,
        field: 'name',
        value: subject.n,
        reason: nameCheck.reason!,
      })
    }
  }

  // Time validation
  if (!subject.s) {
    errors.push({
      index,
      field: 'startTime',
      value: subject.s,
      reason: 'Start time is required',
    })
  } else {
    const timeCheck = validateTimeFormat(subject.s)
    if (!timeCheck.valid) {
      errors.push({
        index,
        field: 'startTime',
        value: subject.s,
        reason: timeCheck.reason!,
      })
    }
  }

  if (!subject.e) {
    errors.push({
      index,
      field: 'endTime',
      value: subject.e,
      reason: 'End time is required',
    })
  } else {
    const timeCheck = validateTimeFormat(subject.e)
    if (!timeCheck.valid) {
      errors.push({
        index,
        field: 'endTime',
        value: subject.e,
        reason: timeCheck.reason!,
      })
    }
  }

  // Check endTime > startTime
  if (subject.s && subject.e) {
    const [startH, startM] = subject.s.split(':').map(Number)
    const [endH, endM] = subject.e.split(':').map(Number)
    const startMins = startH * 60 + startM
    const endMins = endH * 60 + endM
    if (endMins <= startMins) {
      errors.push({
        index,
        field: 'time_range',
        value: `${subject.s} to ${subject.e}`,
        reason: 'End time must be after start time',
      })
    }
  }

  // Days validation
  if (!subject.d) {
    errors.push({
      index,
      field: 'days',
      value: subject.d,
      reason: 'Days are required',
    })
  } else {
    const daysCheck = validateDays(subject.d)
    if (!daysCheck.valid) {
      errors.push({
        index,
        field: 'days',
        value: subject.d,
        reason: daysCheck.reason!,
      })
    }
  }

  // Color and icon validation
  // Color is always allowed — we can map it to a safe color if needed
  const colorCheck = validateColor(subject.c || '')
  if (colorCheck.valid && subject.c) {
    const colorWarning = getColorWarning(subject.c)
    if (colorWarning) {
      warnings.push({ ...colorWarning, index })
    }
  }

  const iconCheck = validateIcon(subject.ic || '')
  if (!iconCheck.valid) {
    errors.push({
      index,
      field: 'icon',
      value: subject.ic,
      reason: iconCheck.reason!,
    })
  }

  // Optional field length checks
  if (subject.t && subject.t.length > IMPORT_LIMITS.MAX_TEACHER_LENGTH) {
    errors.push({
      index,
      field: 'teacher',
      value: subject.t,
      reason: `Teacher name too long (max ${IMPORT_LIMITS.MAX_TEACHER_LENGTH})`,
    })
  }

  if (subject.r && subject.r.length > IMPORT_LIMITS.MAX_ROOM_LENGTH) {
    errors.push({
      index,
      field: 'room',
      value: subject.r,
      reason: `Room too long (max ${IMPORT_LIMITS.MAX_ROOM_LENGTH})`,
    })
  }

  // Reminder validation
  if (subject.rm !== null && subject.rm !== undefined) {
    if (typeof subject.rm !== 'number' || subject.rm < 0 || subject.rm > 120) {
      errors.push({
        index,
        field: 'reminder',
        value: subject.rm,
        reason: 'Reminder must be 0-120 minutes',
      })
    }
  }

  return { errors, warnings }
}

// ─── Detect duplicates and conflicts in existing data ──────────────────────────

export function detectDuplicatesAndConflicts(
  incomingSubjects: ShareableSubject[],
  existingSubjects: Subject[]
): {
  duplicates: Map<number, string>  // index -> existing subject name
  conflicts: Map<number, string>   // index -> conflict description
} {
  const duplicates = new Map<number, string>()
  const conflicts = new Map<number, string>()

  for (let i = 0; i < incomingSubjects.length; i++) {
    const incoming = incomingSubjects[i]

    // Check for exact name duplicate
    const duplicate = existingSubjects.find(
      s => s.name.toLowerCase() === incoming.n.toLowerCase()
    )
    if (duplicate) {
      duplicates.set(i, duplicate.name)
      continue  // Skip conflict check if already a duplicate
    }

    // Check for timetable slot conflict
    // (same days and overlapping times)
    const conflict = existingSubjects.find(s => {
      const incomingDays = new Set(incoming.d.split(','))
      const existingDays = new Set(s.days.split(','))

      // Check if any days overlap
      const dayOverlap = [...incomingDays].some(d => existingDays.has(d))
      if (!dayOverlap) return false

      // Check if times overlap
      const [incomingStartH, incomingStartM] = incoming.s.split(':').map(Number)
      const [incomingEndH, incomingEndM] = incoming.e.split(':').map(Number)
      const [existingStartH, existingStartM] = s.startTime.split(':').map(Number)
      const [existingEndH, existingEndM] = s.endTime.split(':').map(Number)

      const incomingStart = incomingStartH * 60 + incomingStartM
      const incomingEnd = incomingEndH * 60 + incomingEndM
      const existingStart = existingStartH * 60 + existingStartM
      const existingEnd = existingEndH * 60 + existingEndM

      return incomingStart < existingEnd && incomingEnd > existingStart
    })

    if (conflict) {
      conflicts.set(i, `Conflicts with "${conflict.name}"`)
    }
  }

  return { duplicates, conflicts }
}

// ─── Generate import preview ───────────────────────────────────────────────────

export function generateImportPreview(
  payload: TimetablePayload,
  existingSubjects: Subject[]
): ImportPreview {
  const errors: ImportValidationError[] = []
  const warnings: ImportValidationWarning[] = []
  const subjectsData: ImportPreview['subjects'] = []
  const duplicates = new Set<string>()
  const conflicts = new Set<string>()
  let validCount = 0

  // Check payload size
  if (payload.ss.length > IMPORT_LIMITS.MAX_SUBJECTS) {
    errors.push({
      index: -1,
      field: 'subjects',
      value: payload.ss.length,
      reason: `Too many subjects (${payload.ss.length}, max ${IMPORT_LIMITS.MAX_SUBJECTS})`,
    })
    // Still process to show what would be imported
  }

  // Validate each subject
  const { duplicates: dupMap, conflicts: conflictMap } = detectDuplicatesAndConflicts(
    payload.ss,
    existingSubjects
  )

  for (let i = 0; i < payload.ss.length; i++) {
    const subject = payload.ss[i]
    const { errors: fieldErrors, warnings: fieldWarnings } = validateSubject(subject, i)
    errors.push(...fieldErrors)
    warnings.push(...fieldWarnings)

    // Subject is valid if there are NO blocking errors (warnings don't block)
    if (fieldErrors.length === 0) {
      validCount++

      const isDuplicate = dupMap.has(i)
      const isConflict = conflictMap.has(i)
      const status = isDuplicate ? 'duplicate' : isConflict ? 'conflict' : 'new'

      if (isDuplicate) duplicates.add(dupMap.get(i)!)
      if (isConflict) conflicts.add(conflictMap.get(i)!)

      subjectsData.push({
        name: subject.n,
        days: subject.d,
        time: `${subject.s} - ${subject.e}`,
        status,
        conflict: conflictMap.get(i),
      })
    }
  }

  return {
    valid: errors.length === 0 && validCount === payload.ss.length,
    subjects: subjectsData,
    duplicates: Array.from(duplicates),
    conflicts: Array.from(conflicts),
    errors,
    warnings,
    summary: {
      total: payload.ss.length,
      new: subjectsData.filter(s => s.status === 'new').length,
      duplicates: subjectsData.filter(s => s.status === 'duplicate').length,
      conflicts: subjectsData.filter(s => s.status === 'conflict').length,
      invalid: errors.length,
    },
  }
}

// ─── Build subject inserts from payload ────────────────────────────────────────

export function payloadToSubjects(
  payload: TimetablePayload
): Omit<Subject, 'id' | 'createdAt' | 'updatedAt' | 'sortOrder' | 'reminderIds'>[] {
  return payload.ss.map(s => {
    const { mapped: mappedColor } = mapColorToSupported(s.c)
    return {
      name:      s.n,
      teacher:   s.t,
      room:      s.r,
      color:     mappedColor,  // Use mapped color to ensure it's valid
      icon:      s.ic,
      days:      s.d,
      startTime: s.s,
      endTime:   s.e,
      reminder:  s.rm,
      notes:     null,
    }
  })
}

// ─── Import history tracking (for undo) ────────────────────────────────────────

export function recordImport(
  importId: string,
  subjectIds: string[],
  reason: 'test' | 'user_import' = 'user_import'
): void {
  importHistory[importId] = {
    id: importId,
    timestamp: new Date(),
    subjectIds,
    reason,
  }
}

export function getImportHistory(importId: string): ImportHistoryEntry | null {
  return importHistory[importId] ?? null
}

export function clearImportHistory(importId: string): void {
  delete importHistory[importId]
}

export function getLastImport(): ImportHistoryEntry | null {
  // Find the most recent import by timestamp
  const entries = Object.values(importHistory).filter(e => e.reason === 'user_import')
  if (entries.length === 0) return null

  return entries.reduce((latest, current) =>
    current.timestamp > latest.timestamp ? current : latest
  )
}

export async function performUndoImport(
  importId: string,
  db: any,  // Drizzle database instance
  subjects: any, // subjects table
  toastService: any,  // For toast notifications
): Promise<number> {
  const entry = getImportHistory(importId)
  if (!entry) {
    throw new Error('Import record not found')
  }

  if (entry.subjectIds.length === 0) {
    throw new Error('No subjects to undo')
  }

  // Delete each subject (cascade will handle homework)
  let deletedCount = 0
  for (const id of entry.subjectIds) {
    try {
      await db.delete(subjects).where(subjects.id === id)
      deletedCount++
    } catch (err) {
      // If a subject is already deleted, skip it gracefully
      console.warn(`[timetableShareService] Subject ${id} not found, skipping`)
    }
  }

  // Clear the history entry so undo can't be called twice
  clearImportHistory(importId)

  return deletedCount
}
