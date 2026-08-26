import { differenceInCalendarDays } from 'date-fns'

export const startOfLocalDay = (value: Date = new Date()) => {
  const d = new Date(value)
  d.setHours(0, 0, 0, 0)
  return d
}

export const nextLocalDay = (value: Date = new Date()) => {
  const d = startOfLocalDay(value)
  d.setDate(d.getDate() + 1)
  return d
}

export const isSameLocalDay = (a: Date, b: Date) =>
  startOfLocalDay(a).getTime() === startOfLocalDay(b).getTime()

export type CalendarDateState =
  | { kind: 'today'; days: 0 }
  | { kind: 'future'; days: number }
  | { kind: 'past'; days: number }

export const getCalendarDateState = (date: Date, now: Date = new Date()): CalendarDateState => {
  const days = differenceInCalendarDays(startOfLocalDay(date), startOfLocalDay(now))
  if (days === 0) return { kind: 'today', days: 0 }
  if (days > 0) return { kind: 'future', days }
  return { kind: 'past', days }
}
