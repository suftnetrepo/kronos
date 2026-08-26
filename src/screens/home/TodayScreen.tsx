import React, { useMemo } from 'react'
import { ScrollView } from 'react-native'
import { Stack, StyledPressable, StyledPage, StyledDivider } from 'fluent-styles'
import { useRouter } from 'expo-router'
import { Text, PremiumIcon } from '../../components'
import { useColors } from '../../constants'
import { useSubjects } from '../../hooks/useSubjects'
import { useTasks } from '../../hooks/useTasks'
import { useExams } from '../../hooks/useExams'
import { DAYS, type Day, type Subject } from '../../db/schema'
import { isSameLocalDay, getCalendarDateState } from '../../utils/dateState'

const toMinutes = (value: string) => { const [h, m] = value.split(':').map(Number); return h * 60 + m }
const greetingFor = (hour: number) => (hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening')
const formatTime = (date: Date) => date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

// ── Countdown formatting ────────────────────────────────────────────────────
// Human-readable label for a class that's still today (minutes-based, since
// this is the existing same-day `minsTo` value — no date math needed here).
const formatSameDayCountdown = (minutes: number): string => {
  if (minutes <= 0) return 'Now'
  if (minutes < 60) return `In ${minutes} min`
  if (minutes < 360) {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return mins === 0 ? `In ${hours}h` : `In ${hours}h ${mins}m`
  }
  return 'Today'
}

// Human-readable label for a class on a future day — reuses the existing
// getCalendarDateState util rather than duplicating day-difference math.
const formatFutureCountdown = (target: Date, now: Date): string => {
  const state = getCalendarDateState(target, now)
  if (state.kind !== 'future') return 'Today'
  if (state.days === 1) return 'Tomorrow'
  if (state.days <= 6) return `In ${state.days} days`
  return target.toLocaleDateString(undefined, { weekday: 'long' })
}

// Earliest upcoming class across the rest of the week. Only consulted when
// nothing remains on today's schedule (`current`/`next` below are both
// null) — today's own current/next calculation is untouched. Walks each
// subject's active days the same way SubjectDetailScreen's own "next
// lesson" helper does, starting at tomorrow since today is already covered.
const nextOccurrenceAcrossWeek = (allSubjects: Subject[], now: Date): { subject: Subject; date: Date } | null => {
  const todayIndex = (now.getDay() + 6) % 7
  let best: { subject: Subject; date: Date } | null = null
  for (const subject of allSubjects) {
    const activeDays = subject.days.split(',').filter(Boolean) as Day[]
    if (!activeDays.length) continue
    const [h, m] = subject.startTime.split(':').map(Number)
    for (let offset = 1; offset <= 7; offset++) {
      const code = DAYS[(todayIndex + offset) % 7]
      if (!activeDays.includes(code)) continue
      const candidate = new Date(now)
      candidate.setDate(candidate.getDate() + offset)
      candidate.setHours(h || 0, m || 0, 0, 0)
      if (!best || candidate < best.date) best = { subject, date: candidate }
      break
    }
  }
  return best
}

type Props = {
  // When embedded inside the Home planning hub, the hub's own compact header
  // already covers the greeting/date — Today renders just its dashboard
  // content, without its own page wrapper or heading block.
  embedded?: boolean
  // Lets the hub switch straight to its Timetable pane instead of pushing the
  // standalone /timetable route, avoiding a second disconnected navigation.
  onViewTimetable?: () => void
}

export default function TodayScreen({ embedded = false, onViewTimetable }: Props = {}) {
  const C = useColors()
  const router = useRouter()
  const now = new Date()
  const todayCode = DAYS[(now.getDay() + 6) % 7] as Day

  // Same hooks every other screen uses — Today is a derived dashboard, not a
  // separate data source, and stays on the shared dataVersion invalidation
  // bus automatically (see useAppStore.dataVersion).
  const { data: classes } = useSubjects(todayCode)
  const { data: subjects } = useSubjects()
  const { active } = useTasks()
  const { upcoming } = useExams()

  const nowMinutes = now.getHours() * 60 + now.getMinutes()
  const sortedClasses = useMemo(() => [...classes].sort((a, b) => a.startTime.localeCompare(b.startTime)), [classes])
  const current = useMemo(() => sortedClasses.find(s => toMinutes(s.startTime) <= nowMinutes && toMinutes(s.endTime) > nowMinutes), [sortedClasses, nowMinutes])
  const next = useMemo(() => sortedClasses.find(s => toMinutes(s.startTime) > nowMinutes), [sortedClasses, nowMinutes])
  const heroClass = current ?? next
  const minsTo = next && !current ? Math.max(0, toMinutes(next.startTime) - nowMinutes) : 0

  // Falls back to the next occurrence on a later day only when today's
  // schedule is exhausted — the same-day current/next logic above is
  // unchanged, this just fills the gap it deliberately doesn't cover.
  const fallbackNext = useMemo(() => (heroClass ? null : nextOccurrenceAcrossWeek(subjects, now)), [heroClass, subjects, now])
  const displayClass = heroClass ?? fallbackNext?.subject ?? null
  const countdownLabel = current ? 'Now' : heroClass ? formatSameDayCountdown(minsTo) : fallbackNext ? formatFutureCountdown(fallbackNext.date, now) : ''

  const due = useMemo(() => active.filter(t => t.dueAt && isSameLocalDay(new Date(t.dueAt), now)), [active])
  const todayTasks = useMemo(() => active.filter(t => !t.dueAt || isSameLocalDay(new Date(t.dueAt), now)).slice(0, 4), [active])
  const subjectName = (id: string | null) => subjects.find(s => s.id === id)?.name ?? 'General'

  const nextExam = upcoming[0]
  const examState = nextExam ? getCalendarDateState(new Date(nextExam.date), now) : null

  const priorityColor = (p: string) => (p === 'high' ? C.error : p === 'medium' ? C.warning : C.success)

  const STATS: [string, number, any][] = [
    ['Classes', classes.length, 'book'],
    ['Tasks', todayTasks.length, 'tasks'],
    ['Due today', due.length, 'clock'],
  ]
  const STAT_TINTS = [C.primary, C.info, C.warning]

  const goTimetable = () => (onViewTimetable ? onViewTimetable() : router.push('/timetable' as any))

  const content = (
    <>
      {/* ── Root header — omitted when embedded; Home's header covers it ── */}
      {!embedded ? (
        <Stack marginBottom={20}>
          <Text variant="body" color={C.textSecondary}>{greetingFor(now.getHours())}</Text>
          <Text variant="display" fontSize={30} lineHeight={37} color={C.textPrimary}>Today</Text>
          <Text variant="bodySmall" color={C.textMuted} marginTop={2}>
            {now.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })}
          </Text>
        </Stack>
      ) : null}

      {/* ── Next class hero ────────────────────────────────────────────── */}
      {displayClass ? (
        <StyledPressable onPress={() => router.push({ pathname: '/subject/[id]', params: { id: displayClass.id } } as any)}>
          <Stack flexDirection="row" alignItems="center" padding={16} borderRadius={20} backgroundColor={C.bgCard} borderWidth={1} borderColor={C.border} marginBottom={14}>
            <Stack width={56} height={56} borderRadius={16} alignItems="center" justifyContent="center" backgroundColor={C.primary + '12'}>
              <PremiumIcon name="book" size={23} color={C.primary} />
            </Stack>
            <Stack flex={1} marginLeft={13} marginRight={8}>
              <Text variant="label" fontWeight="700" color={C.primary}>{current ? 'In class now' : 'Next class'}</Text>
              <Text variant="title" fontSize={19} color={C.textPrimary} marginTop={3} numberOfLines={1}>{displayClass.name}</Text>
              <Stack flexDirection="row" alignItems="center" marginTop={5}>
                <PremiumIcon name="clock" size={11} color={C.textSecondary} />
                <Text variant="caption" color={C.textSecondary} marginLeft={4} numberOfLines={1}>{displayClass.startTime} – {displayClass.endTime}</Text>
                {displayClass.room ? (
                  <>
                    <Stack width={3} height={3} borderRadius={2} backgroundColor={C.textMuted} marginHorizontal={6} />
                    <Text variant="caption" color={C.textSecondary} numberOfLines={1}>Room {displayClass.room}</Text>
                  </>
                ) : null}
              </Stack>
            </Stack>
            <Stack paddingHorizontal={10} paddingVertical={5} borderRadius={20} backgroundColor={C.primary + '12'}>
              <Text fontSize={11} fontWeight="700" color={C.primary}>{countdownLabel}</Text>
            </Stack>
            <Stack marginLeft={6}>
              <PremiumIcon name="chevron" size={15} color={C.textMuted} />
            </Stack>
          </Stack>
        </StyledPressable>
      ) : (
        <Stack padding={18} borderRadius={22} backgroundColor={C.bgCard} borderWidth={1} borderColor={C.border} marginBottom={14}>
          <Text variant="overline" color={C.primary}>YOUR DAY</Text>
          <Text variant="subtitle" color={C.textPrimary} marginTop={5}>{classes.length ? 'Classes complete' : 'No classes today'}</Text>
          <Text variant="caption" color={C.textSecondary} marginTop={2}>
            {classes.length ? 'Use the rest of the day to get ahead.' : 'Your timetable is clear today.'}
          </Text>
        </Stack>
      )}

      {/* ── Daily summary — compact, distinct icon tints per stat ───────── */}
      <Stack flexDirection="row" gap={8} marginBottom={22}>
        {STATS.map(([label, value, icon], i) => (
          <Stack key={label} flex={1} paddingVertical={14} paddingHorizontal={8} borderRadius={16} backgroundColor={C.bgCard} borderWidth={1} borderColor={C.border} alignItems="center">
            <Stack width={30} height={30} borderRadius={10} alignItems="center" justifyContent="center" backgroundColor={STAT_TINTS[i] + '14'} marginBottom={7}>
              <PremiumIcon name={icon} size={15} color={STAT_TINTS[i]} />
            </Stack>
            <Text fontSize={17} fontWeight="800" color={C.textPrimary}>{value}</Text>
            <Text fontSize={10} fontWeight="600" color={C.textMuted} marginTop={1}>{label}</Text>
          </Stack>
        ))}
      </Stack>

      {/* ── Today's schedule — one cohesive agenda, not separate cards ──── */}
      <Stack flexDirection="row" justifyContent="space-between" alignItems="center" marginBottom={10}>
        <Text variant="subtitle" fontSize={16} color={C.textPrimary}>Today's schedule</Text>
        <StyledPressable hitSlop={8} onPress={goTimetable}>
          <Text variant="caption" fontWeight="700" color={C.primary}>View timetable</Text>
        </StyledPressable>
      </Stack>
      {classes.length ? (
        <Stack borderRadius={18} backgroundColor={C.bgCard} borderWidth={1} borderColor={C.border} overflow="hidden" marginBottom={22}>
          {sortedClasses.slice(0, 4).map((s, i) => (
            <Stack key={s.id}>
              <StyledPressable onPress={() => router.push({ pathname: '/subject/[id]', params: { id: s.id } } as any)}>
                <Stack flexDirection="row" alignItems="center" paddingHorizontal={14} paddingVertical={12}>
                  <Text variant="caption" fontWeight="700" color={C.textSecondary} width={44}>{s.startTime}</Text>
                  <Stack width={7} height={7} borderRadius={4} backgroundColor={s.color} marginRight={11} />
                  <Stack flex={1} marginRight={8}>
                    <Text variant="label" color={C.textPrimary} numberOfLines={1}>{s.name}</Text>
                    <Text variant="caption" color={C.textSecondary} numberOfLines={1}>
                      {s.room ? `Room ${s.room} · ` : ''}{s.startTime} – {s.endTime}
                    </Text>
                  </Stack>
                  <PremiumIcon name="chevron" size={15} color={C.textMuted} />
                </Stack>
              </StyledPressable>
              {i < Math.min(sortedClasses.length, 4) - 1 ? <StyledDivider borderBottomColor={C.border} marginLeft={62} /> : null}
            </Stack>
          ))}
        </Stack>
      ) : (
        <Stack paddingVertical={14} marginBottom={22}>
          <Text variant="bodySmall" color={C.textMuted}>Nothing scheduled today.</Text>
        </Stack>
      )}

      {/* ── Things to do ──────────────────────────────────────────────── */}
      <Stack flexDirection="row" justifyContent="space-between" alignItems="center" marginBottom={10}>
        <Text variant="subtitle" fontSize={16} color={C.textPrimary}>Things to do</Text>
        <StyledPressable hitSlop={8} onPress={() => router.push('/(tabs)/tasks' as any)}>
          <Text variant="caption" fontWeight="700" color={C.primary}>See all</Text>
        </StyledPressable>
      </Stack>
      {todayTasks.length ? (
        <Stack borderRadius={18} backgroundColor={C.bgCard} borderWidth={1} borderColor={C.border} overflow="hidden" marginBottom={22}>
          {todayTasks.map((t, i) => (
            <Stack key={t.id}>
              <StyledPressable onPress={() => router.push({ pathname: '/task/[id]', params: { id: t.id } } as any)}>
                <Stack flexDirection="row" alignItems="center" paddingHorizontal={14} paddingVertical={12}>
                  <Stack width={20} height={20} borderRadius={10} borderWidth={2} borderColor={C.primary} marginRight={11} />
                  <Stack flex={1} marginRight={8}>
                    <Text variant="label" color={C.textPrimary} numberOfLines={1}>{t.title}</Text>
                    <Text variant="caption" color={C.textSecondary} numberOfLines={1}>
                      {t.dueAt ? `Due ${formatTime(new Date(t.dueAt))}` : 'Anytime'} · {subjectName(t.subjectId)}
                    </Text>
                  </Stack>
                  {t.priority !== 'normal' ? (
                    <Stack paddingHorizontal={8} paddingVertical={4} borderRadius={20} backgroundColor={priorityColor(t.priority) + '16'}>
                      <Text fontSize={9} fontWeight="800" color={priorityColor(t.priority)}>{t.priority.toUpperCase()}</Text>
                    </Stack>
                  ) : (
                    <PremiumIcon name="chevron" size={15} color={C.textMuted} />
                  )}
                </Stack>
              </StyledPressable>
              {i < todayTasks.length - 1 ? <StyledDivider borderBottomColor={C.border} marginLeft={45} /> : null}
            </Stack>
          ))}
        </Stack>
      ) : (
        <Stack flexDirection="row" alignItems="center" padding={14} borderRadius={16} backgroundColor={C.bgCard} borderWidth={1} borderColor={C.border} marginBottom={22}>
          <Stack width={34} height={34} borderRadius={12} backgroundColor={C.success + '12'} alignItems="center" justifyContent="center">
            <PremiumIcon name="check" size={17} color={C.success} />
          </Stack>
          <Stack marginLeft={11}>
            <Text variant="label" color={C.textPrimary}>You're clear for now</Text>
            <Text variant="caption" color={C.textSecondary}>Tap + when something comes up.</Text>
          </Stack>
        </Stack>
      )}

      {/* ── Upcoming exam ─────────────────────────────────────────────── */}
      {nextExam ? (
        <Stack>
          <Stack flexDirection="row" justifyContent="space-between" alignItems="center" marginBottom={10}>
            <Text variant="subtitle" fontSize={16} color={C.textPrimary}>Upcoming exam</Text>
            <StyledPressable hitSlop={8} onPress={() => router.push('/(tabs)/exams' as any)}>
              <Text variant="caption" fontWeight="700" color={C.primary}>View all</Text>
            </StyledPressable>
          </Stack>
          <StyledPressable onPress={() => router.push({ pathname: '/exam/[id]', params: { id: nextExam.id } } as any)}>
            <Stack flexDirection="row" alignItems="center" padding={14} borderRadius={16} backgroundColor={C.bgCard} borderWidth={1} borderColor={C.border}>
              <Stack width={40} height={40} borderRadius={13} backgroundColor={C.primary + '12'} alignItems="center" justifyContent="center">
                <PremiumIcon name="exam" size={19} color={C.primary} />
              </Stack>
              <Stack flex={1} marginLeft={12} marginRight={8}>
                <Text variant="label" color={C.textPrimary} numberOfLines={1}>{nextExam.title}</Text>
                <Text variant="caption" color={C.textSecondary} numberOfLines={1}>
                  {new Date(nextExam.date).toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })} · {formatTime(new Date(nextExam.date))}
                </Text>
              </Stack>
              {examState && examState.kind === 'future' ? (
                <Stack alignItems="center">
                  <Text fontSize={18} fontWeight="800" color={C.primary}>{examState.days}</Text>
                  <Text fontSize={8} fontWeight="700" color={C.textMuted}>DAYS</Text>
                </Stack>
              ) : examState && examState.kind === 'today' ? (
                <Text fontSize={11} fontWeight="800" color={C.primary}>TODAY</Text>
              ) : null}
            </Stack>
          </StyledPressable>
        </Stack>
      ) : null}
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
      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 20, paddingBottom: 140 }} showsVerticalScrollIndicator={false}>
        {content}
      </ScrollView>
    </StyledPage>
  )
}
