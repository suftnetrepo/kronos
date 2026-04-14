import { useCallback }     from 'react'
import { homeworkService }  from '../services/homeworkService'
import { useAppStore }      from '../stores'
import { useAsync }         from './useAsync'
import type { Homework, NewHomework } from '../db/schema'

export function useHomework() {
  const { dataVersion, invalidateData } = useAppStore()

  const state = useAsync<Homework[]>(
    () => homeworkService.getAll(),
    [],
    [dataVersion],
  )

  const create = useCallback(async (
    input: Omit<NewHomework, 'id' | 'createdAt' | 'updatedAt'>
  ) => {
    const hw = await homeworkService.create(input)
    invalidateData()
    return hw
  }, [invalidateData])

  const toggleDone = useCallback(async (id: string, done: boolean) => {
    await homeworkService.toggleDone(id, done)
    invalidateData()
  }, [invalidateData])

  const remove = useCallback(async (id: string) => {
    await homeworkService.remove(id)
    invalidateData()
  }, [invalidateData])

  const pending = state.data.filter(h => !h.done)
  const done    = state.data.filter(h => h.done)

  return { ...state, create, toggleDone, remove, pending, done }
}
