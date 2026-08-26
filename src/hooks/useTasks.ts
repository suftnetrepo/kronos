import { useCallback } from 'react'
import { useAsync } from './useAsync'
import { useAppStore } from '../stores'
import { taskService } from '../services/taskService'
import type { NewTask, Task } from '../db/schema'

export function useTasks() {
  const { dataVersion, invalidateData } = useAppStore()
  const state = useAsync<Task[]>(() => taskService.getAll(), [], [dataVersion])
  const create = useCallback(async (input: Omit<NewTask,'id'|'createdAt'|'updatedAt'>) => { const v=await taskService.create(input); invalidateData(); return v },[invalidateData])
  const update = useCallback(async(id:string,input:Partial<NewTask>)=>{const v=await taskService.update(id,input);invalidateData();return v},[invalidateData])
  const complete = useCallback(async(id:string,done:boolean)=>{await taskService.complete(id,done);invalidateData()},[invalidateData])
  const remove = useCallback(async(id:string)=>{await taskService.remove(id);invalidateData()},[invalidateData])
  return {...state,create,update,complete,remove, active:state.data.filter(x=>!x.isCompleted), completed:state.data.filter(x=>x.isCompleted)}
}
