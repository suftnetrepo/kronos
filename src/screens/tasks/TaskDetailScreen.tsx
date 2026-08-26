import React, { useCallback, useState } from "react";
import { ScrollView } from "react-native";
import {
  Stack,
  StyledPressable,
  StyledPage,
  StyledDivider,
  dialogueService,
  toastService,
  StyledText,
} from "fluent-styles";
import { router, useFocusEffect } from "expo-router";
import { Text, PremiumIcon } from "../../components";
import type { PremiumIconName } from "../../components/PremiumIcon";
import { TrashIcon, UndoIcon } from "../../icons/ui";
import { useColors } from "../../constants";
import { taskService } from "../../services/taskService";
import { subjectService } from "../../services/subjectService";
import { examService } from "../../services/examService";
import { useAppStore } from "../../stores";
import { getCalendarDateState } from "../../utils/dateState";
import type { Task, Subject, Exam, TaskType } from "../../db/schema";

// Icon + label per task type — same mapping New Task uses for its type
// picker, kept local since this is the only other place that needs it.
const TYPE_META: Record<TaskType, [PremiumIconName, string]> = {
  task: ["tasks", "TASK"],
  homework: ["book", "HOMEWORK"],
  study: ["study", "STUDY"],
  assignment: ["assignment", "ASSIGNMENT"],
};

const formatDateTime = (d: Date) =>
  d.toLocaleString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

// ── Small building blocks shared by the info card's two rows ───────────────
function IconTile({ icon, color }: { icon: PremiumIconName; color: string }) {
  return (
    <Stack
      width={34}
      height={34}
      borderRadius={11}
      alignItems="center"
      justifyContent="center"
      backgroundColor={color + "14"}
    >
      <PremiumIcon name={icon} size={16} color={color} />
    </Stack>
  );
}

