import React from 'react'
import { useLocalSearchParams } from 'expo-router'
import { EditExamSheet } from '../src/screens/exams/EditExamSheet'

export default function EditExamRoute() {
  const { id } = useLocalSearchParams<{ id: string }>()
  return <EditExamSheet examId={id} />
}
