import React, { useMemo, useRef, useState } from 'react'
import { ScrollView, useWindowDimensions } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Stack, StyledPressable, StyledPage } from 'fluent-styles'
import { useRouter } from 'expo-router'
import { Text, PremiumIcon, ScreenHeader } from '../../components'
import { useColors } from '../../constants'
import { useSubjects } from '../../hooks/useSubjects'
import { DAYS, DAY_LABELS, type Day, type Subject } from '../../db/schema'
import { layoutDayEvents, minutesToOffset, parseTime, subjectOccursOnDay } from '../../utils/timetableLayout'

const START_HOUR = 7
const END_HOUR = 21
const HOUR_HEIGHT = 76
const TIME_COLUMN_WIDTH = 52
const GRID_PADDING = 16
const WEEK_DAYS = DAYS.slice(0, 5)

function mondayFor(date: Date) {
  const value = new Date(date)
  value.setHours(0, 0, 0, 0)
  const jsDay = value.getDay()
  const diff = jsDay === 0 ? -6 : 1 - jsDay
  value.setDate(value.getDate() + diff)
  return value
}

function addDays(date: Date, amount: number) {
  const value = new Date(date)
  value.setDate(value.getDate() + amount)
  return value
}

function dayCode(date: Date): Day {
  return DAYS[(date.getDay() + 6) % 7]
}

function formatRange(start: Date, end: Date) {
  const sameMonth = start.getMonth() === end.getMonth()
  if (sameMonth) return `${start.getDate()}–${end.getDate()} ${end.toLocaleDateString(undefined, { month: 'short' })}`
  return `${start.getDate()} ${start.toLocaleDateString(undefined, { month: 'short' })} – ${end.getDate()} ${end.toLocaleDateString(undefined, { month: 'short' })}`
}

function formatTime(value: string) {
  const parsed = parseTime(value)
  if (parsed == null) return value
  const hour = Math.floor(parsed / 60)
  const minute = parsed % 60
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
}

