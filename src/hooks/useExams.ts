import { useCallback }  from 'react'
import { examService }  from '../services/examService'
import { useAppStore }  from '../stores'
import { useAsync }     from './useAsync'
import type { Exam, NewExam } from '../db/schema'

export function useExams() {
  const { dataVersion, invalidateData } = useAppStore()

  const state = useAsync<Exam[]>(
    () => examService.getAll(),
    [],
    [dataVersion],
  )

  const create = useCallback(async (
    input: Omit<NewExam, 'id' | 'createdAt' | 'updatedAt'>
  ) => {
    const exam = await examService.create(input)
    invalidateData()
    return exam
  }, [invalidateData])

  const update = useCallback(async (
    id: string,
    input: Partial<Omit<NewExam, 'id' | 'createdAt' | 'updatedAt'>>
  ) => {
    await examService.update(id, input)
    invalidateData()
  }, [invalidateData])

  const remove = useCallback(async (id: string) => {
    await examService.remove(id)
    invalidateData()
  }, [invalidateData])

  const now       = new Date()
  const upcoming  = state.data.filter(e => new Date(e.date) >= now)
  const past      = state.data.filter(e => new Date(e.date) <  now)

  return { ...state, create, update, remove, upcoming, past }
}
