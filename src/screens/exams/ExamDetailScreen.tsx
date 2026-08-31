import React, { useCallback, useMemo, useState } from "react";
import { ScrollView } from "react-native";
import {
  Stack,
  StyledPressable,
  StyledPage,
  StyledDivider,
  StyledCircularProgress,
  StyledProgressBar,
  dialogueService,
  toastService,
  StyledText,
} from "fluent-styles";
import { router, useFocusEffect } from "expo-router";
import { Text, PremiumIcon, ScreenHeader } from "../../components";
import { IconTile } from "../tasks/TaskDetailScreen";
import { TrashIcon } from "../../icons/ui";
import { useAppStore } from "../../stores";
import { useColors } from "../../constants";
import { examService } from "../../services/examService";
import { subjectService } from "../../services/subjectService";
import { taskService } from "../../services/taskService";
import type { Exam, Subject, Task } from "../../db/schema";
import { getCalendarDateState } from "../../utils/dateState";

const formatExamDate = (d: Date) =>
  d.toLocaleDateString(undefined, {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

const formatTaskDue = (d: Date) =>
  d.toLocaleDateString(undefined, { day: "numeric", month: "short" });

export default function ExamDetailScreen({ id }: { id: string }) {
  const C = useColors();
  const invalidate = useAppStore((s) => s.invalidateData);
  const [exam, setExam] = useState<Exam | null>(null);
  const [subject, setSubject] = useState<Subject | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);

  const load = useCallback(async () => {
    const e = await examService.getById(id);
    setExam(e);
    setSubject(e?.subjectId ? await subjectService.getById(e.subjectId) : null);
    setTasks(await taskService.getByExam(id));
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const completedCount = tasks.filter((t) => t.isCompleted).length;
  const progress = useMemo(
    () =>
      tasks.length ? Math.round((completedCount / tasks.length) * 100) : 0,
    [tasks.length, completedCount],
  );

  if (!exam) return <StyledPage flex={1} backgroundColor={C.bg} />;

  const accent = subject?.color || C.primary;
  const dateState = getCalendarDateState(new Date(exam.date));
  const topics = (exam.notes || "")
    .split("\n")
    .map((x) => x.trim())
    .filter(Boolean);

  const dateBadge =
    dateState.kind === "today"
      ? { text: "TODAY", color: C.primary, bg: C.primary + "14" }
      : dateState.kind === "future"
        ? {
            text: `In ${dateState.days} day${dateState.days === 1 ? "" : "s"}`,
            color: C.primary,
            bg: C.primary + "14",
          }
        : { text: "PAST", color: C.textMuted, bg: C.bgMuted };

  const remove = async () => {
    const ok = await dialogueService.confirm({
      title: "Delete exam?",
      message:
        "The exam will be removed. Linked study tasks will remain as normal tasks.",
      confirmLabel: "Delete",
      destructive: true,
    });

    if (!ok) return;

    await examService.remove(id);
    invalidate();
    toastService.success("Exam deleted");
    router.back();
  };

  return (
    <StyledPage
      showStatusBar
      statusBarStyle="dark-content"
      backgroundColor={C.bg}
    >
      <StyledPage.Header
        title={subject?.name}
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
            onPress={() => router.push({ pathname: "/edit-exam", params: { id } } as any)}
          >
            <StyledText fontSize={16}>Edit</StyledText>
          </StyledPressable>
        }
      />
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 88 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Exam identity */}
        <Stack marginTop={16} marginHorizontal={8}>
          <Stack flexDirection="row" alignItems="center">
            <Stack
              width={8}
              height={8}
              borderRadius={4}
              backgroundColor={accent}
              marginRight={8}
            />
            <Text variant="overline" color={accent}>
              {exam?.title }
            </Text>
          </Stack>
        </Stack>

        {/* Exam summary */}
        <Stack
          marginTop={16}
          padding={18}
          borderRadius={22}
          backgroundColor={C.bgCard}
          borderWidth={1}
          borderColor={C.border}
        >
          <Stack flexDirection="row" alignItems="center">
            <IconTile icon="calendar" color={accent} />

            <Stack flex={1} marginLeft={14} marginRight={10}>
              <Text variant="overline" color={C.textMuted}>
                EXAM DATE
              </Text>
              <Text
                variant="title"
                fontSize={20}
                lineHeight={26}
                color={C.textPrimary}
                marginTop={4}
                numberOfLines={1}
              >
                {formatExamDate(new Date(exam.date))}
              </Text>

              {exam.room ? (
                <Stack flexDirection="row" alignItems="center" marginTop={7}>
                  <PremiumIcon
                    name="location"
                    size={13}
                    color={C.textSecondary}
                  />
                  <Text
                    variant="caption"
                    color={C.textSecondary}
                    marginLeft={5}
                    numberOfLines={1}
                  >
                    Room {exam.room}
                  </Text>
                </Stack>
              ) : null}
            </Stack>

            <Stack
              paddingHorizontal={11}
              paddingVertical={6}
              borderRadius={99}
              backgroundColor={dateBadge.bg}
            >
              <Text fontSize={10} fontWeight="800" color={dateBadge.color}>
                {dateBadge.text}
              </Text>
            </Stack>
          </Stack>
        </Stack>

        {/* Study progress */}
        <Text
          variant="body"
          color={C.textMuted}
          marginTop={8}
          marginHorizontal={8}
          marginBottom={12}
        >
          Progress
        </Text>

        <Stack
          flexDirection="row"
          alignItems="center"
          padding={18}
          borderRadius={22}
          backgroundColor={C.bgCard}
          borderWidth={1}
          borderColor={C.border}
        >
          <StyledCircularProgress
            value={progress}
            diameter={68}
            strokeWidth={7}
            display="percent"
            colors={{
              arc: C.primary,
              track: C.bgMuted,
              label: C.primary,
            }}
          />

          <Stack flex={1} marginLeft={16}>
            <Text variant="bodySmall" color={C.textSecondary}>
              {completedCount} of {tasks.length} study task
              {tasks.length === 1 ? "" : "s"} complete
            </Text>

            <Stack marginTop={12}>
              <StyledProgressBar
                value={progress}
                size="sm"
                shape="pill"
                colors={{ fill: C.success, track: C.bgMuted }}
              />
            </Stack>
          </Stack>
        </Stack>

        {/* Topics / notes */}
        {topics.length ? (
          <>
            <Text
              variant="body"
              color={C.textMuted}
              marginTop={8}
              marginHorizontal={8}
              marginBottom={12}
            >
              Topics / notes
            </Text>

            <Stack
              borderRadius={22}
              backgroundColor={C.bgCard}
              borderWidth={1}
              borderColor={C.border}
              overflow="hidden"
            >
              {topics.map((topic, index) => (
                <Stack key={`${topic}-${index}`}>
                  <Stack
                    flexDirection="row"
                    alignItems="flex-start"
                    paddingHorizontal={16}
                    paddingVertical={14}
                  >
                    <Stack
                      width={7}
                      height={7}
                      borderRadius={4}
                      backgroundColor={accent}
                      marginTop={7}
                      marginRight={11}
                    />
                    <Text variant="bodySmall" color={C.textSecondary} flex={1}>
                      {topic}
                    </Text>
                  </Stack>

                  {index < topics.length - 1 ? (
                    <StyledDivider
                      borderBottomColor={C.border}
                      marginLeft={34}
                    />
                  ) : null}
                </Stack>
              ))}
            </Stack>
          </>
        ) : null}

        {/* Study plan */}
        <Stack
          flexDirection="row"
          justifyContent="space-between"
          alignItems="center"
          marginTop={8}
          marginHorizontal={8}
          marginBottom={12}
        >
          <Text variant="body" color={C.textMuted}>
            Study plan
          </Text>

          <StyledPressable
            hitSlop={8}
            onPress={() =>
              router.push({
                pathname: "/new-task",
                params: {
                  type: "study",
                  subjectId: exam.subjectId || "",
                  examId: id,
                },
              } as any)
            }
          >
            <Text variant="label" color={C.primary}>
              + Add study task
            </Text>
          </StyledPressable>
        </Stack>

        {tasks.length ? (
          <Stack
            borderRadius={22}
            backgroundColor={C.bgCard}
            borderWidth={1}
            borderColor={C.border}
            overflow="hidden"
          >
            {tasks.map((task, index) => {
              const priorityColor =
                task.priority === "high"
                  ? C.error
                  : task.priority === "medium"
                    ? C.warning
                    : C.success;

              return (
                <Stack key={task.id}>
                  <StyledPressable
                    onPress={() =>
                      router.push({
                        pathname: "/task/[id]",
                        params: { id: task.id },
                      } as any)
                    }
                  >
                    <Stack
                      flexDirection="row"
                      alignItems="center"
                      paddingHorizontal={15}
                      paddingVertical={14}
                    >
                      <Stack
                        width={24}
                        height={24}
                        borderRadius={12}
                        borderWidth={2}
                        borderColor={task.isCompleted ? C.success : accent}
                        backgroundColor={
                          task.isCompleted ? C.success : "transparent"
                        }
                        alignItems="center"
                        justifyContent="center"
                      >
                        {task.isCompleted ? (
                          <PremiumIcon
                            name="check"
                            size={13}
                            color={C.white}
                            strokeWidth={2.5}
                          />
                        ) : null}
                      </Stack>

                      <Stack flex={1} marginLeft={12} marginRight={10}>
                        <Text
                          variant="label"
                          numberOfLines={1}
                          color={
                            task.isCompleted ? C.textSecondary : C.textPrimary
                          }
                          style={
                            task.isCompleted
                              ? { textDecorationLine: "line-through" }
                              : undefined
                          }
                        >
                          {task.title}
                        </Text>

                        <Text
                          variant="caption"
                          color={C.textSecondary}
                          numberOfLines={1}
                          marginTop={2}
                        >
                          {task.dueAt
                            ? `Due ${formatTaskDue(new Date(task.dueAt))}`
                            : "Anytime"}
                        </Text>
                      </Stack>

                      {task.priority !== "normal" ? (
                        <Stack
                          paddingHorizontal={8}
                          paddingVertical={4}
                          borderRadius={99}
                          backgroundColor={priorityColor + "14"}
                          marginRight={8}
                        >
                          <Text
                            fontSize={9}
                            fontWeight="800"
                            color={priorityColor}
                          >
                            {task.priority.toUpperCase()}
                          </Text>
                        </Stack>
                      ) : null}

                      <PremiumIcon
                        name="chevron"
                        size={15}
                        color={C.textMuted}
                      />
                    </Stack>
                  </StyledPressable>

                  {index < tasks.length - 1 ? (
                    <StyledDivider
                      borderBottomColor={C.border}
                      marginLeft={51}
                    />
                  ) : null}
                </Stack>
              );
            })}
          </Stack>
        ) : (
          <Stack
            flexDirection="row"
            alignItems="center"
            padding={17}
            borderRadius={22}
            borderWidth={1}
            borderColor={C.border}
            borderStyle="dashed"
            backgroundColor={C.bgCard}
          >
            <Stack
              width={46}
              height={46}
              borderRadius={16}
              backgroundColor={C.primary + "10"}
              alignItems="center"
              justifyContent="center"
              marginRight={13}
            >
              <PremiumIcon name="assignment" size={20} color={C.primary} />
            </Stack>

            <Stack flex={1}>
              <Text variant="label" color={C.textPrimary}>
                No study tasks yet
              </Text>
              <Text variant="caption" color={C.textSecondary} marginTop={3}>
                Add one to start tracking your preparation.
              </Text>
            </Stack>
          </Stack>
        )}

        {/* Destructive action */}
        <StyledPressable marginTop={32} onPress={remove}>
          <Stack
            flexDirection="row"
            alignItems="center"
            justifyContent="center"
            paddingVertical={16}
            borderRadius={18}
            backgroundColor={C.error + "0A"}
            borderWidth={1}
            borderColor={C.error + "22"}
          >
            <TrashIcon size={17} color={C.error} strokeWidth={2} />
            <Text variant="label" color={C.error} marginLeft={9}>
              Delete exam
            </Text>
          </Stack>
        </StyledPressable>
      </ScrollView>
    </StyledPage>
  );
}
