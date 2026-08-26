import React from 'react'
import { Stack, StyledPressable } from 'fluent-styles'
import { Text } from './text'
import { useColors } from '../constants'

type Props = {
  title: string
  onCancel: () => void
  onSave: () => void
  saveDisabled?: boolean
  cancelLabel?: string
  saveLabel?: string
}

/**
 * Shared header for the "Cancel / Title / Save" modal-form pattern —
 * New Task, Add/Edit Subject, Add/Edit Exam. One implementation instead of
 * several near-identical hand-rolled copies (see the header audit).
 */
export function ModalFormHeader({
  title, onCancel, onSave, saveDisabled = false, cancelLabel = 'Cancel', saveLabel = 'Save',
}: Props) {
  const C = useColors()
  return (
    <Stack
      flexDirection="row" alignItems="center" justifyContent="space-between"
      paddingHorizontal={20} paddingVertical={14}
      borderBottomWidth={1} borderBottomColor={C.border}
    >
      <StyledPressable onPress={onCancel}>
        <Text variant="button" color={C.textMuted}>{cancelLabel}</Text>
      </StyledPressable>
      <Text variant="title" color={C.textPrimary}>{title}</Text>
      <StyledPressable onPress={onSave} disabled={saveDisabled}>
        <Text variant="button" color={saveDisabled ? C.textMuted : C.primary}>{saveLabel}</Text>
      </StyledPressable>
    </Stack>
  )
}
