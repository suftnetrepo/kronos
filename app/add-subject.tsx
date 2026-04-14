import React, { useState } from 'react'
import { router } from 'expo-router'
import { Stack } from 'fluent-styles'
import { AddSubjectSheet } from '../src/screens/subject/AddSubjectSheet'

export default function AddSubjectRoute() {
  const [visible] = useState(true)
  return (
    <Stack flex={1} backgroundColor="transparent">
      <AddSubjectSheet
        visible={visible}
        onClose={() => router.back()}
      />
    </Stack>
  )
}
