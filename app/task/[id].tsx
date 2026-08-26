import React from 'react'
import {useLocalSearchParams} from 'expo-router'
import TaskDetailScreen from '../../src/screens/tasks/TaskDetailScreen'
export default function TaskDetailRoute(){const {id}=useLocalSearchParams<{id:string}>();return <TaskDetailScreen id={String(id)}/>}
