import React, { useMemo, useState } from "react";
import { ScrollView } from "react-native";
import {
  Stack,
  StyledPressable,
  StyledPage,
  StyledDivider,
} from "fluent-styles";
import * as Haptics from "expo-haptics";
import { router, useLocalSearchParams } from "expo-router";
import { Text, PremiumIcon } from "../../components";
import { useColors } from "../../constants";
import type { AppColors } from "../../constants";
import { useTasks } from "../../hooks/useTasks";
import { useSubjects } from "../../hooks/useSubjects";
import { isSameLocalDay, nextLocalDay } from "../../utils/dateState";
import type { Task, TaskType, Subject } from "../../db/schema";

const TASK_TYPES: TaskType[] = ["task", "homework", "study", "assignment"];
const FILTERS = ["all", "today", "upcoming", "completed"] as const;
type Filter = (typeof FILTERS)[number];
const EARLIER_INITIAL = 2;

const EMPTY_COPY: Record<Filter, [string, string]> = {
  all: ["No tasks yet", "Tap + to capture your first task."],
  today: ["Nothing due today", "Enjoy the calm."],
  upcoming: ["Nothing coming up", "You're ahead of schedule."],
  completed: ["No completed tasks yet", "Complete a task to see it here."],
};
const EMPTY_ICON: Record<Filter, any> = {
  all: "tasks",
  today: "check",
  upcoming: "calendar",
  completed: "check",
};

// ── Module-scope row/card/empty-state helpers ──────────────────────────────
// Kept outside the screen component (rather than defined inline in the render
// body) so React reconciles rows normally across re-renders instead of
// remounting a "new" component type on every render.

function TaskRow({
  t,
  subject,
  isLast,
  C,
  onOpen,
  onToggle,
}: {
  t: Task;
  subject: Subject | undefined;
  isLast: boolean;
  C: AppColors;
  onOpen: (t: Task) => void;
  onToggle: (t: Task) => void;
}) {
  const accent = subject?.color || C.primary;
  const priorityColor =
    t.priority === "high"
      ? C.error
      : t.priority === "medium"
        ? C.warning
        : C.success;
  return (
    <Stack>
      <StyledPressable onPress={() => onOpen(t)}>
        <Stack
          flexDirection="row"
          alignItems="center"
          paddingHorizontal={14}
          paddingVertical={12}
        >
          <StyledPressable
            width={22}
            height={22}
            borderRadius={11}
            borderWidth={2}
            borderColor={t.isCompleted ? C.success : accent}
            backgroundColor={t.isCompleted ? C.success : "transparent"}
            alignItems="center"
            justifyContent="center"
            hitSlop={11}
            onPress={(e: any) => {
              e?.stopPropagation?.();
              onToggle(t);
            }}
          >
            {t.isCompleted ? (
              <PremiumIcon
                name="check"
                size={13}
                color={C.white}
                strokeWidth={2.5}
              />
            ) : null}
          </StyledPressable>
          <Stack flex={1} marginLeft={11} marginRight={8}>
            <Text
              variant="label"
              numberOfLines={1}
              color={t.isCompleted ? C.textSecondary : C.textPrimary}
              style={
                t.isCompleted
                  ? { textDecorationLine: "line-through" }
                  : undefined
              }
            >
              {t.title}
            </Text>
            <Stack flexDirection="row" alignItems="center" marginTop={3}>
              <Stack
                width={6}
                height={6}
                borderRadius={3}
                backgroundColor={accent}
                marginRight={5}
              />
              <Text variant="caption" color={C.textSecondary} numberOfLines={1}>
                {subject?.name || "General"} ·{" "}
                {t.dueAt
                  ? new Date(t.dueAt).toLocaleDateString(undefined, {
                      day: "numeric",
                      month: "short",
                    })
                  : "Anytime"}
              </Text>
            </Stack>
          </Stack>
          {t.priority !== "normal" ? (
            <Stack
              paddingHorizontal={8}
              paddingVertical={4}
              borderRadius={99}
              backgroundColor={priorityColor + "14"}
            >
              <Text fontSize={9} fontWeight="800" color={priorityColor}>
                {t.priority.toUpperCase()}
              </Text>
            </Stack>
          ) : (
            <PremiumIcon name="chevron" size={15} color={C.textMuted} />
          )}
        </Stack>
      </StyledPressable>
      {!isLast ? (
        <StyledDivider borderBottomColor={C.border} marginLeft={47} />
      ) : null}
    </Stack>
  );
}

