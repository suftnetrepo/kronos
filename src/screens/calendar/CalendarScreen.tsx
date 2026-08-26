import React, { useMemo, useState } from 'react'
import { ScrollView } from 'react-native'
import { Stack, StyledPressable, StyledPage } from 'fluent-styles'
import { router } from 'expo-router'
import { addMonths, subMonths, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isSameDay, format } from 'date-fns'
import { Text, PremiumIcon, ScreenHeader } from '../../components'
import { useColors } from '../../constants'
import { useSubjects } from '../../hooks/useSubjects'
import { useTasks } from '../../hooks/useTasks'
import { useExams } from '../../hooks/useExams'

const DAY = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']

type Props = {
  // When embedded inside the Home planning hub, the hub's own header +
  // Today/Timetable/Calendar selector already provide the navigation
  // context — Calendar renders just its month grid + agenda, no second
  // back-button header, no second page wrapper.
  embedded?: boolean
}

export default function CalendarScreen({ embedded = false }: Props = {}) {
  const C = useColors()
  const { data: subjects } = useSubjects()
  const { data: tasks } = useTasks()
  const { data: exams } = useExams()
  const [month, setMonth] = useState(new Date())
  const [selected, setSelected] = useState(new Date())

  const days = useMemo(
    () => eachDayOfInterval({ start: startOfWeek(startOfMonth(month)), end: endOfWeek(endOfMonth(month)) }),
    [month],
  )
  const agenda = useMemo(() => {
    const code = DAY[selected.getDay()]
    return {
      classes: subjects.filter(s => s.days.split(',').includes(code)),
      tasks: tasks.filter(t => t.dueAt && isSameDay(new Date(t.dueAt), selected)),
      exams: exams.filter(e => isSameDay(new Date(e.date), selected)),
    }
  }, [selected, subjects, tasks, exams])
  const has = (d: Date) =>
    subjects.some(s => s.days.split(',').includes(DAY[d.getDay()])) ||
    tasks.some(t => t.dueAt && isSameDay(new Date(t.dueAt), d)) ||
    exams.some(e => isSameDay(new Date(e.date), d))

  const content = (
    <>
      {!embedded ? (
        <Stack marginTop={10}>
          <ScreenHeader onBack={() => router.back()} title="Academic Calendar" centered />
        </Stack>
      ) : null}

      <Stack flexDirection="row" alignItems="center" justifyContent="space-between" marginTop={embedded ? 4 : 26} marginBottom={16}>
        <StyledPressable onPress={() => setMonth(subMonths(month, 1))} hitSlop={8}>
          <Text fontSize={26} color={C.textSecondary}>‹</Text>
        </StyledPressable>
        <Text variant="title" color={C.textPrimary}>{format(month, 'MMMM yyyy')}</Text>
        <StyledPressable onPress={() => setMonth(addMonths(month, 1))} hitSlop={8}>
          <PremiumIcon name="chevron" size={18} color={C.textSecondary} />
        </StyledPressable>
      </Stack>

      <Stack flexDirection="row" marginBottom={8}>
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((x, i) => (
          <Stack key={i} width="14.285%" alignItems="center"><Text fontSize={9} fontWeight="700" color={C.textMuted}>{x}</Text></Stack>
        ))}
      </Stack>

      <Stack flexDirection="row" flexWrap="wrap" padding={8} borderRadius={22} backgroundColor={C.bgCard} borderWidth={1} borderColor={C.border}>
        {days.map(d => {
          const sel = isSameDay(d, selected)
          return (
            <StyledPressable key={d.toISOString()} width="14.285%" height={48} alignItems="center" justifyContent="center" opacity={isSameMonth(d, month) ? 1 : 0.28} onPress={() => setSelected(d)}>
              <Stack width={34} height={34} borderRadius={17} alignItems="center" justifyContent="center" backgroundColor={sel ? C.primary : 'transparent'}>
                <Text variant="label" color={sel ? C.white : C.textPrimary}>{format(d, 'd')}</Text>
              </Stack>
              {has(d) ? <Stack width={4} height={4} borderRadius={2} backgroundColor={sel ? C.white : C.primary} marginTop={-3} /> : null}
            </StyledPressable>
          )
        })}
      </Stack>

      <Stack flexDirection="row" gap={16} marginTop={14}>
        {([['Classes', C.info], ['Tasks', C.warning], ['Exams', C.error]] as const).map(([l, c]) => (
          <Stack key={l} flexDirection="row" alignItems="center">
            <Stack width={7} height={7} borderRadius={4} backgroundColor={c} marginRight={5} />
            <Text variant="caption" color={C.textSecondary}>{l}</Text>
          </Stack>
        ))}
      </Stack>

      <Text variant="title" color={C.textPrimary} marginTop={28}>
        {isSameDay(selected, new Date()) ? 'Today' : format(selected, 'EEE, d MMM')}
      </Text>
      <Stack marginTop={12} gap={8}>
        {agenda.classes.map(s => (
          <StyledPressable key={'c' + s.id} onPress={() => router.push({ pathname: '/subject/[id]', params: { id: s.id } } as any)}>
            <Stack padding={14} borderRadius={16} backgroundColor={C.bgCard} borderWidth={1} borderColor={C.border} flexDirection="row">
              <Stack width={5} borderRadius={3} backgroundColor={s.color} />
              <Stack marginLeft={10}>
                <Text variant="label" color={C.textPrimary}>{s.name}</Text>
                <Text variant="caption" color={C.textSecondary}>{s.startTime} – {s.endTime}</Text>
              </Stack>
            </Stack>
          </StyledPressable>
        ))}
        {agenda.tasks.map(t => (
          <StyledPressable key={'t' + t.id} onPress={() => router.push({ pathname: '/task/[id]', params: { id: t.id } } as any)}>
            <Stack padding={14} borderRadius={16} backgroundColor={C.bgCard} borderWidth={1} borderColor={C.border}>
              <Text variant="label" color={C.textPrimary}>{t.title}</Text>
              <Text variant="caption" color={C.textSecondary}>{t.type[0].toUpperCase() + t.type.slice(1)}{t.isCompleted ? ' · Completed' : ''}</Text>
            </Stack>
          </StyledPressable>
        ))}
        {agenda.exams.map(e => (
          <StyledPressable key={'e' + e.id} onPress={() => router.push({ pathname: '/exam/[id]', params: { id: e.id } } as any)}>
            <Stack padding={14} borderRadius={16} backgroundColor={C.bgCard} borderWidth={1} borderColor={C.border}>
              <Text variant="label" color={C.textPrimary}>{e.title}</Text>
              <Text variant="caption" color={C.textSecondary}>Exam</Text>
            </Stack>
          </StyledPressable>
        ))}
        {!agenda.classes.length && !agenda.tasks.length && !agenda.exams.length ? (
          <Text variant="bodySmall" color={C.textMuted}>Nothing scheduled for this day.</Text>
        ) : null}
      </Stack>
    </>
  )

  if (embedded) {
    return (
      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 4, paddingBottom: 140 }} showsVerticalScrollIndicator={false}>
        {content}
      </ScrollView>
    )
  }

  return (
    <StyledPage flex={1} backgroundColor={C.bg}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 90 }} showsVerticalScrollIndicator={false}>
        {content}
      </ScrollView>
    </StyledPage>
  )
}
