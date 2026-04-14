import React, { useState, useCallback, useEffect } from 'react'
import { ScrollView, Modal } from 'react-native'
import {
  Stack, StyledText, StyledPressable, StyledTextInput,
  StyledDatePicker,
} from 'fluent-styles'
import { toastService, loaderService, dialogueService } from 'fluent-styles'
import { format } from 'date-fns'
import { useColors } from '../../constants'
import { useExams } from '../../hooks/useExams'
import { useSubjects } from '../../hooks'
import type { Exam, Subject } from '../../db/schema'

interface EditExamSheetProps {
  exam:    Exam | null
  visible: boolean
  onClose: () => void
}

export function EditExamSheet({ exam, visible, onClose }: EditExamSheetProps) {
  const Colors = useColors()
  const { update, remove }  = useExams()
  const { data: subjects }  = useSubjects()

  const [title,        setTitle]        = useState('')
  const [notes,        setNotes]        = useState('')
  const [room,         setRoom]         = useState('')
  const [subjectId,    setSubjectId]    = useState<string | null>(null)
  const [examDate,     setExamDate]     = useState<Date>(new Date())
  const [showDate,     setShowDate]     = useState(false)
  const [showSubjects, setShowSubjects] = useState(false)

  useEffect(() => {
    if (exam) {
      setTitle(exam.title)
      setNotes(exam.notes   ?? '')
      setRoom(exam.room     ?? '')
      setSubjectId(exam.subjectId ?? null)
      setExamDate(new Date(exam.date))
    }
  }, [exam])

  const selectedSubject = subjects.find(s => s.id === subjectId)

  const handleSave = useCallback(async () => {
    if (!exam) return
    if (!title.trim()) {
      toastService.error('Title required', 'Enter an exam title')
      return
    }
    try {
      await loaderService.wrap(
        () => update(exam.id, {
          title:     title.trim(),
          notes:     notes.trim() || null,
          room:      room.trim()  || null,
          subjectId: subjectId ?? null,
          date:      examDate,
        }),
        { label: 'Saving…', variant: 'spinner' },
      )
      toastService.success('Exam updated!')
      onClose()
    } catch (err: any) {
      toastService.error('Failed to save', err?.message)
    }
  }, [exam, title, notes, room, subjectId, examDate, update, onClose])

  const handleDelete = useCallback(async () => {
    if (!exam) return
    const ok = await dialogueService.confirm({
      title:        'Delete exam?',
      message:      `"${exam.title}" will be removed.`,
      icon:         '🗑️',
      confirmLabel: 'Delete',
      destructive:  true,
    })
    if (!ok) return
    try {
      await loaderService.wrap(
        () => remove(exam.id),
        { label: 'Deleting…', variant: 'spinner' },
      )
      toastService.success('Exam deleted')
      onClose()
    } catch (err: any) {
      toastService.error('Failed to delete', err?.message)
    }
  }, [exam, remove, onClose])

  if (!exam) return null

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Stack flex={1} backgroundColor="rgba(0,0,0,0.45)" justifyContent="flex-end">
        <Stack
          backgroundColor={Colors.bgCard}
          borderTopLeftRadius={28} borderTopRightRadius={28}
          maxHeight="85%"
        >
          {/* Handle */}
          <Stack alignItems="center" paddingTop={12} paddingBottom={4}>
            <Stack width={40} height={4} borderRadius={2} backgroundColor={Colors.border} />
          </Stack>

          {/* Header */}
          <Stack horizontal alignItems="center" justifyContent="space-between"
            paddingHorizontal={20} paddingVertical={14}
            borderBottomWidth={1} borderBottomColor={Colors.border}>
            <StyledPressable onPress={onClose}>
              <StyledText fontSize={15} color={Colors.textMuted} fontWeight="600">Cancel</StyledText>
            </StyledPressable>
            <StyledText fontSize={17} fontWeight="800" color={Colors.textPrimary}>Edit Exam</StyledText>
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
                variant="filled" placeholder="e.g. Midterm Exam"
                value={title} onChangeText={setTitle}
                fontSize={15} borderRadius={12}
              />
            </Stack>

            {/* Subject picker */}
            <Stack gap={6} marginBottom={16}>
              <StyledText fontSize={12} fontWeight="700" color={Colors.textMuted} letterSpacing={0.5}>
                SUBJECT
              </StyledText>
              <StyledPressable
                horizontal alignItems="center" justifyContent="space-between"
                paddingHorizontal={16} paddingVertical={14}
                borderRadius={12} backgroundColor={Colors.bgInput}
                onPress={() => setShowSubjects(true)}
              >
                {selectedSubject ? (
                  <Stack horizontal alignItems="center" gap={10}>
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

            {/* Date */}
            <Stack gap={6} marginBottom={16}>
              <StyledText fontSize={12} fontWeight="700" color={Colors.textMuted} letterSpacing={0.5}>
                DATE
              </StyledText>
              <StyledPressable
                horizontal alignItems="center" justifyContent="space-between"
                paddingHorizontal={16} paddingVertical={14}
                borderRadius={12} backgroundColor={Colors.bgInput}
                onPress={() => setShowDate(true)}
              >
                <StyledText fontSize={15} fontWeight="600" color={Colors.textPrimary}>
                  📅  {format(examDate, 'EEE, MMM d, yyyy')}
                </StyledText>
                <StyledText fontSize={14} color={Colors.textMuted}>›</StyledText>
              </StyledPressable>
            </Stack>

            {/* Room */}
            <Stack gap={6} marginBottom={16}>
              <StyledText fontSize={12} fontWeight="700" color={Colors.textMuted} letterSpacing={0.5}>
                ROOM (OPTIONAL)
              </StyledText>
              <StyledTextInput
                variant="filled" placeholder="e.g. Hall B, Room 204"
                value={room} onChangeText={setRoom}
                fontSize={15} borderRadius={12}
              />
            </Stack>

            {/* Notes */}
            <Stack gap={6} marginBottom={24}>
              <StyledText fontSize={12} fontWeight="700" color={Colors.textMuted} letterSpacing={0.5}>
                NOTES (OPTIONAL)
              </StyledText>
              <StyledTextInput
                variant="filled" placeholder="Topics covered, materials allowed…"
                value={notes} onChangeText={setNotes}
                fontSize={14} borderRadius={12}
                multiline numberOfLines={3}
              />
            </Stack>

            {/* Delete */}
            <StyledPressable
              alignItems="center" justifyContent="center"
              paddingVertical={14} borderRadius={14}
              backgroundColor={Colors.error + '14'}
              onPress={handleDelete}
            >
              <StyledText fontSize={15} fontWeight="700" color={Colors.error}>
                🗑️  Delete Exam
              </StyledText>
            </StyledPressable>

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
              <Stack horizontal alignItems="center" justifyContent="space-between"
                paddingHorizontal={20} paddingVertical={14}
                borderBottomWidth={1} borderBottomColor={Colors.border}>
                <StyledPressable onPress={() => setShowDate(false)}>
                  <StyledText fontSize={15} color={Colors.textMuted} fontWeight="600">Cancel</StyledText>
                </StyledPressable>
                <StyledText fontSize={16} fontWeight="800" color={Colors.textPrimary}>Exam date</StyledText>
                <StyledPressable onPress={() => setShowDate(false)}>
                  <StyledText fontSize={15} color={Colors.primary} fontWeight="700">Done</StyledText>
                </StyledPressable>
              </Stack>
              <Stack paddingHorizontal={16} paddingBottom={32}>
                <StyledDatePicker
                  mode="date" variant="inline" value={examDate}
                  onChange={setExamDate} showTodayButton
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

// ─── Subject picker ────────────────────────────────────────────────────────────
function SubjectPickerModal({ subjects, selected, onSelect, onClose }: {
  subjects: Subject[]
  selected: string | null
  onSelect: (id: string | null) => void
  onClose:  () => void
}) {
  const Colors = useColors()
  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <Stack flex={1} backgroundColor="rgba(0,0,0,0.5)" justifyContent="flex-end">
        <Stack backgroundColor={Colors.bgCard}
          borderTopLeftRadius={24} borderTopRightRadius={24} maxHeight="60%">
          <Stack horizontal alignItems="center" justifyContent="space-between"
            paddingHorizontal={20} paddingVertical={14}
            borderBottomWidth={1} borderBottomColor={Colors.border}>
            <StyledPressable onPress={onClose}>
              <StyledText fontSize={15} color={Colors.textMuted} fontWeight="600">Cancel</StyledText>
            </StyledPressable>
            <StyledText fontSize={16} fontWeight="800" color={Colors.textPrimary}>Select subject</StyledText>
            <Stack width={60} />
          </Stack>
          <ScrollView contentContainerStyle={{ paddingVertical: 8 }}>
            <StyledPressable
              horizontal alignItems="center" gap={14}
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
                horizontal alignItems="center" gap={14}
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
