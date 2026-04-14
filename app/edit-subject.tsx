import React, { useState } from 'react'
import { router, useLocalSearchParams } from 'expo-router'
import { Stack } from 'fluent-styles'
import { EditSubjectSheet } from '../src/screens/subject/EditSubjectSheet'

export default function EditSubjectRoute() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const [visible] = useState(true)

  return (
    <Stack flex={1} backgroundColor="transparent">
      <EditSubjectSheet
        subjectId={id}
        visible={visible}
        onClose={() => router.back()}
        onDeleted={() => router.back()}
      />
    </Stack>
  )
}