export default function TaskDetailScreen({ id }: { id: string }) {
  const C = useColors();
  const invalidate = useAppStore((s) => s.invalidateData);
  const [task, setTask] = useState<Task | null>(null);
  const [subject, setSubject] = useState<Subject | null>(null);
  const [exam, setExam] = useState<Exam | null>(null);

  const load = useCallback(async () => {
    const t = await taskService.getById(id);
    setTask(t);
    setSubject(t?.subjectId ? await subjectService.getById(t.subjectId) : null);
    setExam(t?.examId ? await examService.getById(t.examId) : null);
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  if (!task) return <StyledPage flex={1} backgroundColor={C.bg} />;

  const toggle = async () => {
    await taskService.complete(id, !task.isCompleted);
    invalidate();
    await load();
  };

  const remove = async () => {
    const ok = await dialogueService.confirm({
      title: "Delete task?",
      message: "This task will be permanently removed.",
      confirmLabel: "Delete",
      destructive: true,
    });
    if (!ok) return;
    await taskService.remove(id);
    invalidate();
    toastService.success("Task deleted");
    router.back();
  };

  const [typeIcon, typeLabel] =
    TYPE_META[task.type as TaskType] ?? TYPE_META.task;
  const priorityColor =
    task.priority === "high"
      ? C.error
      : task.priority === "medium"
        ? C.warning
        : C.success;

  const dueState = task.dueAt
    ? getCalendarDateState(new Date(task.dueAt))
    : null;
  const dueCaption =
    dueState?.kind === "past"
      ? "Overdue"
      : dueState?.kind === "today"
        ? "Due today"
        : dueState?.kind === "future"
          ? `In ${dueState.days} day${dueState.days === 1 ? "" : "s"}`
          : null;
  const dueColor = dueState?.kind === "past" ? C.error : C.textSecondary;

  return (
    <StyledPage
      showStatusBar
      statusBarStyle="dark-content"
      backgroundColor={C.bg}
    >
      <StyledPage.Header
        title={task.title}
        titleAlignment="left"
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
              router.push({ pathname: "/new-task", params: { id } } as any)
            }
          >
            <StyledText fontSize={16}>Edit</StyledText>
          </StyledPressable>
        }
      />
      <ScrollView
        contentContainerStyle={{
          padding: 8,
          marginHorizontal: 16,
          paddingBottom: 120,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Identity ─────────────────────────────────────────────────── */}
        <Stack marginTop={0}  >
          <Stack flexDirection="row" alignItems="center" gap={8}>
            <Stack
              flexDirection="row"
              alignItems="center"
              gap={5}
              paddingHorizontal={10}
              paddingVertical={6}
              borderRadius={10}
              backgroundColor={C.primary + "12"}
            >
              <PremiumIcon name={typeIcon} size={13} color={C.primary} />
              <Text
                fontSize={11}
                fontWeight="800"
                letterSpacing={0.3}
                color={C.primary}
              >
                {typeLabel}
              </Text>
            </Stack>
            {task.priority !== "normal" ? (
              <Stack
                paddingHorizontal={9}
                paddingVertical={6}
                borderRadius={10}
                backgroundColor={priorityColor + "14"}
              >
                <Text fontSize={10} fontWeight="800" color={priorityColor}>
                  {task.priority.toUpperCase()}
                </Text>
              </Stack>
            ) : null}
          </Stack>

          {subject ? (
            <StyledPressable
              onPress={() =>
                router.push({
                  pathname: "/subject/[id]",
                  params: { id: subject.id },
                } as any)
              }
            >
              <Stack flexDirection="row" alignItems="center" marginTop={7}>
                <Stack
                  width={7}
                  height={7}
                  borderRadius={4}
                  backgroundColor={subject.color}
                  marginRight={6}
                />
                <Text
                  variant="bodySmall"
                  fontWeight="600"
                  color={subject.color}
                  numberOfLines={1}
                >
                  {subject.name}
                </Text>
              </Stack>
            </StyledPressable>
          ) : (
            <Text variant="bodySmall" color={C.textSecondary} marginTop={8}>
              General
            </Text>
          )}
        </Stack>

        {/* ── Info card — due + linked exam, one card, divided ────────────── */}
        <Stack
          marginTop={8}
          borderRadius={18}
          backgroundColor={C.bgCard}
          borderWidth={1}
          borderColor={C.border}
          overflow="hidden"
        >
          <Stack flexDirection="row" padding={14}>
            <IconTile
              icon="calendar"
              color={dueState?.kind === "past" ? C.error : C.primary}
            />
            <Stack flex={1} marginLeft={12}>
              <Text variant="overline" color={C.textMuted}>
                DUE
              </Text>
              {task.dueAt ? (
                <>
                  <Text variant="label" color={C.textPrimary} marginTop={3}>
                    {formatDateTime(new Date(task.dueAt))}
                  </Text>
                  {dueCaption ? (
                    <Text
                      variant="caption"
                      fontWeight="700"
                      color={dueColor}
                      marginTop={2}
                    >
                      {dueCaption}
                    </Text>
                  ) : null}
                </>
              ) : (
                <Text variant="label" color={C.textSecondary} marginTop={3}>
                  Anytime
                </Text>
              )}
              {task.reminderAt ? (
                <Text variant="caption" color={C.textMuted} marginTop={4}>
                  🔔 Reminder {formatDateTime(new Date(task.reminderAt))}
                </Text>
              ) : null}
            </Stack>
          </Stack>

          {exam ? (
            <>
              <StyledDivider
                borderBottomColor={C.border}
                marginHorizontal={14}
              />
              <StyledPressable
                onPress={() =>
                  router.push({
                    pathname: "/exam/[id]",
                    params: { id: exam.id },
                  } as any)
                }
              >
                <Stack flexDirection="row" alignItems="center" padding={14}>
                  <IconTile icon="exam" color={C.primary} />
                  <Stack flex={1} marginLeft={12} marginRight={8}>
                    <Text variant="overline" color={C.textMuted}>
                      LINKED EXAM
                    </Text>
                    <Text
                      variant="label"
                      color={C.textPrimary}
                      marginTop={3}
                      numberOfLines={1}
                    >
                      {exam.title}
                    </Text>
                    <Text
                      variant="caption"
                      color={C.textSecondary}
                      marginTop={2}
                      numberOfLines={1}
                    >
                      {formatDateTime(new Date(exam.date))}
                    </Text>
                  </Stack>
                  <PremiumIcon name="chevron" size={15} color={C.textMuted} />
                </Stack>
              </StyledPressable>
            </>
          ) : null}
        </Stack>

        {/* ── Description — only when notes exist ─────────────────────────── */}
        {task.notes ? (
          <Stack
            marginTop={14}
            borderRadius={18}
            backgroundColor={C.bgCard}
            borderWidth={1}
            borderColor={C.border}
            padding={14}
          >
            <Stack flexDirection="row" alignItems="center" marginBottom={9}>
              <IconTile icon="assignment" color={C.primary} />
              <Text variant="overline" color={C.textMuted} marginLeft={12}>
                DESCRIPTION
              </Text>
            </Stack>
            <Text variant="bodySmall" color={C.textSecondary} lineHeight={20}>
              {task.notes}
            </Text>
          </Stack>
        ) : null}

        {/* ── Completion status — completed tasks only ────────────────────── */}
        {task.isCompleted ? (
          <Stack
            marginTop={14}
            borderRadius={18}
            backgroundColor={C.success + "0A"}
            borderWidth={1}
            borderColor={C.success + "26"}
            padding={14}
          >
            <Stack flexDirection="row" alignItems="center">
              <IconTile icon="check" color={C.success} />
              <Stack flex={1} marginLeft={12}>
                <Text variant="overline" color={C.textMuted}>
                  STATUS
                </Text>
                <Text variant="label" color={C.textPrimary} marginTop={3}>
                  Completed
                </Text>
                {task.completedAt ? (
                  <Text variant="caption" color={C.textSecondary} marginTop={4}>
                    You completed this task on{" "}
                    {formatDateTime(new Date(task.completedAt))}
                  </Text>
                ) : null}
              </Stack>
            </Stack>
          </Stack>
        ) : null}

        {/* ── Primary action ───────────────────────────────────────────────── */}
        {task.isCompleted ? (
          <StyledPressable marginTop={20} onPress={toggle}>
            <Stack
              flexDirection="row"
              alignItems="center"
              justifyContent="center"
              paddingVertical={15}
              borderRadius={16}
              backgroundColor={C.bgCard}
              borderWidth={1}
              borderColor={C.border}
            >
              <UndoIcon size={17} color={C.success} strokeWidth={2.2} />
              <Text variant="label" color={C.textPrimary} marginLeft={9}>
                Reopen task
              </Text>
            </Stack>
          </StyledPressable>
        ) : (
          <StyledPressable marginTop={20} onPress={toggle}>
            <Stack
              flexDirection="row"
              alignItems="center"
              justifyContent="center"
              paddingVertical={15}
              borderRadius={16}
              backgroundColor={C.primary}
            >
              <PremiumIcon name="check" size={17} color={C.white} />
              <Text variant="label" color={C.white} marginLeft={9}>
                Mark as completed
              </Text>
            </Stack>
          </StyledPressable>
        )}

        {/* ── Delete ────────────────────────────────────────────────────────── */}
        <StyledPressable marginTop={10} onPress={remove}>
          <Stack
            flexDirection="row"
            alignItems="center"
            justifyContent="center"
            paddingVertical={15}
            borderRadius={16}
            backgroundColor={C.error + "0A"}
            borderWidth={1}
            borderColor={C.error + "20"}
          >
            <TrashIcon size={16} color={C.error} strokeWidth={2} />
            <Text variant="label" color={C.error} marginLeft={9}>
              Delete task
            </Text>
          </Stack>
        </StyledPressable>

        {/* ── Metadata footer — only real, existing fields ─────────────────── */}
        <Stack alignItems="center" marginTop={16}>
          <Text variant="caption" color={C.textMuted}>
            Created {formatDateTime(new Date(task.createdAt))}
          </Text>
        </Stack>
      </ScrollView>
    </StyledPage>
  );
}
