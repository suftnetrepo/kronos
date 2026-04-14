import { db }           from '../db'
import { subjects }      from '../db/schema'
import { eq, asc }       from 'drizzle-orm'
import type { Subject, NewSubject, Day } from '../db/schema'
import { randomUUID }    from 'expo-crypto'

export const subjectService = {

  getAll: async (): Promise<Subject[]> => {
    return db.select().from(subjects).orderBy(asc(subjects.startTime))
  },

  getByDay: async (day: Day): Promise<Subject[]> => {
    const all = await db.select().from(subjects).orderBy(asc(subjects.startTime))
    // Filter by day — days stored as "MON,WED,FRI"
    return all.filter(s => s.days.split(',').includes(day))
  },

  getById: async (id: string): Promise<Subject | null> => {
    const rows = await db.select().from(subjects).where(eq(subjects.id, id))
    return rows[0] ?? null
  },

  create: async (input: Omit<NewSubject, 'id' | 'createdAt' | 'updatedAt'>): Promise<Subject> => {
    const now  = new Date()
    const id   = randomUUID()
    const rows = await db.insert(subjects).values({
      ...input,
      id,
      createdAt: now,
      updatedAt: now,
    }).returning()
    return rows[0]
  },

  update: async (id: string, input: Partial<Omit<NewSubject, 'id' | 'createdAt'>>): Promise<void> => {
    await db.update(subjects)
      .set({ ...input, updatedAt: new Date() })
      .where(eq(subjects.id, id))
  },

  remove: async (id: string): Promise<void> => {
    await db.delete(subjects).where(eq(subjects.id, id))
  },
}
