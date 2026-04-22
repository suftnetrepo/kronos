import React, { useState, useCallback } from 'react'
import { ScrollView, Modal } from 'react-native'
import {
  Stack, StyledText, StyledPressable, StyledTextInput,
  StyledDivider, StyledDatePicker,
} from 'fluent-styles'
import { toastService, loaderService } from 'fluent-styles'
import { format } from 'date-fns'
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
              <StyledText fontSize={15} color={Colors.textMuted} fontWeight="600">Cancel</StyledText>
            </StyledPressable>
            <StyledText fontSize={17} fontWeight="800" color={Colors.textPrimary}>Add Homework</StyledText>
            <StyledPressable onPress={handleSave}>
              <StyledText fontSize={15} color={Colors.primary} fontWeight="700">Save</StyledText>
            </StyledPressable>
          </Stack>

          <ScrollView showsVerticalScrollIndicator={false}
            contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>

            {/* Title */}
            <Stack gap={6} marginBottom={16}>
              <StyledText fontSize={12} fontWeight="700" color={Colors.textMuted} letterSpacing={0.5}>
                TITLE *
              </StyledText>
              <StyledTextInput
                variant="filled" placeholder="e.g. Chapter 5 exercises"
                value={title} onChangeText={setTitle}
                fontSize={15} borderRadius={12} autoFocus
                 returnKeyType='next'
              />
            </Stack>

            {/* Description */}
            <Stack gap={6} marginBottom={16}>
              <StyledText fontSize={12} fontWeight="700" color={Colors.textMuted} letterSpacing={0.5}>
                NOTES (OPTIONAL)
              </StyledText>
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
              <StyledText fontSize={12} fontWeight="700" color={Colors.textMuted} letterSpacing={0.5}>
                SUBJECT
              </StyledText>
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
                    <StyledText fontSize={15} fontWeight="600" color={Colors.textPrimary}>
                      {selectedSubject.name}
                    </StyledText>
                  </Stack>
                ) : (
                  <StyledText fontSize={15} color={Colors.textMuted}>Select subject (optional)</StyledText>
                )}
                <StyledText fontSize={14} color={Colors.textMuted}>›</StyledText>
              </StyledPressable>
            </Stack>

            {/* Due date */}
            <Stack gap={6} marginBottom={16}>
              <StyledText fontSize={12} fontWeight="700" color={Colors.textMuted} letterSpacing={0.5}>
                DUE DATE
              </StyledText>
              <StyledPressable
                flexDirection="row" alignItems="center" justifyContent="space-between"
                paddingHorizontal={16} paddingVertical={14}
                borderRadius={12} backgroundColor={Colors.bgInput}
                onPress={() => setShowDate(true)}
              >
                <StyledText fontSize={15} fontWeight="600" color={Colors.textPrimary}>
                  📅  {format(dueDate, 'EEE, MMM d, yyyy')}
                </StyledText>
                <StyledText fontSize={14} color={Colors.textMuted}>›</StyledText>
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
                  <StyledText fontSize={15} color={Colors.textMuted} fontWeight="600">Cancel</StyledText>
                </StyledPressable>
                <StyledText fontSize={16} fontWeight="800" color={Colors.textPrimary}>Due date</StyledText>
                <StyledPressable onPress={() => setShowDate(false)}>
                  <StyledText fontSize={15} color={Colors.primary} fontWeight="700">Done</StyledText>
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
              <StyledText fontSize={15} color={Colors.textMuted} fontWeight="600">Cancel</StyledText>
            </StyledPressable>
            <StyledText fontSize={16} fontWeight="800" color={Colors.textPrimary}>Select subject</StyledText>
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
              <StyledText flex={1} fontSize={15} fontWeight="500" color={Colors.textMuted}>
                No subject
              </StyledText>
              {!selected && <StyledText fontSize={16} color={Colors.primary}>✓</StyledText>}
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
                <StyledText flex={1} fontSize={15}
                  fontWeight={selected === s.id ? '700' : '500'}
                  color={selected === s.id ? Colors.primary : Colors.textPrimary}>
                  {s.name}
                </StyledText>
                {selected === s.id && <StyledText fontSize={16} color={Colors.primary}>✓</StyledText>}
              </StyledPressable>
            ))}
          </ScrollView>
        </Stack>
      </Stack>
    </Modal>
  )
}
