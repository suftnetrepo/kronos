import React, { useCallback, useMemo, useState } from "react";
import { ScrollView } from "react-native";
import { Stack, StyledPressable, StyledPage, StyledText } from "fluent-styles";
import { router, useFocusEffect } from "expo-router";
import { Text, PremiumIcon, ScreenHeader } from "../../components";
import { useColors } from "../../constants";
import { subjectService } from "../../services/subjectService";
import { taskService } from "../../services/taskService";
import { examService } from "../../services/examService";
import type { Subject, Task, Exam, Day } from "../../db/schema";
import { DAYS, DAY_FULL } from "../../db/schema";
import { getCalendarDateState } from "../../utils/dateState";

const formatExamDate = (value: Date) =>
  new Date(value).toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });

// Next occurrence of this subject's class, walking forward from "now" through
// its active weekdays (offset 7 always matches today's weekday one week out,
// so this is guaranteed to resolve whenever the subject has any active day).
// Presentational only — does not touch the timetable/service layer.
function nextLessonDate(subject: Subject, now = new Date()): Date | null {
  const activeDays = subject.days.split(",").filter(Boolean) as Day[];
  if (!activeDays.length) return null;
  const todayIndex = (now.getDay() + 6) % 7;
  const [h, m] = subject.startTime.split(":").map(Number);
  for (let offset = 0; offset <= 7; offset++) {
    const code = DAYS[(todayIndex + offset) % 7];
    if (!activeDays.includes(code)) continue;
    const candidate = new Date(now);
    candidate.setDate(candidate.getDate() + offset);
    candidate.setHours(h || 0, m || 0, 0, 0);
    if (candidate <= now) continue;
    return candidate;
  }
  return null;
}

const relativeLabel = (date: Date, now = new Date()) => {
  const state = getCalendarDateState(date, now);
  if (state.kind === "today") return "Today";
  if (state.kind === "future")
    return state.days === 1 ? "Tomorrow" : `In ${state.days} days`;
  return null;
};

