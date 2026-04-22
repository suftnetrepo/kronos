import * as Notifications from 'expo-notifications'
import type { Subject, Day }  from '../db/schema'
import { DAY_FULL }            from '../db/schema'
import { db } from '../db'
import { subjects, exams } from '../db/schema'
import { eq } from 'drizzle-orm'
import { getSetting } from './settings.service'

// Configure notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge:  false,
  }),
})

// ─── Day of week mapping ──────────────────────────────────────────────────────
const DAY_TO_WEEKDAY: Record<Day, 1|2|3|4|5|6|7> = {
  MON: 2, TUE: 3, WED: 4, THU: 5, FRI: 6, SAT: 7, SUN: 1,
}

// ─── Helper: Parse reminder IDs from DB (stored as JSON) ────────────────────
const parseReminderIds = (reminderIdsText: string | null): string[] => {
  if (!reminderIdsText) return []
  try {
    return JSON.parse(reminderIdsText)
  } catch {
    console.warn('[notificationService] Failed to parse reminder IDs:', reminderIdsText)
    return []
  }
}

// ─── Helper: Serialize reminder IDs to DB (store as JSON) ───────────────────
const serializeReminderIds = (ids: string[]): string => {
  return JSON.stringify(ids)
}

// ─── Request permissions ──────────────────────────────────────────────────────
export const requestNotificationPermission = async (): Promise<boolean> => {
  const { status } = await Notifications.requestPermissionsAsync()
  return status === 'granted'
}

export const hasNotificationPermission = async (): Promise<boolean> => {
  const { status } = await Notifications.getPermissionsAsync()
  return status === 'granted'
}

// ─── Schedule weekly repeating reminder for a subject ─────────────────────────
// Returns array of notification IDs (one per day the subject occurs)
// Checks remindersEnabled setting before scheduling
export const scheduleSubjectReminders = async (subject: Subject): Promise<string[]> => {
  if (!subject.reminder || !subject.days) return []

  // Check if reminders are globally enabled
  const remindersEnabled = await getSetting<boolean>('remindersEnabled')
  if (!remindersEnabled) {
    console.log('[notificationService] Reminders disabled globally, skipping schedule')
    return []
  }

  const hasPermission = await hasNotificationPermission()
  if (!hasPermission) return []

  const days    = subject.days.split(',') as Day[]
  const ids: string[] = []

  for (const day of days) {
    const [hours, minutes] = subject.startTime.split(':').map(Number)
    const reminderMinutes  = subject.reminder

    // Calculate trigger time = class start - reminder minutes
    let triggerHour   = hours
    let triggerMinute = minutes - reminderMinutes

    if (triggerMinute < 0) {
      triggerMinute += 60
      triggerHour   -= 1
    }
    if (triggerHour < 0) triggerHour = 23

    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: `📚 ${subject.name} in ${reminderMinutes} min`,
        body:  [
          subject.teacher ? `Teacher: ${subject.teacher}` : '',
          subject.room    ? `Room: ${subject.room}`        : '',
        ].filter(Boolean).join(' · ') || DAY_FULL[day],
        data: { subjectId: subject.id },
      },
      trigger: {
        type:    Notifications.SchedulableTriggerInputTypes.WEEKLY,
        weekday: DAY_TO_WEEKDAY[day],
        hour:    triggerHour,
        minute:  triggerMinute,
      },
    })
    ids.push(id)
  }

  return ids
}

// ─── Store reminder IDs on a subject ──────────────────────────────────────────
export const storeReminderIds = async (subjectId: string, ids: string[]): Promise<void> => {
  try {
    await db
      .update(subjects)
      .set({ reminderIds: serializeReminderIds(ids) })
      .where(eq(subjects.id, subjectId))
  } catch (err) {
    console.error('[notificationService] Failed to store reminder IDs:', err)
  }
}

// ─── Get stored reminder IDs for a subject ────────────────────────────────────
export const getStoredReminderIds = async (subjectId: string): Promise<string[]> => {
  try {
    const rows = await db.select().from(subjects).where(eq(subjects.id, subjectId))
    if (!rows.length) return []
    return parseReminderIds(rows[0].reminderIds)
  } catch (err) {
    console.error('[notificationService] Failed to retrieve reminder IDs:', err)
    return []
  }
}

