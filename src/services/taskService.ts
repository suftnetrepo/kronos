import { and, asc, eq, gte, lt } from 'drizzle-orm'
import { randomUUID } from 'expo-crypto'
import { db } from '../db'
import { tasks } from '../db/schema'
import type { NewTask, Task } from '../db/schema'
import { cancelTaskReminder, scheduleTaskReminder } from './notificationService'

const startOfDay = (date = new Date()) => { const d = new Date(date); d.setHours(0,0,0,0); return d }
const nextDay = (date = new Date()) => { const d = startOfDay(date); d.setDate(d.getDate()+1); return d }

async function scheduleForTask(task: Task): Promise<string | null> {
  if (task.isCompleted || !task.reminderAt) return null
  return scheduleTaskReminder(task.id, task.title, new Date(task.reminderAt))
}

export const taskService = {
  getAll: async (): Promise<Task[]> => db.select().from(tasks).orderBy(asc(tasks.dueAt)),
  getToday: async (): Promise<Task[]> => db.select().from(tasks).where(and(eq(tasks.isCompleted, false), gte(tasks.dueAt, startOfDay()), lt(tasks.dueAt, nextDay()))).orderBy(asc(tasks.dueAt)),
  getUpcoming: async (): Promise<Task[]> => db.select().from(tasks).where(and(eq(tasks.isCompleted, false), gte(tasks.dueAt, nextDay()))).orderBy(asc(tasks.dueAt)),
  getById: async (id: string): Promise<Task | null> => (await db.select().from(tasks).where(eq(tasks.id,id)))[0] ?? null,
  getBySubject: async (subjectId: string): Promise<Task[]> => db.select().from(tasks).where(eq(tasks.subjectId, subjectId)).orderBy(asc(tasks.dueAt)),
  getByExam: async (examId: string): Promise<Task[]> => db.select().from(tasks).where(eq(tasks.examId, examId)).orderBy(asc(tasks.dueAt)),

  create: async (input: Omit<NewTask,'id'|'createdAt'|'updatedAt'|'notificationId'> & { notificationId?: string | null }): Promise<Task> => {
    const now = new Date()
    const rows = await db.insert(tasks).values({ ...input, notificationId: null, id: randomUUID(), createdAt: now, updatedAt: now }).returning()
    const task = rows[0]
    const notificationId = await scheduleForTask(task)
    if (notificationId) {
      await db.update(tasks).set({ notificationId }).where(eq(tasks.id, task.id))
      task.notificationId = notificationId
    }
    return task
  },

  update: async (id: string, input: Partial<NewTask>): Promise<Task | null> => {
    const current = await taskService.getById(id)
    if (!current) return null
    await cancelTaskReminder(current.notificationId)
    const merged = { ...current, ...input, notificationId: null, updatedAt: new Date() } as Task
    await db.update(tasks).set({ ...input, notificationId: null, updatedAt: merged.updatedAt }).where(eq(tasks.id,id))
    const notificationId = await scheduleForTask(merged)
    if (notificationId) await db.update(tasks).set({ notificationId }).where(eq(tasks.id,id))
    return taskService.getById(id)
  },

  complete: async (id: string, done: boolean): Promise<void> => {
    const current = await taskService.getById(id)
    if (!current) return
    await cancelTaskReminder(current.notificationId)
    const completedAt = done ? new Date() : null
    await db.update(tasks).set({ isCompleted: done, completedAt, notificationId: null, updatedAt: new Date() }).where(eq(tasks.id,id))
    if (!done && current.reminderAt && new Date(current.reminderAt) > new Date()) {
      const notificationId = await scheduleTaskReminder(id, current.title, new Date(current.reminderAt))
      if (notificationId) await db.update(tasks).set({ notificationId }).where(eq(tasks.id,id))
    }
  },

  remove: async (id: string): Promise<void> => {
    const current = await taskService.getById(id)
    await cancelTaskReminder(current?.notificationId)
    await db.delete(tasks).where(eq(tasks.id,id))
  },
}
