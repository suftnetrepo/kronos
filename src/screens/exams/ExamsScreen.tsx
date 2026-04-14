import React, { useState, useCallback } from "react";
import { ScrollView } from "react-native";
import { router, useFocusEffect } from "expo-router";
import {
  Stack,
  StyledText,
  StyledPressable,
  StyledCard,
  StyledDivider,
  StyledEmptyState,
  StyledSkeleton,
  theme,
  StyledPage,
} from "fluent-styles";
import { dialogueService, toastService } from "fluent-styles";
import { format, differenceInDays, isToday, isTomorrow } from "date-fns";
import { useColors } from "../../constants";
import { useExams } from "../../hooks/useExams";
import { useSubjects } from "../../hooks";
import type { Exam } from "../../db/schema";
import { AddExamSheet } from "./AddExamSheet";
import { EditExamSheet } from "./EditExamSheet";

// ─── Countdown badge helpers ───────────────────────────────────────────────────
function countdownLabel(date: Date): {
  text: string;
  color: string;
  bg: string;
} {
  if (isToday(date))
    return { text: "Today!", color: "#EF4444", bg: "#EF444420" };
  if (isTomorrow(date))
    return { text: "Tomorrow", color: "#F97316", bg: "#F9731620" };
  const days = differenceInDays(date, new Date());
  if (days <= 7) return { text: `${days}d`, color: "#EAB308", bg: "#EAB30820" };
  if (days <= 30)
    return { text: `${days}d`, color: "#6B7280", bg: "#6B728016" };
  return { text: format(date, "MMM d"), color: "#6B7280", bg: "#6B728016" };
}

// ─── Single exam row ───────────────────────────────────────────────────────────
function ExamRow({
  exam,
  subjectName,
  subjectColor,
  isPast,
  onPress,
  onDelete,
}: {
  exam: Exam;
  subjectName: string;
  subjectColor: string;
  isPast: boolean;
  onPress: (e: Exam) => void;
  onDelete: (e: Exam) => void;
}) {
  const Colors = useColors();
  const date = new Date(exam.date);
  const cd = isPast ? null : countdownLabel(date);

  return (
    <StyledPressable
      onPress={() => onPress(exam)}
      onLongPress={() => onDelete(exam)}
      opacity={isPast ? 0.5 : 1}
    >
      <Stack
        horizontal
        alignItems="center"
        gap={14}
        paddingHorizontal={16}
        paddingVertical={14}
        backgroundColor={Colors.bgCard}
      >
        {/* Icon circle */}
        <Stack
          width={44}
          height={44}
          borderRadius={22}
          backgroundColor={subjectColor + "20"}
          alignItems="center"
          justifyContent="center"
        >
          <StyledText fontSize={20}>📝</StyledText>
        </Stack>

        {/* Content */}
        <Stack flex={1} gap={4}>
          <StyledText
            fontSize={14}
            fontWeight="700"
            color={Colors.textPrimary}
            numberOfLines={1}
          >
            {exam.title}
          </StyledText>
          <Stack horizontal alignItems="center" gap={8} flexWrap="wrap">
            {/* Subject badge */}
            <Stack
              paddingHorizontal={8}
              paddingVertical={2}
              borderRadius={6}
              backgroundColor={subjectColor + "20"}
            >
              <StyledText fontSize={11} fontWeight="700" color={subjectColor}>
                {subjectName}
              </StyledText>
            </Stack>
            {/* Date */}
            <StyledText fontSize={11} fontWeight="600" color={Colors.textMuted}>
              {format(date, "EEE, MMM d")}
            </StyledText>
            {/* Room */}
            {exam.room ? (
              <StyledText fontSize={11} color={Colors.textMuted}>
                📍 {exam.room}
              </StyledText>
            ) : null}
          </Stack>
        </Stack>

        {/* Countdown pill — upcoming only */}
        {cd && (
          <Stack
            paddingHorizontal={10}
            paddingVertical={5}
            borderRadius={20}
            backgroundColor={cd.bg}
          >
            <StyledText fontSize={12} fontWeight="800" color={cd.color}>
              {cd.text}
            </StyledText>
          </Stack>
        )}
      </Stack>
    </StyledPressable>
  );
}

// ─── Section label ─────────────────────────────────────────────────────────────
function SectionLabel({ label, count }: { label: string; count: number }) {
  const Colors = useColors();
  return (
    <Stack
      horizontal
      alignItems="center"
      gap={8}
      paddingTop={20}
      paddingBottom={8}
    >
      <StyledText
        fontSize={14}
        fontWeight="700"
        color={Colors.textMuted}
        letterSpacing={0.5}
      >
        {label}
      </StyledText>
      <Stack
        paddingHorizontal={7}
        paddingVertical={2}
        borderRadius={10}
        backgroundColor={Colors.border}
      >
        <StyledText fontSize={14} fontWeight="700" color={Colors.textMuted}>
          {count}
        </StyledText>
      </Stack>
    </Stack>
  );
}