function TaskCard({
  tasks,
  subjectOf,
  C,
  onOpen,
  onToggle,
}: {
  tasks: Task[];
  subjectOf: (id: string | null) => Subject | undefined;
  C: AppColors;
  onOpen: (t: Task) => void;
  onToggle: (t: Task) => void;
}) {
  return (
    <Stack
      borderRadius={16}
      backgroundColor={C.bgCard}
      borderWidth={1}
      borderColor={C.border}
      overflow="hidden"
    >
      {tasks.map((t, i) => (
        <TaskRow
          key={t.id}
          t={t}
          subject={subjectOf(t.subjectId)}
          isLast={i === tasks.length - 1}
          C={C}
          onOpen={onOpen}
          onToggle={onToggle}
        />
      ))}
    </Stack>
  );
}

function EmptyState({ kind, C }: { kind: Filter; C: AppColors }) {
  const [title, subtitle] = EMPTY_COPY[kind];
  return (
    <Stack
      paddingVertical={30}
      paddingHorizontal={24}
      backgroundColor={C.bgCard}
      borderRadius={18}
      borderWidth={1}
      borderColor={C.border}
      alignItems="center"
    >
      <Stack
        width={46}
        height={46}
        borderRadius={16}
        backgroundColor={C.primary + "10"}
        alignItems="center"
        justifyContent="center"
        marginBottom={12}
      >
        <PremiumIcon name={EMPTY_ICON[kind]} size={21} color={C.primary} />
      </Stack>
      <Text variant="subtitle" color={C.textPrimary}>
        {title}
      </Text>
      <Text
        variant="bodySmall"
        textAlign="center"
        color={C.textSecondary}
        marginTop={4}
      >
        {subtitle}
      </Text>
    </Stack>
  );
}

function SectionLabel({
  label,
  count,
  C,
}: {
  label: string;
  count: number;
  C: AppColors;
}) {
  return (
    <Stack
      flexDirection="row"
      alignItems="center"
      justifyContent="space-between"
      marginBottom={9}
      marginHorizontal={8}
   
    >
      <Stack flexDirection="row" alignItems="center" gap={7}>
        <PremiumIcon name="check" size={13} color={C.success} />
        <Text variant="label" color={C.textPrimary}>
          {label}
        </Text>
      </Stack>
      <Text variant="caption" fontWeight="700" color={C.textMuted}>
        {count}
      </Text>
    </Stack>
  );
}

