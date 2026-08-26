import { db } from '../db'
import { subjects, homework, exams, tasks, settings } from '../db/schema'
import { cancelAllReminders } from './notificationService'

/**
 * Cross-entity data operations that don't belong to a single domain service.
 *
 * `resetAll` is the single source of truth for "Clear all data" — it must be
 * kept in sync with every user-owned planner table (subjects, tasks, exams,
 * the legacy homework table, settings). Screens should call this instead of
 * touching Drizzle directly.
 */
export const dataService = {
  resetAll: async (): Promise<void> => {
    // Cancel every scheduled notification first — subjects, tasks and exams
    // all schedule via expo-notifications, and there's no per-table way to
    // cancel just "this table's" reminders, so this covers all of them.
    await cancelAllReminders()

    await db.delete(tasks)
    await db.delete(exams)
    await db.delete(homework)
    await db.delete(subjects)
    await db.delete(settings)

    await db.insert(settings).values({
      id: 'singleton',
      firstDayOfWeek: 'MON',
      defaultTab: 'today',
      updatedAt: new Date(),
    })
  },
}
