import React from 'react'
import { useLocalSearchParams } from 'expo-router'
import { EditSubjectSheet } from '../src/screens/subject/EditSubjectSheet'

export default function EditSubjectRoute() {
  const { id } = useLocalSearchParams<{ id: string }>()
  return <EditSubjectSheet subjectId={id} />
}
