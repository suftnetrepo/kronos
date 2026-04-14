import { useCallback }    from 'react'
import { subjectService }  from '../services/subjectService'
import { useAppStore }     from '../stores'
import { useAsync }        from './useAsync'
import type { Day, Subject, NewSubject } from '../db/schema'

export function useSubjects(day?: Day) {
  const { dataVersion, invalidateData } = useAppStore()

  const state = useAsync<Subject[]>(
    () => day ? subjectService.getByDay(day) : subjectService.getAll(),
    [],
    [dataVersion, day],
  )

  const create = useCallback(async (
    input: Omit<NewSubject, 'id' | 'createdAt' | 'updatedAt'>
  ) => {
    const subject = await subjectService.create(input)
    invalidateData()
    return subject
  }, [invalidateData])

  const update = useCallback(async (
    id: string,
    input: Partial<Omit<NewSubject, 'id' | 'createdAt'>>
  ) => {
    await subjectService.update(id, input)
    invalidateData()
  }, [invalidateData])

  const remove = useCallback(async (id: string) => {
    await subjectService.remove(id)
    invalidateData()
  }, [invalidateData])

  return { ...state, create, update, remove }
}
