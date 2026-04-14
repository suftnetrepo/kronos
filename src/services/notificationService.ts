import * as Notifications from 'expo-notifications'
import type { Subject, Day }  from '../db/schema'
import { DAY_FULL }            from '../db/schema'

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
export const scheduleSubjectReminders = async (subject: Subject): Promise<string[]> => {
  if (!subject.reminder || !subject.days) return []

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

// ─── Cancel all notifications for a subject ───────────────────────────────────
export const cancelSubjectReminders = async (notificationIds: string[]): Promise<void> => {
  await Promise.all(
    notificationIds.map(id => Notifications.cancelScheduledNotificationAsync(id))
  )
}

// ─── Cancel all app notifications ────────────────────────────────────────────
export const cancelAllReminders = async (): Promise<void> => {
  await Notifications.cancelAllScheduledNotificationsAsync()
}
