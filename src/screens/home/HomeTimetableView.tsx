import React, { useEffect, useRef, useState } from 'react'
import { ScrollView } from 'react-native'
import { Stack, StyledPressable, dialogueService, toastService } from 'fluent-styles'
import { router } from 'expo-router'
import { Text, PremiumIcon } from '../../components'
import { useColors } from '../../constants'
import { useSubjects } from '../../hooks/useSubjects'
import { useAppStore } from '../../stores'
import { DAYS, DAY_LABELS, DAY_FULL, type Day, type Subject } from '../../db/schema'
import { SubjectCard } from './HomeScreen'

// The embedded "Timetable" pane of the Home planning hub. This intentionally
// reuses the *original* day-by-day timetable data model (useAppStore's
// selectedDay + useSubjects(day), the same pairing the pre-V2 Home screen
// used) rather than the Day/Week grid in TimetableV2Screen — see the Home
// revamp requirement. Only the presentation is new; the day selection,
// subject data, and delete behaviour are the same hooks/services used
// elsewhere in the app (and by the standalone /timetable route's Day mode).
export default function HomeTimetableView() {
  const C = useColors()
  const { selectedDay, setSelectedDay } = useAppStore()
  const day = (selectedDay as Day) ?? 'MON'
  const { data: classes, remove } = useSubjects(day)
  const [openSwipeId, setOpenSwipeId] = useState<string | null>(null)
  const chipScrollRef = useRef<ScrollView>(null)

  const todayCode = DAYS[(new Date().getDay() + 6) % 7]
  const sorted = [...classes].sort((a, b) => a.startTime.localeCompare(b.startTime))

  useEffect(() => {
    const index = DAYS.indexOf(day)
    if (index >= 0 && chipScrollRef.current) {
      chipScrollRef.current.scrollTo({ x: Math.max(0, index * 68 - 60), animated: true })
    }
  }, [day])

  const handleDelete = async (subject: Subject) => {
    const ok = await dialogueService.confirm({
      title: 'Delete subject?',
      message: 'This will remove it from your timetable.',
      icon: '🗑️',
      confirmLabel: 'Delete',
      destructive: true,
    })
    if (!ok) return
    setOpenSwipeId(null)
    await remove(subject.id)
    toastService.success('Subject deleted')
  }

  return (
    <ScrollView contentContainerStyle={{ paddingTop: 4, paddingBottom: 140 }} showsVerticalScrollIndicator={false}>
      <ScrollView
        ref={chipScrollRef} horizontal showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 20, gap: 8, paddingBottom: 4 }}
      >
        {DAYS.map(d => {
          const active = d === day
          return (
            <StyledPressable
              key={d} minWidth={48} alignItems="center" paddingVertical={10} paddingHorizontal={14}
              borderRadius={13} backgroundColor={active ? C.primary : C.bgCard}
              borderWidth={1} borderColor={active ? C.primary : C.border}
              onPress={() => setSelectedDay(d as any)}
            >
              <Text variant="caption" fontWeight="700" color={active ? C.white : d === todayCode ? C.primary : C.textSecondary}>
                {DAY_LABELS[d]}
              </Text>
            </StyledPressable>
          )
        })}
      </ScrollView>

      <Stack paddingHorizontal={20} marginTop={16}>
        {sorted.length ? sorted.map(s => (
          <SubjectCard
            key={s.id}
            subject={s}
            onEdit={subject => router.push({ pathname: '/subject/[id]', params: { id: subject.id } } as any)}
            onDelete={handleDelete}
            openSwipeId={openSwipeId}
            onSwipeOpen={setOpenSwipeId}
          />
        )) : (
          <Stack paddingVertical={34} paddingHorizontal={24} backgroundColor={C.bgCard} borderRadius={18} borderWidth={1} borderColor={C.border} alignItems="center">
            <Stack width={46} height={46} borderRadius={16} backgroundColor={C.primary + '10'} alignItems="center" justifyContent="center" marginBottom={12}>
              <PremiumIcon name="calendar" size={21} color={C.primary} />
            </Stack>
            <Text variant="subtitle" color={C.textPrimary}>No classes on {DAY_FULL[day]}s</Text>
            <Text variant="bodySmall" textAlign="center" color={C.textMuted} marginTop={4}>Add one from Quick Add.</Text>
          </Stack>
        )}
      </Stack>
    </ScrollView>
  )
}
