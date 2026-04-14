import React, { useState } from 'react'
import { router } from 'expo-router'
import { Stack } from 'fluent-styles'
import { AddHomeworkSheet } from '../src/screens/homework/AddHomeworkSheet'

export default function AddHomeworkRoute() {
  const [visible] = useState(true)

  return (
    <Stack flex={1} backgroundColor="transparent">
      <AddHomeworkSheet
        visible={visible}
        onClose={() => router.back()}
      />
    </Stack>
  )
}