export default function SubjectDetailScreen({ id }: { id: string }) {
  const C = useColors();
  const [subject, setSubject] = useState<Subject | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);
  const load = useCallback(async () => {
    const s = await subjectService.getById(id);
    setSubject(s);
    setTasks(await taskService.getBySubject(id));
    setExams((await examService.getAll()).filter((e) => e.subjectId === id));
  }, [id]);
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );
  const openTasks = tasks.filter((t) => !t.isCompleted);
  const upcoming = exams
    .filter((e) => getCalendarDateState(new Date(e.date)).kind !== "past")
    .sort((a, b) => +new Date(a.date) - +new Date(b.date))[0];
  const days = useMemo(
    () => subject?.days.split(",").filter(Boolean) ?? [],
    [subject],
  );
  const nextLesson = useMemo(
    () => (subject ? nextLessonDate(subject) : null),
    [subject],
  );
  if (!subject) return <StyledPage flex={1} backgroundColor={C.bg} />;
  const metrics = [
    {
      value: String(days.length),
      label: "Classes",
      hint: "per week",
      icon: "calendar" as const,
      tint: subject.color,
    },
    {
      value: String(openTasks.length),
      label: "Tasks",
      hint: "open",
      icon: "tasks" as const,
      tint: C.info,
    },
    {
      value: upcoming ? "1" : "—",
      label: "Exam",
      hint: upcoming ? "upcoming" : "none",
      icon: "exam" as const,
      tint: C.primary,
    },
  ];
  const nextLessonRel = nextLesson ? relativeLabel(nextLesson) : null;
  return (
    <StyledPage
      showStatusBar
      statusBarStyle="dark-content"
      backgroundColor={C.bg}
    >
      <StyledPage.Header
        title={subject.name}
        titleAlignment="left"
        titleProps={{ fontSize: 22, fontWeight: "700", color: C.textPrimary }}
        showBackArrow
        shapeProps={{
          cycle: true,
          size: 48,
          borderRadius: 999,
          backgroundColor: C.bgCard,
          borderWidth: 1,
          borderColor: C.border,
        }}
        onBackPress={() => router.back()}
        marginHorizontal={16}
        rightIcon={
          <StyledPressable
            width={48}
            height={48}
            borderRadius={16}
            alignItems="center"
            justifyContent="center"
            onPress={() =>
              router.push({ pathname: "/edit-subject", params: { id } } as any)
            }
          >
            <StyledText fontSize={16}>Edit</StyledText>
          </StyledPressable>
        }
      />
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Next lesson — compact, real next occurrence, no decorative blob ─── */}
        <StyledPressable onPress={() => router.push("/timetable" as any)}>
          <Stack
            flexDirection="row"
            alignItems="center"
            marginTop={16}
            padding={16}
            borderRadius={20}
            backgroundColor={C.bgCard}
            borderWidth={1}
            borderColor={C.border}
          >
            <Stack
              width={60}
              height={60}
              borderRadius={17}
              alignItems="center"
              justifyContent="center"
              backgroundColor={subject.color + "12"}
            >
              <PremiumIcon name="book" size={24} color={subject.color} />
            </Stack>
            <Stack
              width={1}
              height={50}
              backgroundColor={C.border}
              marginHorizontal={14}
            />
            <Stack flex={1} marginRight={8}>
              {nextLesson ? (
                <>
                  <Text
                    variant="title"
                    fontSize={18}
                    color={C.textPrimary}
                    marginTop={3}
                    numberOfLines={1}
                  >
                    {nextLessonRel === "Today" || nextLessonRel === "Tomorrow"
                      ? nextLessonRel
                      : DAY_FULL[DAYS[(nextLesson.getDay() + 6) % 7]]}
                  </Text>
                  <Stack flexDirection="row" alignItems="center" marginTop={4}>
                    <PremiumIcon
                      name="clock"
                      size={11}
                      color={C.textSecondary}
                    />
                    <Text
                      variant="caption"
                      color={C.textSecondary}
                      marginLeft={4}
                    >
                      {subject.startTime} – {subject.endTime}
                    </Text>
                  </Stack>
                </>
              ) : (
                <Text variant="label" color={C.textSecondary} marginTop={4}>
                  No schedule set
                </Text>
              )}
            </Stack>
            {nextLessonRel ? (
              <Stack
                flexDirection="row"
                alignItems="center"
                alignSelf="flex-start"
                marginTop={7}
                paddingHorizontal={9}
                paddingVertical={4}
                borderRadius={20}
                backgroundColor={subject.color + "14"}
              >
                <PremiumIcon name="clock" size={10} color={subject.color} />
                <Text
                  fontSize={10}
                  fontWeight="700"
                  color={subject.color}
                  marginLeft={4}
                >
                  {nextLessonRel}
                </Text>
              </Stack>
            ) : null}
          </Stack>
        </StyledPressable>

        {/* ── Summary metrics ───────────────────────────────────────────────── */}
        <Stack flexDirection="row" gap={9} marginTop={12}>
          {metrics.map((m) => (
            <Stack
              key={m.label}
              flex={1}
              paddingHorizontal={8}
              paddingVertical={14}
              borderRadius={18}
              backgroundColor={C.bgCard}
              borderWidth={1}
              borderColor={C.border}
              alignItems="center"
            >
              <Stack
                width={30}
                height={30}
                borderRadius={10}
                alignItems="center"
                justifyContent="center"
                backgroundColor={m.tint + "14"}
                marginBottom={7}
              >
                <PremiumIcon name={m.icon} size={14} color={m.tint} />
              </Stack>
              <Text fontSize={19} fontWeight="800" color={C.textPrimary}>
                {m.value}
              </Text>
              <Text
                fontSize={11}
                fontWeight="700"
                color={C.textPrimary}
                marginTop={2}
              >
                {m.label}
              </Text>
              <Text
                fontSize={9}
                fontWeight="600"
                color={C.textMuted}
                marginTop={1}
              >
                {m.hint}
              </Text>
            </Stack>
          ))}
        </Stack>

        {/* ── Schedule — one cohesive card, divided rows ───────────────────────── */}
        <Stack
          flexDirection="row"
          justifyContent="space-between"
          alignItems="center"
          marginTop={16}
          marginHorizontal={8}
          marginBottom={10}
        >
          <Stack>
            <Text variant="body" color={C.textMuted}>
              Schedule
            </Text>
            <Text variant="caption" color={C.textMuted}>
              Your weekly class pattern
            </Text>
          </Stack>
          <StyledPressable onPress={() => router.push("/timetable" as any)}>
            <Text variant="label" color={C.primary}>
              Timetable
            </Text>
          </StyledPressable>
        </Stack>
        <Stack
          borderRadius={20}
          backgroundColor={C.bgCard}
          borderWidth={1}
          borderColor={C.border}
          overflow="hidden"
        >
          {days.map((d, index) => (
            <Stack
              key={d}
              flexDirection="row"
              alignItems="center"
              paddingHorizontal={14}
              paddingVertical={13}
              borderBottomWidth={index === days.length - 1 ? 0 : 1}
              borderColor={C.border}
            >
              <Stack flex={1}>
                <Text variant="label" color={C.textPrimary}>
                  {DAY_FULL[d as keyof typeof DAY_FULL]}
                </Text>
                <Text variant="caption" color={C.textSecondary} marginTop={1}>
                  {subject.startTime} – {subject.endTime}
                </Text>
              </Stack>
              {subject.room ? (
                <Stack
                  paddingHorizontal={9}
                  paddingVertical={5}
                  borderRadius={12}
                  backgroundColor={C.bgMuted}
                >
                  <Text fontSize={9} fontWeight="700" color={C.textSecondary}>
                    {subject.room}
                  </Text>
                </Stack>
              ) : null}
            </Stack>
          ))}
        </Stack>

        <Stack
          flexDirection="row"
          justifyContent="space-between"
          alignItems="center"
          marginTop={27}
          marginHorizontal={8}
          marginBottom={10}
        >
          <Stack>
            <Text variant="body" color={C.textMuted}>
              Tasks
            </Text>
            <Text variant="caption" color={C.textMuted}>
              {openTasks.length
                ? `${openTasks.length} still to do`
                : "Nothing outstanding"}
            </Text>
          </Stack>
          <StyledPressable
            onPress={() =>
              router.push({
                pathname: "/new-task",
                params: { subjectId: id },
              } as any)
            }
          >
            <Text variant="label" color={C.primary}>
              + Add task
            </Text>
          </StyledPressable>
        </Stack>
        {openTasks.length ? (
          <Stack
            borderRadius={20}
            backgroundColor={C.bgCard}
            borderWidth={1}
            borderColor={C.border}
            overflow="hidden"
          >
            {openTasks.slice(0, 4).map((t, index) => (
              <StyledPressable
                key={t.id}
                onPress={() =>
                  router.push({
                    pathname: "/task/[id]",
                    params: { id: t.id },
                  } as any)
                }
              >
                <Stack
                  flexDirection="row"
                  alignItems="center"
                  padding={14}
                  borderBottomWidth={
                    index === Math.min(openTasks.length, 4) - 1 ? 0 : 1
                  }
                  borderColor={C.border}
                >
                  <Stack
                    width={22}
                    height={22}
                    borderRadius={11}
                    borderWidth={2}
                    borderColor={subject.color}
                  />
                  <Stack marginLeft={11} flex={1}>
                    <Text variant="label" color={C.textPrimary}>
                      {t.title}
                    </Text>
                    <Text variant="caption" color={C.textSecondary}>
                      {t.type[0].toUpperCase() + t.type.slice(1)}
                      {t.dueAt
                        ? ` · ${new Date(t.dueAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}`
                        : ""}
                    </Text>
                  </Stack>
                  {t.priority !== "normal" ? (
                    <Text
                      fontSize={9}
                      fontWeight="800"
                      color={t.priority === "high" ? C.error : C.warning}
                    >
                      {t.priority.toUpperCase()}
                    </Text>
                  ) : null}
                </Stack>
              </StyledPressable>
            ))}
          </Stack>
        ) : (
          <Stack
            flexDirection="row"
            alignItems="center"
            padding={15}
            borderRadius={18}
            backgroundColor={C.bgCard}
            borderWidth={1}
            borderColor={C.border}
          >
            <Stack
              width={36}
              height={36}
              borderRadius={12}
              backgroundColor={C.success + "12"}
              alignItems="center"
              justifyContent="center"
            >
              <PremiumIcon name="check" size={18} color={C.success} />
            </Stack>
            <Stack marginLeft={11} flex={1}>
              <Text variant="label" color={C.textPrimary}>
                All clear
              </Text>
              <Text variant="caption" color={C.textSecondary}>
                No open tasks for {subject.name}.
              </Text>
            </Stack>
          </Stack>
        )}

        <Stack
          flexDirection="row"
          justifyContent="space-between"
          alignItems="center"
          marginTop={16}
          marginHorizontal={8}
          marginBottom={10}
        >
          <Stack>
            <Text variant="body" color={C.textMuted}>
              Upcoming exam
            </Text>
            <Text variant="caption" color={C.textMuted}>
              {upcoming ? "Your next assessment" : "No assessment scheduled"}
            </Text>
          </Stack>
        </Stack>
        {upcoming ? (
          <StyledPressable
            onPress={() =>
              router.push({
                pathname: "/exam/[id]",
                params: { id: upcoming.id },
              } as any)
            }
          >
            <Stack
              padding={16}
              borderRadius={20}
              backgroundColor={C.bgCard}
              borderWidth={1}
              borderColor={C.border}
              flexDirection="row"
              alignItems="center"
            >
              <Stack
                width={44}
                height={44}
                borderRadius={14}
                backgroundColor={subject.color + "14"}
                alignItems="center"
                justifyContent="center"
              >
                <PremiumIcon name="exam" size={21} color={subject.color} />
              </Stack>
              <Stack marginLeft={12} flex={1}>
                <Text variant="label" color={C.textPrimary}>
                  {upcoming.title}
                </Text>
                <Text variant="caption" color={C.textSecondary} marginTop={2}>
                  {formatExamDate(upcoming.date)}
                </Text>
              </Stack>
              <PremiumIcon name="chevron" size={16} color={C.textMuted} />
            </Stack>
          </StyledPressable>
        ) : (
          <Stack
            padding={15}
            borderRadius={18}
            backgroundColor={C.bgCard}
            borderWidth={1}
            borderColor={C.border}
          >
            <Text variant="bodySmall" color={C.textSecondary}>
              Nothing coming up for this subject yet.
            </Text>
          </Stack>
        )}
      </ScrollView>
    </StyledPage>
  );
}
