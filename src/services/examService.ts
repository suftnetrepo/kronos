import { db }        from '../db'
import { exams }      from '../db/schema'
import { eq, asc }    from 'drizzle-orm'
import { randomUUID } from 'expo-crypto'
import type { Exam, NewExam } from '../db/schema'

export const examService = {

  getAll: async (): Promise<Exam[]> => {
    return db.select().from(exams).orderBy(asc(exams.date))
  },

  create: async (
    input: Omit<NewExam, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<Exam> => {
    const now  = new Date()
    const id   = randomUUID()
    const rows = await db.insert(exams).values({
      ...input,
      id,
      createdAt: now,
      updatedAt: now,
    }).returning()
    return rows[0]
  },

  update: async (
    id: string,
    input: Partial<Omit<NewExam, 'id' | 'createdAt' | 'updatedAt'>>
  ): Promise<void> => {
    await db.update(exams)
      .set({ ...input, updatedAt: new Date() })
      .where(eq(exams.id, id))
  },

  remove: async (id: string): Promise<void> => {
    await db.delete(exams).where(eq(exams.id, id))
  },
}
