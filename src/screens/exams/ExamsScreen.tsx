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
  StyledSpacer,
} from "fluent-styles";
import { dialogueService, toastService } from "fluent-styles";
import { format, differenceInDays, isToday, isTomorrow } from "date-fns";
import { useColors } from "../../constants";
import { useExams } from "../../hooks/useExams";
import { useSubjects } from "../../hooks";
import { Text } from "../../components";
import type { Exam } from "../../db/schema";
import { AddExamSheet } from "./AddExamSheet";
import { EditExamSheet } from "./EditExamSheet";

// ─── Countdown badge helpers ───────────────────────────────────────────────────
function countdownLabel(
  date: Date,
  Colors: ReturnType<typeof useColors>
): {
  text: string;
  color: string;
  bg: string;
} {
  if (isToday(date))
    return { text: "Today!", color: Colors.error, bg: Colors.error + "33" };
  if (isTomorrow(date))
    return { text: "Tomorrow", color: Colors.warning, bg: Colors.warning + "33" };
  const days = differenceInDays(date, new Date());
  if (days <= 7)
    return { text: `${days}d`, color: Colors.warning, bg: Colors.warning + "33" };
  if (days <= 30)
    return { text: `${days}d`, color: Colors.textMuted, bg: Colors.textMuted + "20" };
  return { text: format(date, "MMM d"), color: Colors.textMuted, bg: Colors.textMuted + "20" };
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
  const cd = isPast ? null : countdownLabel(date, Colors);

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
          <Text
            variant="label"
            color={Colors.textPrimary}
            numberOfLines={1}
          >
            {exam.title}
          </Text>
          <Stack horizontal alignItems="center" gap={8} flexWrap="wrap">
            {/* Subject badge */}
            <Stack
              paddingHorizontal={8}
              paddingVertical={2}
              borderRadius={6}
              backgroundColor={subjectColor + "20"}
            >
              <Text variant="caption" fontWeight="700" color={subjectColor}>
                {subjectName}
              </Text>
            </Stack>
            {/* Date */}
            <Text variant="caption" fontWeight="600" color={Colors.textMuted}>
              {format(date, "EEE, MMM d")}
            </Text>
            {/* Room */}
            {exam.room ? (
              <Text variant="caption" color={Colors.textMuted}>
                📍 {exam.room}
              </Text>
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
            <Text variant="button" color={cd.color}>
              {cd.text}
            </Text>
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
      paddingBottom={8}
      marginHorizontal={8}
    >
      <Text
        variant="label"
        color={Colors.textMuted}
        letterSpacing={0.5}
      >
        {label}
      </Text>
      <Stack
        paddingHorizontal={7}
        paddingVertical={2}
        borderRadius={10}
        backgroundColor={Colors.border}
      >
        <Text variant="label" color={Colors.textMuted}>
          {count}
        </Text>
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
    <StyledPage backgroundColor={Colors.bg}>
      <StyledPage.Header
        paddingHorizontal={4}
        marginHorizontal={16}
        borderRadius={30}
        paddingRight={8}
    
        backArrowProps={{ onPress: () => router.back() }}
        shapeProps={{
          size: 40,
          backgroundColor: Colors.bgCard,
          borderColor: Colors.border,
          borderWidth: 0.5,
        }}
        title="Exams"
        titleAlignment="left"
        titleProps={{
          color: Colors.textPrimary,
          fontSize : 20,
          fontWeight: "700",
          fontFamily: "PlusJakartaSans_700Bold",
        }}
        rightIcon={
          past.length > 0 ? (
            <StyledPressable onPress={() => setShowPast((v) => !v)}>
              <Text variant="label" color={Colors.primary}>
                {showPast ? "Hide past" : "Show past"}
              </Text>
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
                <Text
                  variant="body"
                  fontWeight="600"
                  color={Colors.textMuted}
                >
                  No upcoming exams
                </Text>
              </Stack>
            )}

            {/* ── Past ───────────────────────────────────────────────── */}
            {showPast && past.length > 0 && (
              <>
              <StyledSpacer marginVertical={4} />
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