// ─── Main screen ───────────────────────────────────────────────────────────────
export default function ExamsScreen() {
  const Colors = useColors();
  const {
    data: allExams,
    loading,
    refetch,
    remove,
    upcoming,
    past,
  } = useExams();
  const { data: subjects } = useSubjects();

  const [showAdd, setShowAdd] = useState(false);
  const [editExam, setEditExam] = useState<Exam | null>(null);
  const [showPast, setShowPast] = useState(false);

  useFocusEffect(
    useCallback(() => {
      refetch();
    }, []),
  );

  const subjectMap = Object.fromEntries(
    subjects.map((s) => [s.id, { name: s.name, color: s.color }]),
  );
  const getSub = (subjectId: string | null) => ({
    name: subjectMap[subjectId ?? ""]?.name ?? "No subject",
    color: subjectMap[subjectId ?? ""]?.color ?? "#6B7280",
  });

  const handleDelete = useCallback(
    async (exam: Exam) => {
      const ok = await dialogueService.confirm({
        title: "Delete exam?",
        message: `"${exam.title}" will be removed.`,
        icon: "🗑️",
        confirmLabel: "Delete",
        destructive: true,
      });
      if (ok) {
        await remove(exam.id);
        toastService.success("Deleted");
      }
    },
    [remove],
  );

  return (
    <StyledPage flex={1} backgroundColor={Colors.bg}>
      <StyledPage.Header
        paddingHorizontal={4}
        marginHorizontal={16}
        borderRadius={30}
        paddingRight={8}
        backgroundColor={theme.colors.gray[1]}
        paddingVertical={8}
        showBackArrow
        backArrowProps={{ onPress: () => router.back() }}
        shapeProps={{
          size: 40,
          backgroundColor: theme.colors.gray[1],
          borderColor: theme.colors.gray[300],
          borderWidth: 0.5,
        }}
        title="Exams"
        titleAlignment="left"
        rightIcon={
          past.length > 0 ? (
            <StyledPressable onPress={() => setShowPast((v) => !v)}>
              <StyledText fontSize={13} fontWeight="600" color={Colors.primary}>
                {showPast ? "Hide past" : "Show past"}
              </StyledText>
            </StyledPressable>
          ) : undefined
        }
      />
      <Stack marginTop={8} flex={1} backgroundColor={Colors.bg}>
        {/* Body */}
        {loading ? (
          <Stack padding={16}>
            <StyledSkeleton template="list-item" repeat={4} />
          </Stack>
        ) : allExams.length === 0 ? (
          <StyledEmptyState
            variant="minimal"
            illustration="📝"
            title="No exams yet"
            description="Tap + to add your first exam"
            animated
          />
        ) : (
          <ScrollView
            contentContainerStyle={{
              paddingHorizontal: 16,
              paddingBottom: 140,
            }}
          >
            {/* ── Upcoming ───────────────────────────────────────────── */}
            {upcoming.length > 0 ? (
              <>
                <SectionLabel label="Upcoming" count={upcoming.length} />
                <StyledCard
                  shadow="light"
                  borderRadius={16}
                  backgroundColor={Colors.bgCard}
                  borderWidth={1}
                  borderColor={Colors.border}
                  overflow="hidden"
                >
                  {upcoming.map((exam, i) => {
                    const sub = getSub(exam.subjectId ?? null);
                    return (
                      <Stack key={exam.id}>
                        <ExamRow
                          exam={exam}
                          subjectName={sub.name}
                          subjectColor={sub.color}
                          isPast={false}
                          onPress={setEditExam}
                          onDelete={handleDelete}
                        />
                        {i < upcoming.length - 1 && (
                          <StyledDivider
                            borderBottomColor={Colors.border}
                            marginLeft={74}
                          />
                        )}
                      </Stack>
                    );
                  })}
                </StyledCard>
              </>
            ) : (
              <Stack
                alignItems="center"
                paddingTop={32}
                paddingBottom={8}
                gap={6}
              >
                <StyledText fontSize={36}>🎉</StyledText>
                <StyledText
                  fontSize={14}
                  fontWeight="600"
                  color={Colors.textMuted}
                >
                  No upcoming exams
                </StyledText>
              </Stack>
            )}

            {/* ── Past ───────────────────────────────────────────────── */}
            {showPast && past.length > 0 && (
              <>
                <SectionLabel label="Past" count={past.length} />
                <StyledCard
                  shadow="light"
                  borderRadius={16}
                  backgroundColor={Colors.bgCard}
                  borderWidth={1}
                  borderColor={Colors.border}
                  overflow="hidden"
                >
                  {past.map((exam, i) => {
                    const sub = getSub(exam.subjectId ?? null);
                    return (
                      <Stack key={exam.id}>
                        <ExamRow
                          exam={exam}
                          subjectName={sub.name}
                          subjectColor={sub.color}
                          isPast
                          onPress={setEditExam}
                          onDelete={handleDelete}
                        />
                        {i < past.length - 1 && (
                          <StyledDivider
                            borderBottomColor={Colors.border}
                            marginLeft={74}
                          />
                        )}
                      </Stack>
                    );
                  })}
                </StyledCard>
              </>
            )}
          </ScrollView>
        )}

        {/* FAB */}
        <StyledPressable
          position="absolute"
          right={20}
          bottom={90}
          width={58}
          height={58}
          borderRadius={29}
          backgroundColor={Colors.primary}
          alignItems="center"
          justifyContent="center"
          onPress={() => setShowAdd(true)}
          style={{
            shadowColor: Colors.primaryDark,
            shadowOffset: { width: 0, height: 6 },
            shadowOpacity: 0.35,
            shadowRadius: 10,
            elevation: 8,
          }}
        >
          <StyledText
            fontSize={28}
            color={Colors.white}
            style={{ lineHeight: 32 }}
          >
            +
          </StyledText>
        </StyledPressable>

        <AddExamSheet
          visible={showAdd}
          onClose={() => {
            setShowAdd(false);
            refetch();
          }}
        />

        <EditExamSheet
          exam={editExam}
          visible={editExam !== null}
          onClose={() => {
            setEditExam(null);
            refetch();
          }}
        />
      </Stack>
    </StyledPage>
  );
}

