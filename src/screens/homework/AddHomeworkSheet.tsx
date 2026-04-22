import React, { useState, useCallback } from 'react'
import { ScrollView, Modal } from 'react-native'
import {
  Stack, StyledPressable, StyledTextInput,
  StyledDivider, StyledDatePicker,
} from 'fluent-styles'
import { toastService, loaderService } from 'fluent-styles'
import { format } from 'date-fns'
import { Text } from '../../components/text'
import { useColors } from '../../constants'
import { useHomework, useSubjects } from '../../hooks'
import { useAppStore } from '../../stores'
import { usePremium } from '../../hooks/usePremium'
import type { Subject } from '../../db/schema'

interface AddHomeworkSheetProps {
  visible:  boolean
  onClose:  () => void
}

export function AddHomeworkSheet({ visible, onClose }: AddHomeworkSheetProps) {
  const Colors = useColors()
  const { create, data: allHomework } = useHomework()
  const { data: subjects }            = useSubjects()
  const { invalidateData }            = useAppStore()
  const premium                       = usePremium()

  const [title,      setTitle]      = useState('')
  const [desc,       setDesc]       = useState('')
  const [subjectId,  setSubjectId]  = useState<string | null>(null)
  const [dueDate,    setDueDate]    = useState<Date>(new Date())
  const [showDate,   setShowDate]   = useState(false)
  const [showSubjects, setShowSubjects] = useState(false)

  const selectedSubject = subjects.find(s => s.id === subjectId)

  const reset = () => {
    setTitle(''); setDesc(''); setSubjectId(null)
    setDueDate(new Date()); setShowDate(false)
  }

  const handleSave = useCallback(async () => {
    // Count only this month's homework for the free limit check
    const now = new Date()
    const thisMonthCount = allHomework.filter(h => {
      const d = new Date(h.createdAt)
      return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()
    }).length
    if (!premium.canAddHomework(thisMonthCount)) {
      toastService.error(
        'Free limit reached',
        `Upgrade to Premium to add more than ${premium.limits.HOMEWORK_MONTH} homework items per month`,
      )
      onClose()
      const { router } = require('expo-router')
      router.push('/premium')
      return
    }
    if (!title.trim()) { toastService.error('Title required', 'Enter a homework title'); return }

    const id = loaderService.show({ label: 'Saving…', variant: 'spinner' })
    try {
      await create({
        title:       title.trim(),
        description: desc.trim() || null,
        subjectId:   subjectId ?? null,
        dueDate,
        done:        false,
      })
      invalidateData()
      toastService.success('Homework added!')
      reset()
      onClose()
    } catch (err: any) {
      toastService.error('Failed to save', err?.message)
    } finally {
      loaderService.hide(id)
    }
  }, [premium, allHomework, title, desc, subjectId, dueDate, create, invalidateData, onClose])

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Stack flex={1} backgroundColor="rgba(0,0,0,0.45)" justifyContent="center" alignItems="center">
        <Stack
          maxHeight="95%"
          width="100%"
          maxWidth={450}
          backgroundColor={Colors.bgCard}
          borderRadius={28}
        >
          {/* Handle */}
          <Stack alignItems="center" paddingTop={12} paddingBottom={4}>
            <Stack width={40} height={4} borderRadius={2} backgroundColor={Colors.border} />
          </Stack>

          {/* Header */}
          <Stack flexDirection="row" alignItems="center" justifyContent="space-between"
            paddingHorizontal={20} paddingVertical={14}
            borderBottomWidth={1} borderBottomColor={Colors.border}>
            <StyledPressable onPress={() => { reset(); onClose() }}>
              <Text variant="button" color={Colors.textMuted}>Cancel</Text>
            </StyledPressable>
            <Text variant="title" color={Colors.textPrimary}>Add Homework</Text>
            <StyledPressable onPress={handleSave}>
              <Text variant="button" color={Colors.primary}>Save</Text>
            </StyledPressable>
          </Stack>

          <ScrollView showsVerticalScrollIndicator={false}
            contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>

            {/* Title */}
            <Stack gap={6} marginBottom={16}>
              <Text variant="overline" color={Colors.textMuted}>
                TITLE *
              </Text>
              <StyledTextInput
                variant="filled" placeholder="e.g. Chapter 5 exercises"
                value={title} onChangeText={setTitle}
                fontSize={15} borderRadius={12} autoFocus
                 returnKeyType='next'
              />
            </Stack>

            {/* Description */}
            <Stack gap={6} marginBottom={16}>
              <Text variant="overline" color={Colors.textMuted}>
                NOTES (OPTIONAL)
              </Text>
              <StyledTextInput
                variant="filled" placeholder="Any details..."
                value={desc} onChangeText={setDesc}
                fontSize={14} borderRadius={12}
                multiline numberOfLines={3}
                returnKeyType='next'
              />
            </Stack>

            {/* Subject picker */}
            <Stack gap={6} marginBottom={16}>
              <Text variant="overline" color={Colors.textMuted}>
                SUBJECT
              </Text>
              <StyledPressable
                flexDirection="row" alignItems="center" justifyContent="space-between"
                paddingHorizontal={16} paddingVertical={14}
                borderRadius={12} backgroundColor={Colors.bgInput}
                onPress={() => setShowSubjects(true)}
              >
                {selectedSubject ? (
                  <Stack flexDirection="row" alignItems="center" gap={10}>
                    <Stack width={12} height={12} borderRadius={6}
                      backgroundColor={selectedSubject.color} />
                    <Text variant="label" color={Colors.textPrimary}>
                      {selectedSubject.name}
                    </Text>
                  </Stack>
                ) : (
                  <Text variant="body" color={Colors.textMuted}>Select subject (optional)</Text>
                )}
                <Text variant="body" color={Colors.textMuted}>›</Text>
              </StyledPressable>
            </Stack>

            {/* Due date */}
            <Stack gap={6} marginBottom={16}>
              <Text variant="overline" color={Colors.textMuted}>
                DUE DATE
              </Text>
              <StyledPressable
                flexDirection="row" alignItems="center" justifyContent="space-between"
                paddingHorizontal={16} paddingVertical={14}
                borderRadius={12} backgroundColor={Colors.bgInput}
                onPress={() => setShowDate(true)}
              >
                <Text variant="label" color={Colors.textPrimary}>
                  📅  {format(dueDate, 'EEE, MMM d, yyyy')}
                </Text>
                <Text variant="body" color={Colors.textMuted}>›</Text>
              </StyledPressable>
            </Stack>

          </ScrollView>
        </Stack>
      </Stack>

      {/* Subject picker modal */}
      {showSubjects && (
        <SubjectPickerModal
          subjects={subjects}
          selected={subjectId}
          onSelect={id => { setSubjectId(id); setShowSubjects(false) }}
          onClose={() => setShowSubjects(false)}
        />
      )}

      {/* Date picker modal */}
      {showDate && (
        <Modal visible transparent animationType="slide" onRequestClose={() => setShowDate(false)}>
          <Stack flex={1} backgroundColor="rgba(0,0,0,0.5)" justifyContent="flex-end">
            <Stack backgroundColor={Colors.bgCard}
              borderTopLeftRadius={24} borderTopRightRadius={24}>
              <Stack flexDirection="row" alignItems="center" justifyContent="space-between"
                paddingHorizontal={20} paddingVertical={14}
                borderBottomWidth={1} borderBottomColor={Colors.border}>
                <StyledPressable onPress={() => setShowDate(false)}>
                <Text variant="button" color={Colors.textMuted}>Cancel</Text>
              </StyledPressable>
              <Text variant="title" color={Colors.textPrimary}>Due date</Text>
              <StyledPressable onPress={() => setShowDate(false)}>
                <Text variant="button" color={Colors.primary}>Done</Text>
                </StyledPressable>
              </Stack>
              <Stack paddingHorizontal={16} paddingBottom={32}>
                <StyledDatePicker
                  mode="date" variant="inline" value={dueDate}
                  onChange={setDueDate} showTodayButton
                  colors={{ selected: Colors.primary, today: Colors.primary, confirmBg: Colors.primary }}
                />
              </Stack>
            </Stack>
          </Stack>
        </Modal>
      )}
    </Modal>
  )
}