// ─── Cancel all notifications for a subject ───────────────────────────────────
export const cancelSubjectReminders = async (notificationIds: string[]): Promise<void> => {
  if (!notificationIds.length) return
  try {
    await Promise.all(
      notificationIds.map(id => Notifications.cancelScheduledNotificationAsync(id).catch(err => {
        console.warn(`[notificationService] Failed to cancel notification ${id}:`, err)
      }))
    )
  } catch (err) {
    console.error('[notificationService] Error in cancelSubjectReminders:', err)
  }
}

// ─── Cancel all app notifications ────────────────────────────────────────────
export const cancelAllReminders = async (): Promise<void> => {
  await Notifications.cancelAllScheduledNotificationsAsync()
}

// ─── Verify reminder IDs still exist in OS ────────────────────────────────────
// Returns verified IDs that are actually scheduled, empty array if stale
async function verifyReminderIdsExist(reminderIds: string[]): Promise<string[]> {
  if (reminderIds.length === 0) return []
  
  try {
    // Get all currently scheduled notifications from OS
    const scheduled = await Notifications.getAllScheduledNotificationsAsync()
    const scheduledIds = new Set(scheduled.map(n => n.identifier))
    
    // Filter to only existing IDs
    const validIds = reminderIds.filter(id => scheduledIds.has(id))
    
    if (validIds.length < reminderIds.length) {
      const staleCount = reminderIds.length - validIds.length
      console.warn(
        `[notificationService] Found ${staleCount} stale reminder ID(s) ` +
        `(${reminderIds.length} stored, ${validIds.length} verified in OS)`
      )
    }
    
    return validIds
  } catch (err) {
    console.error('[notificationService] Error verifying reminder IDs:', err)
    // On error, assume stale (safer to reschedule)
    return []
  }
}

// ─── Reschedule all reminders on app startup ─────────────────────────────────
// This ensures reminders are restored if they were cleared by the OS, permissions
// changed, or other edge cases occurred. Verifies stored IDs before skipping.
export const rescheduleAllReminders = async (): Promise<void> => {
  try {
    const remindersEnabled = await getSetting<boolean>('remindersEnabled')
    if (!remindersEnabled) {
      console.log('[notificationService] App reminders disabled, skipping reschedule')
      return
    }

    const hasPermission = await hasNotificationPermission()
    if (!hasPermission) {
      console.log('[notificationService] No notification permission, skipping reschedule')
      // When permission is regained, all stored IDs become invalid
      // Clear them so they'll be rescheduled next time permission is granted
      return
    }

    // Get all subjects
    const allSubjects = await db.select().from(subjects)

    // Reschedule reminders for all subjects that have them enabled
    for (const subject of allSubjects) {
      if (!subject.reminder) continue

      // Get stored reminder IDs
      const storedIds = parseReminderIds(subject.reminderIds)
      
      // Verify stored IDs still exist in OS (handles permission changes, OS cleanup, etc.)
      const validIds = await verifyReminderIdsExist(storedIds)

      if (validIds.length === storedIds.length && validIds.length > 0) {
        // All stored IDs verified as still scheduled, skip
        console.log(`[notificationService] Verified ${validIds.length} active reminders for "${subject.name}"`)
        continue
      }

      // Stale or missing IDs detected, reschedule
      if (storedIds.length > 0) {
        console.log(
          `[notificationService] Stale reminder IDs detected for "${subject.name}", ` +
          `rescheduling (had ${storedIds.length}, verified ${validIds.length})`
        )
        // Cancel any partially valid IDs before rescheduling
        if (validIds.length > 0) {
          await cancelSubjectReminders(validIds)
        }
      }

      try {
        // Schedule new notifications
        const newIds = await scheduleSubjectReminders(subject)
        if (newIds.length > 0) {
          await storeReminderIds(subject.id, newIds)
          console.log(`[notificationService] Rescheduled ${newIds.length} reminders for "${subject.name}"`)
        }
      } catch (err) {
        console.error(`[notificationService] Failed to reschedule reminders for "${subject.name}":`, err)
      }
    }
    console.log('[notificationService] Rescheduling complete')
  } catch (err) {
    console.error('[notificationService] Error in rescheduleAllReminders:', err)
  }
}