export default function TasksScreen() {
  const C = useColors();
  const { data, complete } = useTasks();
  const { data: subjects } = useSubjects();
  const [filter, setFilter] = useState<Filter>("all");
  const [showAllEarlier, setShowAllEarlier] = useState(false);

  const params = useLocalSearchParams<{ type?: string }>();
  const typeFilter = (TASK_TYPES as string[]).includes(params.type || "")
    ? (params.type as TaskType)
    : null;
  const scoped = useMemo(
    () => (typeFilter ? data.filter((t) => t.type === typeFilter) : data),
    [data, typeFilter],
  );

  const rows = useMemo(
    () =>
      scoped.filter((t) => {
        if (filter === "completed") return t.isCompleted;
        if (t.isCompleted) return false;
        if (filter === "today")
          return !!t.dueAt && isSameLocalDay(new Date(t.dueAt), new Date());
        if (filter === "upcoming")
          return !!t.dueAt && new Date(t.dueAt) >= nextLocalDay();
        return true;
      }),
    [scoped, filter],
  );

  // Completed tasks are always timestamped on completion (taskService.complete
  // sets completedAt), so "today vs earlier" can be derived safely without any
  // new/persisted state — see requirement §4.
  const completedSorted = useMemo(
    () =>
      scoped
        .filter((t) => t.isCompleted)
        .sort(
          (a, b) =>
            +new Date(b.completedAt ?? b.updatedAt) -
            +new Date(a.completedAt ?? a.updatedAt),
        ),
    [scoped],
  );
  const completedToday = useMemo(
    () =>
      completedSorted.filter(
        (t) =>
          t.completedAt && isSameLocalDay(new Date(t.completedAt), new Date()),
      ),
    [completedSorted],
  );
  const completedEarlier = useMemo(
    () =>
      completedSorted.filter(
        (t) =>
          !(
            t.completedAt && isSameLocalDay(new Date(t.completedAt), new Date())
          ),
      ),
    [completedSorted],
  );
  const earlierVisible = showAllEarlier
    ? completedEarlier
    : completedEarlier.slice(0, EARLIER_INITIAL);

  const subjectOf = (id: string | null) => subjects.find((s) => s.id === id);
  const done = scoped.filter((x) => x.isCompleted).length;

  const openTask = (t: Task) =>
    router.push({ pathname: "/task/[id]", params: { id: t.id } } as any);
  const toggleTask = (t: Task) => {
    Haptics.selectionAsync();
    complete(t.id, !t.isCompleted);
  };

  return (
    <StyledPage
      showStatusBar
      statusBarStyle="dark-content"
      backgroundColor={C.bg}
    >
      <StyledPage.Header.Full>
        {/* ── Header — same typography/spacing philosophy as Today ────────── */}
        <Stack
          flexDirection="row"
          alignItems="flex-end"
          justifyContent="space-between"
          marginBottom={16}
          marginHorizontal={20}
        >
          <Stack flex={1} marginRight={12}>
            <Text
              variant="display"
              fontSize={30}
              lineHeight={37}
              color={C.textPrimary}
            >
              {typeFilter
                ? typeFilter[0].toUpperCase() + typeFilter.slice(1)
                : "Tasks"}
            </Text>
            <Text variant="bodySmall" color={C.textSecondary}>
              {typeFilter
                ? `Filtered to ${typeFilter}.`
                : "Your work, clearly prioritised."}
            </Text>
          </Stack>
          {scoped.length ? (
            <Stack alignItems="flex-end">
              <Text fontSize={18} fontWeight="800" color={C.primary}>
                {done}/{scoped.length}
              </Text>
              <Text fontSize={9} fontWeight="700" color={C.textMuted}>
                COMPLETED
              </Text>
            </Stack>
          ) : null}
        </Stack>
      </StyledPage.Header.Full>
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingBottom: 180,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Filter segment — same treatment as the Timetable Day/Week control ── */}
        <Stack
          flexDirection="row"
          height={44}
          backgroundColor={C.bgCard}
          padding={3}
          borderRadius={13}
          borderWidth={1}
          borderColor={C.border}
          marginBottom={20}
        >
          {FILTERS.map((x) => (
            <StyledPressable
              key={x}
              flex={1}
              alignItems="center"
              justifyContent="center"
              borderRadius={10}
              backgroundColor={filter === x ? C.primary : "transparent"}
              onPress={() => setFilter(x)}
            >
              <Text
                fontSize={12}
                fontWeight="700"
                color={filter === x ? C.white : C.textSecondary}
              >
                {x[0].toUpperCase() + x.slice(1)}
              </Text>
            </StyledPressable>
          ))}
        </Stack>

        {/* ── List ──────────────────────────────────────────────────────── */}
        {filter === "completed" ? (
          completedSorted.length === 0 ? (
            <EmptyState kind="completed" C={C} />
          ) : (
            <>
              {completedToday.length ? (
                <>
                  <SectionLabel
                    label="Completed today"
                    count={completedToday.length}
                    C={C}
                  />
                  <TaskCard
                    tasks={completedToday}
                    subjectOf={subjectOf}
                    C={C}
                    onOpen={openTask}
                    onToggle={toggleTask}
                  />
                </>
              ) : null}
              {completedEarlier.length ? (
                <>
                  <SectionLabel
                    label="Completed earlier"
                    count={completedEarlier.length}
                    C={C}
                  />
                  <TaskCard
                    tasks={earlierVisible}
                    subjectOf={subjectOf}
                    C={C}
                    onOpen={openTask}
                    onToggle={toggleTask}
                  />
                  {completedEarlier.length > EARLIER_INITIAL ? (
                    <StyledPressable
                      hitSlop={8}
                      onPress={() => setShowAllEarlier((v) => !v)}
                    >
                      <Stack alignItems="center" paddingVertical={12}>
                        <Text
                          variant="caption"
                          fontWeight="700"
                          color={C.primary}
                        >
                          {showAllEarlier
                            ? "Show less"
                            : `Show ${completedEarlier.length - EARLIER_INITIAL} more`}
                        </Text>
                      </Stack>
                    </StyledPressable>
                  ) : null}
                </>
              ) : null}
            </>
          )
        ) : rows.length === 0 ? (
          <EmptyState kind={filter} C={C} />
        ) : (
          <TaskCard
            tasks={rows}
            subjectOf={subjectOf}
            C={C}
            onOpen={openTask}
            onToggle={toggleTask}
          />
        )}
      </ScrollView>
    </StyledPage>
  );
}
