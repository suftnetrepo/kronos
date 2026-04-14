import { db }        from '../db'
import { homework }  from '../db/schema'
import { eq, asc, desc } from 'drizzle-orm'
import type { Homework, NewHomework } from '../db/schema'
import { randomUUID } from 'expo-crypto'

export const homeworkService = {

  getAll: async (): Promise<Homework[]> => {
    return db.select().from(homework).orderBy(asc(homework.dueDate))
  },

  getPending: async (): Promise<Homework[]> => {
    const all = await db.select().from(homework).orderBy(asc(homework.dueDate))
    return all.filter(h => !h.done)
  },

  create: async (input: Omit<NewHomework, 'id' | 'createdAt' | 'updatedAt'>): Promise<Homework> => {
    const now  = new Date()
    const id   = randomUUID()
    const rows = await db.insert(homework).values({
      ...input,
      id,
      createdAt: now,
      updatedAt: now,
    }).returning()
    return rows[0]
  },

  toggleDone: async (id: string, done: boolean): Promise<void> => {
    await db.update(homework)
      .set({ done, updatedAt: new Date() })
      .where(eq(homework.id, id))
  },

  remove: async (id: string): Promise<void> => {
    await db.delete(homework).where(eq(homework.id, id))
  },
}
