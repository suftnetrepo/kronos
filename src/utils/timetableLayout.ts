import type { Subject } from '../db/schema'

export type TimetableLayoutEvent = {
  subject: Subject
  startMinutes: number
  endMinutes: number
  column: number
  columnCount: number
}

export function parseTime(value?: string | null): number | null {
  if (!value) return null
  const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim())
  if (!match) return null
  const hour = Number(match[1])
  const minute = Number(match[2])
  if (!Number.isFinite(hour) || !Number.isFinite(minute) || hour < 0 || hour > 23 || minute < 0 || minute > 59) return null
  return hour * 60 + minute
}

export function subjectOccursOnDay(subject: Subject, day: string): boolean {
  return subject.days
    .split(',')
    .map(value => value.trim().toUpperCase())
    .filter(Boolean)
    .includes(day.toUpperCase())
}

export function layoutDayEvents(subjects: Subject[]): TimetableLayoutEvent[] {
  const valid = subjects
    .map(subject => {
      const startMinutes = parseTime(subject.startTime)
      const parsedEnd = parseTime(subject.endTime)
      if (startMinutes == null) return null
      const endMinutes = parsedEnd != null && parsedEnd > startMinutes ? parsedEnd : startMinutes + 60
      return { subject, startMinutes, endMinutes }
    })
    .filter((value): value is { subject: Subject; startMinutes: number; endMinutes: number } => Boolean(value))
    .sort((a, b) => a.startMinutes - b.startMinutes || a.endMinutes - b.endMinutes)

  const result: TimetableLayoutEvent[] = []
  let index = 0

  while (index < valid.length) {
    const cluster: typeof valid = []
    let clusterEnd = valid[index].endMinutes
    let cursor = index

    while (cursor < valid.length && (cursor === index || valid[cursor].startMinutes < clusterEnd)) {
      cluster.push(valid[cursor])
      clusterEnd = Math.max(clusterEnd, valid[cursor].endMinutes)
      cursor += 1
    }

    const columnEnds: number[] = []
    const assigned = cluster.map(event => {
      let column = columnEnds.findIndex(end => end <= event.startMinutes)
      if (column === -1) {
        column = columnEnds.length
        columnEnds.push(event.endMinutes)
      } else {
        columnEnds[column] = event.endMinutes
      }
      return { ...event, column }
    })

    const columnCount = Math.max(1, columnEnds.length)
    result.push(...assigned.map(event => ({ ...event, columnCount })))
    index = cursor
  }

  return result
}

export function minutesToOffset(minutes: number, startHour: number, hourHeight: number): number {
  return ((minutes - startHour * 60) / 60) * hourHeight
}
