import React, { useCallback, useState, useRef, useEffect } from "react";
import { ScrollView } from "react-native";
import Svg, { Path, Circle } from "react-native-svg";
import { useFocusEffect } from "expo-router";
import * as Haptics from "expo-haptics";
import {
  Stack,
  StyledText,
  StyledPressable,
  StyledCard,
  StyledEmptyState,
  StyledSkeleton,
  StyledSpacer,
  StyledPage,
} from "fluent-styles";
import {
  dialogueService,
  toastService,
  actionSheetService,
} from "fluent-styles";
import { Text, SwipeDeleteAction } from "../../components";
import { useColors } from "../../constants";
import { DAYS, DAY_LABELS } from "../../db/schema";
import { useSubjects } from "../../hooks";
import { useAppStore } from "../../stores";
import type { Subject, Day } from "../../db/schema";
import { EditSubjectSheet } from "../subject/EditSubjectSheet";
import { AddSubjectSheet } from "../subject/AddSubjectSheet";
import { ShareTimetableContent } from "../timetable/ShareTimetableContent";
import { ImportTimetableContent } from "../timetable/ImportTimetableContent";

// ─── Subject card — timeline row ──────────────────────────────────────────────
function SubjectCard({
  subject,
  onEdit,
  onDelete,
  openSwipeId,
  onSwipeOpen,
}: {
  subject: Subject;
  onEdit: (s: Subject) => void;
  onDelete: (s: Subject) => void;
  openSwipeId: string | null;
  onSwipeOpen: (id: string | null) => void;
}) {
  const Colors = useColors();
  const isOpen = openSwipeId === subject.id;

  const handleSwipeOpenChange = (isOpen: boolean) => {
    if (isOpen && openSwipeId !== subject.id) {
      // Close the previous swipe before opening this one
      onSwipeOpen(null);
      setTimeout(() => onSwipeOpen(subject.id), 0);
    } else if (!isOpen) {
      onSwipeOpen(null);
    }
  };

  return (
    <Stack flexDirection="row" gap={0} marginBottom={8}>
      {/* Time column */}
      <Stack
        alignItems="flex-end"
        paddingRight={12}
        paddingTop={4}
        gap={2}
      >
        <Text variant="label" color={Colors.textPrimary}>
          {subject.startTime}
        </Text>
        <Text variant="caption" color={Colors.textMuted}>
          {subject.endTime}
        </Text>
      </Stack>

      {/* Timeline dot + line */}
      <Stack alignItems="center" width={20}>
        <Stack
          width={12}
          height={12}
          borderRadius={6}
          backgroundColor={subject.color}
          marginTop={4}
          style={{
            shadowColor: subject.color,
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.4,
            shadowRadius: 4,
          }}
        />
        <Stack
          flex={1}
          width={2}
          backgroundColor={Colors.border}
          marginTop={4}
        />
      </Stack>

      {/* Subject card with swipe delete */}
      <Stack flex={1} paddingLeft={12} paddingBottom={8}>
        <SwipeDeleteAction
          itemId={subject.id}
          isOpen={isOpen}
          onOpenChange={handleSwipeOpenChange}
          onDelete={() => onDelete(subject)}
          destructiveColor={Colors.error}
        >
          <StyledPressable onPress={() => onEdit(subject)}>
            <StyledCard
              borderRadius={8}
              backgroundColor={Colors.bgCard}
              borderWidth={0}
              overflow="hidden"
              style={{
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.06,
                shadowRadius: 8,
              }}
            >
              {/* Coloured left accent bar */}
              <Stack flexDirection="row">
                <Stack
                  width={4}
                  backgroundColor={subject.color}
                  borderTopLeftRadius={16}
                  borderBottomLeftRadius={16}
                />
                <Stack flex={1} padding={14} gap={6}>
                  <Stack
                    flexDirection="row"
                    alignItems="center"
                    justifyContent="space-between"
                  >
                    <Text
                      variant="subtitle"
                      color={Colors.textPrimary}
                      flex={1}
                      numberOfLines={1}
                    >
                      {subject.name}
                    </Text>
                    {subject.reminder && (
                      <Stack
                        flexDirection="row"
                        alignItems="center"
                        gap={4}
                        paddingHorizontal={10}
                        paddingVertical={4}
                        borderRadius={999}
                        backgroundColor={subject.color + "22"}
                      >
                        <StyledText fontSize={12}>🔔</StyledText>
                        <Text
                          variant="caption"
                          color={subject.color}
                        >
                          {subject.reminder}m
                        </Text>
                      </Stack>
                    )}
                  </Stack>

                  <Stack flexDirection="row" gap={16}>
                    {subject.teacher ? (
                      <Stack flexDirection="row" alignItems="center" gap={4}>
                        <StyledText fontSize={12}>👤</StyledText>
                        <Text variant="bodySmall" color={Colors.textSecondary}>
                          {subject.teacher}
                        </Text>
                      </Stack>
                    ) : null}
                    {subject.room ? (
                      <Stack flexDirection="row" alignItems="center" gap={4}>
                        <StyledText fontSize={12}>📍</StyledText>
                        <Text variant="bodySmall" color={Colors.textSecondary}>
                          {subject.room}
                        </Text>
                      </Stack>
                    ) : null}
                  </Stack>
                </Stack>
              </Stack>
            </StyledCard>
          </StyledPressable>
        </SwipeDeleteAction>
      </Stack>
    </Stack>
  );
}