// ─── Force full resync of all reminders ────────────────────────────────────────
// Use this for manual recovery if reminders become out of sync with the OS.
// Clears all stored reminder IDs and reschedules from scratch.
// Returns count of subjects rescheduled.
export const forceResyncAllReminders = async (): Promise<number> => {
  try {
    console.log('[notificationService] Starting forced full reminder resync...')
    
    const remindersEnabled = await getSetting<boolean>('remindersEnabled')
    if (!remindersEnabled) {
      console.log('[notificationService] App reminders disabled, cannot resync')
      return 0
    }

    const hasPermission = await hasNotificationPermission()
    if (!hasPermission) {
      console.log('[notificationService] No notification permission, cannot resync')
      return 0
    }

    // Clear all scheduled notifications
    await cancelAllReminders()
    console.log('[notificationService] Cleared all scheduled notifications')

    // Get all subjects
    const allSubjects = await db.select().from(subjects)
    let rescheduledCount = 0

    // Clear all stored reminder IDs and reschedule everything
    for (const subject of allSubjects) {
      if (!subject.reminder) continue

      try {
        // Clear stored IDs
        await storeReminderIds(subject.id, [])

        // Schedule fresh
        const newIds = await scheduleSubjectReminders(subject)
        if (newIds.length > 0) {
          await storeReminderIds(subject.id, newIds)
          console.log(`[notificationService] Rescheduled ${newIds.length} reminders for "${subject.name}"`)
          rescheduledCount++
        }
      } catch (err) {
        console.error(`[notificationService] Failed to resync reminders for "${subject.name}":`, err)
      }
    }
    
    console.log(`[notificationService] Forced resync complete (${rescheduledCount} subjects rescheduled)`)
    return rescheduledCount
  } catch (err) {
    console.error('[notificationService] Error in forceResyncAllReminders:', err)
    return 0
  }
}

// ─── Schedule one-time reminder for an exam ────────────────────────────────────
// Returns notification ID if scheduled, null if skipped
export const scheduleExamReminder = async (
  examId: string,
  examTitle: string,
  examDate: Date,
  reminderMinutes: number
): Promise<string | null> => {
  // Check if reminders are globally enabled
  const remindersEnabled = await getSetting<boolean>('remindersEnabled')
  if (!remindersEnabled) {
    console.log('[notificationService] Reminders disabled globally, skipping exam reminder')
    return null
  }

  const hasPermission = await hasNotificationPermission()
  if (!hasPermission) {
    console.log('[notificationService] No notification permission, skipping exam reminder')
    return null
  }

  // Calculate trigger time = exam time - reminder minutes
  const triggerDate = new Date(examDate.getTime() - reminderMinutes * 60 * 1000)
  const now = new Date()

  // Skip if trigger time is in the past
  if (triggerDate <= now) {
    console.log(`[notificationService] Exam reminder time is in the past, skipping`)
    return null
  }

  try {
    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: `📝 ${examTitle} in ${reminderMinutes < 60 ? reminderMinutes + ' min' : Math.round(reminderMinutes / 60) + ' hour' + (Math.round(reminderMinutes / 60) !== 1 ? 's' : '')}`,
        body: `Exam at ${examDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
        data: { examId },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: triggerDate,
      },
    })
    console.log(`[notificationService] Scheduled exam reminder for "${examTitle}" (ID: ${id})`)
    return id
  } catch (err) {
    console.error('[notificationService] Failed to schedule exam reminder:', err)
    return null
  }
}

// ─── Cancel a single exam reminder ─────────────────────────────────────────────
export const cancelExamReminder = async (reminderId: string | null): Promise<void> => {
  if (!reminderId) return
  try {
    await Notifications.cancelScheduledNotificationAsync(reminderId)
    console.log(`[notificationService] Cancelled exam reminder (ID: ${reminderId})`)
  } catch (err) {
    console.warn(`[notificationService] Failed to cancel exam reminder ${reminderId}:`, err)
  }
}
