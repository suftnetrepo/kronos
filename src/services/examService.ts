import { db }        from '../db'
import { exams }      from '../db/schema'
import { eq, asc }    from 'drizzle-orm'
import { randomUUID } from 'expo-crypto'
import type { Exam, NewExam } from '../db/schema'
import { scheduleExamReminder, cancelExamReminder } from './notificationService'

export const examService = {

  getAll: async (): Promise<Exam[]> => {
    return db.select().from(exams).orderBy(asc(exams.date))
  },

  create: async (
    input: Omit<NewExam, 'id' | 'createdAt' | 'updatedAt' | 'reminderId'> & { reminder?: number | null }
  ): Promise<Exam> => {
    const now  = new Date()
    const id   = randomUUID()
    
    // Schedule reminder if specified
    let reminderId: string | null = null
    if (input.reminder) {
      reminderId = await scheduleExamReminder(id, input.title, input.date, input.reminder)
    }

    const rows = await db.insert(exams).values({
      ...input,
      id,
      reminderId: reminderId ?? null,
      createdAt: now,
      updatedAt: now,
    }).returning()
    return rows[0]
  },

  update: async (
    id: string,
    input: Partial<Omit<NewExam, 'id' | 'createdAt' | 'updatedAt' | 'reminderId'>> & { reminder?: number | null }
  ): Promise<void> => {
    // Get current exam to access old reminder ID
    const current = await db.select().from(exams).where(eq(exams.id, id))
    const oldExam = current[0]

    // Cancel old reminder if it exists
    if (oldExam?.reminderId) {
      await cancelExamReminder(oldExam.reminderId)
    }

    // Schedule new reminder if specified
    let reminderId: string | null = oldExam?.reminderId ?? null
    if (input.reminder !== undefined) {
      if (input.reminder) {
        // Use provided values, fall back to old exam values if not provided
        const title = input.title ?? oldExam.title
        const date = input.date ?? oldExam.date
        reminderId = await scheduleExamReminder(id, title, date, input.reminder)
      } else {
        reminderId = null
      }
    } else if (input.title || input.date) {
      // If title or date changed but reminder wasn't explicitly changed, reschedule with old reminder time
      if (oldExam?.reminder) {
        const title = input.title ?? oldExam.title
        const date = input.date ?? oldExam.date
        reminderId = await scheduleExamReminder(id, title, date, oldExam.reminder)
      }
    }

    await db.update(exams)
      .set({ 
        ...input, 
        reminderId: reminderId ?? null,
        updatedAt: new Date() 
      })
      .where(eq(exams.id, id))
  },

  remove: async (id: string): Promise<void> => {
    // Get exam to access reminder ID
    const current = await db.select().from(exams).where(eq(exams.id, id))
    const exam = current[0]

    // Cancel reminder if it exists
    if (exam?.reminderId) {
      await cancelExamReminder(exam.reminderId)
    }

    await db.delete(exams).where(eq(exams.id, id))
  },
}