// ─── Subject picker ───────────────────────────────────────────────────────────
function SubjectPickerModal({ subjects, selected, onSelect, onClose }: {
  subjects:  Subject[]
  selected:  string | null
  onSelect:  (id: string | null) => void
  onClose:   () => void
}) {
  const Colors = useColors()
  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <Stack flex={1} backgroundColor="rgba(0,0,0,0.5)" justifyContent="flex-end">
        <Stack backgroundColor={Colors.bgCard}
          borderTopLeftRadius={24} borderTopRightRadius={24} maxHeight="60%">
          <Stack flexDirection="row" alignItems="center" justifyContent="space-between"
            paddingHorizontal={20} paddingVertical={14}
            borderBottomWidth={1} borderBottomColor={Colors.border}>
            <StyledPressable onPress={onClose}>
              <Text variant="button" color={Colors.textMuted}>Cancel</Text>
            </StyledPressable>
            <Text variant="title" color={Colors.textPrimary}>Select subject</Text>
            <Stack width={60} />
          </Stack>
          <ScrollView contentContainerStyle={{ paddingVertical: 8 }}>
            {/* None option */}
            <StyledPressable
              flexDirection="row" alignItems="center" gap={14}
              paddingHorizontal={20} paddingVertical={14}
              backgroundColor={!selected ? Colors.primary + '12' : 'transparent'}
              onPress={() => onSelect(null)}
            >
              <Stack width={12} height={12} borderRadius={6} backgroundColor={Colors.textMuted} />
              <Text flex={1} variant="label" color={Colors.textMuted}>
                No subject
              </Text>
              {!selected && <Text variant="button" color={Colors.primary}>✓</Text>}
            </StyledPressable>

            {subjects.map(s => (
              <StyledPressable
                key={s.id}
                flexDirection="row" alignItems="center" gap={14}
                paddingHorizontal={20} paddingVertical={14}
                backgroundColor={selected === s.id ? Colors.primary + '12' : 'transparent'}
                onPress={() => onSelect(s.id)}
              >
                <Stack width={12} height={12} borderRadius={6} backgroundColor={s.color} />
                <Text flex={1} variant={selected === s.id ? 'label' : 'body'}
                  color={selected === s.id ? Colors.primary : Colors.textPrimary}>
                  {s.name}
                </Text>
                {selected === s.id && <Text variant="button" color={Colors.primary}>✓</Text>}
              </StyledPressable>
            ))}
          </ScrollView>
        </Stack>
      </Stack>
    </Modal>
  )
}