// ─── Day chip ─────────────────────────────────────────────────────────────────
function DayChip({
  day,
  active,
  isToday,
  onPress,
}: {
  day: Day;
  active: boolean;
  isToday: boolean;
  onPress: () => void;
}) {
  const Colors = useColors();

  if (active) {
    return (
      <StyledPressable
        alignItems="center"
        justifyContent="center"
        paddingHorizontal={18}
        paddingVertical={10}
        borderRadius={999}
        backgroundColor={Colors.primary}
        onPress={onPress}
        style={{
          shadowColor: Colors.primaryDark,
          shadowOffset: { width: 0, height: 3 },
          shadowOpacity: 0.25,
          shadowRadius: 6,
          elevation: 4,
        }}
      >
        <Text
          variant="button"
          color={Colors.white}
          letterSpacing={0.2}
        >
          {DAY_LABELS[day]}
        </Text>
      </StyledPressable>
    );
  }

  return (
    <StyledPressable
      alignItems="center"
      justifyContent="center"
      paddingHorizontal={14}
      paddingTop={10}
      paddingBottom={isToday ? 6 : 10}
      borderRadius={999}
      onPress={onPress}
    >
      <Text
        variant="subLabel"
        color={isToday ? Colors.primary : Colors.textMuted}
      >
        {DAY_LABELS[day]}
      </Text>
      {isToday && (
        <Stack
          width={4}
          height={4}
          borderRadius={2}
          backgroundColor={Colors.primary}
          marginTop={4}
        />
      )}
    </StyledPressable>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────
export default function HomeScreen() {
  const Colors = useColors();
  const { selectedDay, setSelectedDay } = useAppStore();
  const {
    data: subjects,
    loading,
    refetch,
    remove,
  } = useSubjects(selectedDay as Day);
  const chipScrollRef = useRef<ScrollView>(null);

  // Auto-scroll chips so active day is always visible
  useEffect(() => {
    const index = DAYS.indexOf(selectedDay as Day);
    if (index >= 0 && chipScrollRef.current) {
      // Each chip is roughly 70px wide — scroll to bring active into view
      chipScrollRef.current.scrollTo({
        x: Math.max(0, index * 68 - 60),
        animated: true,
      });
    }
  }, [selectedDay]);

  const todayKey = (() => {
    const days: Day[] = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
    return days[new Date().getDay()];
  })();

  const [editId, setEditId] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [openSwipeId, setOpenSwipeId] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      refetch();
    }, []),
  );

  const handleShare = useCallback(() => {
    actionSheetService.present(<ShareTimetableContent />, {
      title: "Share Timetable", theme: "light"
    });
  }, []);

  const handleImport = useCallback(() => {
    actionSheetService.present(
      <ImportTimetableContent onDone={() => refetch()} />,
      { title: "Import Timetable", theme: "light" },
    );
  }, [refetch]);

  const handleEdit = useCallback((subject: Subject) => {
    setEditId(subject.id);
  }, []);

  const handleDelete = useCallback(
    async (subject: Subject) => {
      const ok = await dialogueService.confirm({
        title: "Delete subject?",
        message: "This will also delete all homework for this subject.",
        icon: "🗑️",
        confirmLabel: "Delete",
        destructive: true,
      });
      if (!ok) return;
      setOpenSwipeId(null);
      await remove(subject.id);
      toastService.success("Subject deleted");
    },
    [remove],
  );

  return (
    <StyledPage flex={1} backgroundColor={Colors.bg}>
      {/* ── Header ──────────────────────────────────────────────── */}
      <Stack
        backgroundColor={Colors.bg}
        paddingHorizontal={8}
        borderBottomColor={Colors.border}
      >
        {/* Title row */}
        <Stack horizontal alignItems="center" justifyContent="space-between">
          {/* Left — Kronos logo + title */}
          <Stack horizontal alignItems="center" gap={10}>
            <Stack
              width={36}
              height={36}
              borderRadius={10}
              backgroundColor={Colors.primary}
              alignItems="center"
              justifyContent="center"
            >
              {/* Lightning bolt */}
              <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
                <Path
                  d="M13 2L4.09 12.97A1 1 0 005 14.5h6.5L11 22l8.91-10.97A1 1 0 0019 9.5h-6.5L13 2z"
                  fill={Colors.white}
                />
              </Svg>
            </Stack>
            <Text
              variant="header"
              color={Colors.textPrimary}
              letterSpacing={-0.5}
            >
              Kronos
            </Text>
          </Stack>

          {/* Right — import + share buttons */}
          <Stack horizontal alignItems="center" gap={8}>
            <StyledPressable
              width={40}
              height={40}
              borderRadius={20}
              backgroundColor={Colors.bgMuted}
              alignItems="center"
              justifyContent="center"
              onPress={handleImport}
            >
              {/* Download arrow into tray — import */}
              <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
                <Path
                  d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"
                  stroke={Colors.textSecondary}
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <Path
                  d="M7 10l5 5 5-5"
                  stroke={Colors.textSecondary}
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <Path
                  d="M12 15V3"
                  stroke={Colors.textSecondary}
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </Svg>
            </StyledPressable>
            <StyledPressable
              width={40}
              height={40}
              borderRadius={20}
              backgroundColor={Colors.bgMuted}
              alignItems="center"
              justifyContent="center"
              onPress={handleShare}
            >
              {/* Share graph — three nodes connected */}
              <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
                <Circle
                  cx={18}
                  cy={5}
                  r={3}
                  stroke={Colors.textSecondary}
                  strokeWidth={2}
                />
                <Circle
                  cx={6}
                  cy={12}
                  r={3}
                  stroke={Colors.textSecondary}
                  strokeWidth={2}
                />
                <Circle
                  cx={18}
                  cy={19}
                  r={3}
                  stroke={Colors.textSecondary}
                  strokeWidth={2}
                />
                <Path
                  d="M8.59 13.51l6.83 3.98M15.41 6.51l-6.82 3.98"
                  stroke={Colors.textSecondary}
                  strokeWidth={2}
                  strokeLinecap="round"
                />
              </Svg>
            </StyledPressable>
          </Stack>
        </Stack>

        <StyledSpacer marginVertical={8} />
        {/* Day chips — horizontal scroll */}
        <ScrollView
          ref={chipScrollRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ flexDirection: 'row', flex: 1, borderRadius:8, paddingBottom: 8, backgroundColor: Colors.bgCard }}
        >
          {DAYS.map((day) => (
            <DayChip
              key={day}
              day={day}
              active={selectedDay === day}
              isToday={todayKey === day}
              onPress={() => {
                Haptics.selectionAsync();
                setSelectedDay(day as any);
              }}
            />
          ))}
        </ScrollView>
      </Stack>

      {/* ── Timeline ────────────────────────────────────────────── */}
      {loading ? (
        <Stack padding={20}>
          <StyledSkeleton template="list-item" repeat={4} animation="shimmer" />
        </Stack>
      ) : subjects.length === 0 ? (
        <StyledEmptyState
          variant="minimal"
          illustration="📅"
          title={`No classes on ${DAY_LABELS[selectedDay as Day]}s`}
          description="Tap the + button to add a class"
          animated
        />
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 20, paddingVertical:16, paddingBottom: 140 }}
        >
          {subjects.map((subject) => (
            <SubjectCard
              key={subject.id}
              subject={subject}
              onEdit={handleEdit}
              onDelete={handleDelete}
              openSwipeId={openSwipeId}
              onSwipeOpen={setOpenSwipeId}
            />
          ))}
        </ScrollView>
      )}

      {/* ── FAB — sits above floating tab bar ───────────────────── */}
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
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          setShowAdd(true);
        }}
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

      {/* Add subject sheet */}
      <AddSubjectSheet
        visible={showAdd}
        onClose={() => {
          setShowAdd(false);
          refetch();
        }}
      />

      {/* Edit subject sheet */}
      {editId && (
        <EditSubjectSheet
          subjectId={editId}
          visible={!!editId}
          onClose={() => setEditId(null)}
          onDeleted={() => {
            setEditId(null);
            refetch();
          }}
        />
      )}
    </StyledPage>
  );
}