export default function TimetableV2Screen() {
  const C = useColors()
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const { width } = useWindowDimensions()
  const { data = [] } = useSubjects()
  const now = new Date()
  const todayCode = dayCode(now)
  const [mode, setMode] = useState<'day' | 'week'>('week')
  const [weekOffset, setWeekOffset] = useState(0)
  const [selectedDay, setSelectedDay] = useState<Day>(todayCode)
  const scrollRef = useRef<ScrollView>(null)

  const weekMonday = useMemo(() => addDays(mondayFor(now), weekOffset * 7), [weekOffset])
  const weekDates = useMemo(() => WEEK_DAYS.map((_, index) => addDays(weekMonday, index)), [weekMonday])
  const gridWidth = Math.max(width - TIME_COLUMN_WIDTH - GRID_PADDING * 2, 300)
  const dayWidth = gridWidth / WEEK_DAYS.length
  const totalHeight = (END_HOUR - START_HOUR) * HOUR_HEIGHT

  const byDay = useMemo(() => {
    const result = new Map<Day, ReturnType<typeof layoutDayEvents>>()
    DAYS.forEach(day => result.set(day, layoutDayEvents(data.filter(subject => subjectOccursOnDay(subject, day)))))
    return result
  }, [data])

  const selectedEvents = byDay.get(selectedDay) ?? []
  const currentMinutes = now.getHours() * 60 + now.getMinutes()
  const currentTimeVisible = currentMinutes >= START_HOUR * 60 && currentMinutes <= END_HOUR * 60
  const currentTop = minutesToOffset(currentMinutes, START_HOUR, HOUR_HEIGHT)
  const currentWeekIsThisWeek = weekOffset === 0

  const openSubject = (subject: Subject) => {
    router.push({ pathname: '/subject/[id]', params: { id: subject.id } } as any)
  }

  // Week mode is an occupancy map, not a readable schedule: the block's time
  // column + vertical position + height already say when something happens,
  // so the block itself only needs a tiny, deterministic subject identifier.
  // Same subject name + same available width always yields the same label.
  const weekAbbreviation = (name: string, boxWidth: number) => {
    const upper = name.trim().toUpperCase()
    if (boxWidth < 26) return upper.slice(0, 1)
    if (boxWidth < 42) return upper.slice(0, 2)
    if (boxWidth < 58) return upper.slice(0, 3)
    return upper.slice(0, 4)
  }

  // Day mode has room to be a real schedule: subject, time range, and
  // teacher/room when the block is tall enough to hold them cleanly.
  const renderEvent = (subject: Subject, top: number, height: number, left: number, eventWidth: number, compact = true) => {
    const boxWidth = Math.max(eventWidth - 4, compact ? 22 : 28)
    const boxHeight = Math.max(height - 4, compact ? 24 : 42)

    if (compact) {
      return (
        <StyledPressable
          key={`${subject.id}-${left}-${top}`}
          position="absolute"
          top={top + 2}
          left={left + 2}
          width={boxWidth}
          height={boxHeight}
          borderRadius={7}
          backgroundColor={subject.color}
          alignItems="center"
          justifyContent="center"
          paddingHorizontal={2}
          overflow="hidden"
          onPress={() => openSubject(subject)}
          accessibilityRole="button"
          accessibilityLabel={`${subject.name}, ${formatTime(subject.startTime)} to ${formatTime(subject.endTime)}${subject.room ? `, ${subject.room}` : ''}`}
        >
          <Text fontSize={boxWidth < 26 ? 9 : boxWidth < 42 ? 9.5 : 10.5} lineHeight={12} fontWeight="800" color="#FFFFFF" numberOfLines={1}>
            {weekAbbreviation(subject.name, boxWidth)}
          </Text>
        </StyledPressable>
      )
    }

    const timeLabel = `${formatTime(subject.startTime)}–${formatTime(subject.endTime)}`
    const meta = [subject.teacher, subject.room].filter(Boolean).join(' · ')
    const showMeta = !!meta && boxHeight >= 62

    return (
      <StyledPressable
        key={`${subject.id}-${left}-${top}`}
        position="absolute"
        top={top + 2}
        left={left + 2}
        width={boxWidth}
        height={boxHeight}
        borderRadius={12}
        backgroundColor={subject.color}
        paddingHorizontal={11}
        paddingVertical={9}
        overflow="hidden"
        onPress={() => openSubject(subject)}
        accessibilityRole="button"
        accessibilityLabel={`${subject.name}, ${formatTime(subject.startTime)} to ${formatTime(subject.endTime)}${subject.room ? `, ${subject.room}` : ''}`}
      >
        <Text fontSize={13.5} lineHeight={17} fontWeight="800" color="#FFFFFF" numberOfLines={1}>{subject.name}</Text>
        <Text fontSize={11} lineHeight={15} fontWeight="700" color="#FFFFFFD9" numberOfLines={1} marginTop={1}>{timeLabel}</Text>
        {showMeta ? <Text fontSize={11} lineHeight={15} fontWeight="500" color="#FFFFFFC2" numberOfLines={1} marginTop={2}>{meta}</Text> : null}
      </StyledPressable>
    )
  }

  const timeLabels = Array.from({ length: END_HOUR - START_HOUR + 1 }, (_, index) => START_HOUR + index)

  const Legend = () => !data.length ? null : (
    <Stack flexDirection="row" flexWrap="wrap" gap={14} marginTop={18} paddingHorizontal={2}>
      {data.map(subject => (
        <Stack key={subject.id} flexDirection="row" alignItems="center" gap={6}>
          <Stack width={7} height={7} borderRadius={4} backgroundColor={subject.color} />
          <Text variant="caption" fontWeight="600" color={C.textSecondary}>{subject.name}</Text>
        </Stack>
      ))}
    </Stack>
  )

  return (
    <StyledPage flex={1} backgroundColor={C.bg}>
      <Stack paddingHorizontal={20} paddingTop={20} paddingBottom={mode === 'week' ? 8 : 14}>
        <Stack marginTop={10}>
          <ScreenHeader onBack={() => router.back()} title="Timetable" centered />
        </Stack>

        <Stack flexDirection="row" height={44} marginTop={16} backgroundColor={C.bgCard} padding={3} borderRadius={13} borderWidth={1} borderColor={C.border}>
          {(['day', 'week'] as const).map(value => (
            <StyledPressable key={value} flex={1} alignItems="center" justifyContent="center" borderRadius={10} backgroundColor={mode === value ? C.primary : 'transparent'} onPress={() => setMode(value)}>
              <Text variant="label" color={mode === value ? C.white : C.textSecondary}>{value[0].toUpperCase() + value.slice(1)}</Text>
            </StyledPressable>
          ))}
        </Stack>

        {mode === 'week' ? (
          <Stack flexDirection="row" alignItems="center" justifyContent="space-between" marginTop={8}>
            <StyledPressable width={36} height={36} alignItems="center" justifyContent="center" onPress={() => setWeekOffset(value => value - 1)} accessibilityRole="button" accessibilityLabel="Previous week">
              <Text fontSize={18} fontWeight="600" color={C.textMuted}>‹</Text>
            </StyledPressable>
            <StyledPressable paddingHorizontal={8} paddingVertical={2} onPress={() => setWeekOffset(0)}>
              <Text variant="subLabel" fontWeight="700" color={weekOffset === 0 ? C.primary : C.textSecondary}>{formatRange(weekDates[0], weekDates[4])}</Text>
            </StyledPressable>
            <StyledPressable width={36} height={36} alignItems="center" justifyContent="center" onPress={() => setWeekOffset(value => value + 1)} accessibilityRole="button" accessibilityLabel="Next week">
              <Text fontSize={18} fontWeight="600" color={C.textMuted}>›</Text>
            </StyledPressable>
          </Stack>
        ) : null}
      </Stack>

      {mode === 'week' ? (
        <ScrollView ref={scrollRef} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
          <Stack marginHorizontal={GRID_PADDING} width={gridWidth + TIME_COLUMN_WIDTH}>
            <Stack marginLeft={TIME_COLUMN_WIDTH} flexDirection="row" height={54} borderBottomWidth={1} borderColor={C.border}>
              {weekDates.map((date, index) => {
                const code = WEEK_DAYS[index]
                const isToday = currentWeekIsThisWeek && code === todayCode
                return (
                  <StyledPressable key={code} width={dayWidth} alignItems="center" justifyContent="center" onPress={() => { setSelectedDay(code); setMode('day') }}>
                    <Text fontSize={11} fontWeight="600" color={C.textMuted}>{DAY_LABELS[code]}</Text>
                    <Stack marginTop={3} minWidth={26} height={26} borderRadius={13} alignItems="center" justifyContent="center" backgroundColor={isToday ? C.primary : 'transparent'}>
                      <Text variant="label" fontWeight="800" color={isToday ? C.white : C.textPrimary}>{date.getDate()}</Text>
                    </Stack>
                  </StyledPressable>
                )
              })}
            </Stack>

            <Stack flexDirection="row">
              <Stack width={TIME_COLUMN_WIDTH}>
                {timeLabels.slice(0, -1).map(hour => (
                  <Stack key={hour} height={HOUR_HEIGHT}>
                    <Text fontSize={10} fontWeight="500" color={C.textMuted} marginTop={-6}>{String(hour).padStart(2, '0')}:00</Text>
                  </Stack>
                ))}
              </Stack>

              <Stack width={gridWidth} height={totalHeight} borderTopWidth={1} borderLeftWidth={1} borderColor={C.border} backgroundColor={C.bgCard} borderRadius={14} overflow="hidden">
                {timeLabels.map((_, index) => <Stack key={`h-${index}`} position="absolute" top={index * HOUR_HEIGHT} left={0} right={0} height={1} backgroundColor={C.border} />)}
                {WEEK_DAYS.map((_, index) => <Stack key={`v-${index}`} position="absolute" left={index * dayWidth} top={0} bottom={0} width={1} backgroundColor={index === 0 ? 'transparent' : C.border} />)}
                <Stack position="absolute" right={0} top={0} bottom={0} width={1} backgroundColor={C.border} />

                {WEEK_DAYS.flatMap((day, dayIndex) => (byDay.get(day) ?? []).map(event => {
                  const top = minutesToOffset(event.startMinutes, START_HOUR, HOUR_HEIGHT)
                  const height = ((event.endMinutes - event.startMinutes) / 60) * HOUR_HEIGHT
                  const innerWidth = dayWidth / event.columnCount
                  const left = dayIndex * dayWidth + event.column * innerWidth
                  return renderEvent(event.subject, top, height, left, innerWidth, true)
                }))}

                {currentWeekIsThisWeek && currentTimeVisible ? (
                  <Stack position="absolute" top={currentTop - 1} left={0} right={0} height={2} backgroundColor={C.error} zIndex={50} pointerEvents="none">
                    <Stack position="absolute" left={-4} top={-4} width={10} height={10} borderRadius={5} backgroundColor={C.error} />
                  </Stack>
                ) : null}
              </Stack>
            </Stack>

            <Legend />
          </Stack>
        </ScrollView>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: GRID_PADDING, paddingBottom: 100 }}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 4, paddingHorizontal: 2 }}>
            {DAYS.map(day => (
              <StyledPressable key={day} minWidth={48} alignItems="center" paddingVertical={9} paddingHorizontal={12} borderRadius={12} backgroundColor={day === selectedDay ? C.primary : C.bgCard} borderWidth={1} borderColor={day === selectedDay ? C.primary : C.border} onPress={() => setSelectedDay(day)}>
                <Text variant="caption" fontWeight="700" color={day === selectedDay ? C.white : C.textSecondary}>{DAY_LABELS[day]}</Text>
              </StyledPressable>
            ))}
          </ScrollView>

          <Stack flexDirection="row" marginTop={16}>
            <Stack width={TIME_COLUMN_WIDTH}>
              {timeLabels.slice(0, -1).map(hour => (
                <Stack key={hour} height={HOUR_HEIGHT}>
                  <Text fontSize={10} fontWeight="500" color={C.textMuted} marginTop={-6}>{String(hour).padStart(2, '0')}:00</Text>
                </Stack>
              ))}
            </Stack>

            <Stack flex={1} height={totalHeight} borderTopWidth={1} borderColor={C.border} backgroundColor={C.bgCard} borderRadius={14} overflow="hidden">
              {timeLabels.map((_, index) => <Stack key={`day-h-${index}`} position="absolute" top={index * HOUR_HEIGHT} left={0} right={0} height={1} backgroundColor={C.border} />)}
              {selectedEvents.map(event => {
                const top = minutesToOffset(event.startMinutes, START_HOUR, HOUR_HEIGHT)
                const height = ((event.endMinutes - event.startMinutes) / 60) * HOUR_HEIGHT
                const canvasWidth = Math.max(width - GRID_PADDING * 2 - TIME_COLUMN_WIDTH, 220)
                const eventWidth = canvasWidth / event.columnCount
                const left = event.column * eventWidth
                return renderEvent(event.subject, top, height, left, eventWidth, false)
              })}
              {selectedDay === todayCode && currentTimeVisible ? (
                <Stack position="absolute" top={currentTop - 1} left={0} right={0} height={2} backgroundColor={C.error} zIndex={50} pointerEvents="none">
                  <Stack position="absolute" left={-4} top={-4} width={10} height={10} borderRadius={5} backgroundColor={C.error} />
                </Stack>
              ) : null}
              {!selectedEvents.length ? (
                <Stack position="absolute" top={90} left={18} right={18} padding={18} borderRadius={16} backgroundColor={C.bgCard} borderWidth={1} borderColor={C.border} alignItems="center">
                  <PremiumIcon name="calendar" size={24} color={C.textMuted} />
                  <Text variant="label" color={C.textPrimary} marginTop={8}>No classes scheduled</Text>
                  <Text variant="caption" color={C.textMuted} marginTop={2}>This day is clear.</Text>
                </Stack>
              ) : null}
            </Stack>
          </Stack>
        </ScrollView>
      )}

      <StyledPressable
        position="absolute" right={20} bottom={Math.max(insets.bottom, 16) + 10} width={54} height={54} borderRadius={27}
        alignItems="center" justifyContent="center" hitSlop={6}
        backgroundColor={C.primary}
        style={{ shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 6, shadowOffset: { width: 0, height: 3 }, elevation: 3 }}
        onPress={() => router.push('/add-subject' as any)}
        accessibilityRole="button" accessibilityLabel="Add class"
      >
        <PremiumIcon name="plus" size={22} color={C.white} strokeWidth={2.2} />
      </StyledPressable>
    </StyledPage>
  )
}
