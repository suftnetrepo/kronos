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
  Switch,
  StyledPage,
  theme,
} from "fluent-styles";
import { dialogueService, toastService } from "fluent-styles";
import { format, isToday, isTomorrow, isPast } from "date-fns";
import { useColors } from "../../constants";
import { useHomework, useSubjects } from "../../hooks";
import { Text } from "../../components";
import type { Homework } from "../../db/schema";
import { AddHomeworkSheet } from "./AddHomeworkSheet";

function dueDateLabel(
  date: Date,
  Colors: ReturnType<typeof useColors>,
): { text: string; color: string } {
  if (isToday(date)) return { text: "Due today", color: Colors.warning };
  if (isTomorrow(date)) return { text: "Due tomorrow", color: Colors.warning };
  if (isPast(date)) return { text: "Overdue", color: Colors.error };
  return { text: format(date, "MMM d"), color: Colors.textMuted };
}

function HomeworkRow({
  hw,
  subjectName,
  subjectColor,
  onToggle,
  onDelete,
}: {
  hw: Homework;
  subjectName: string;
  subjectColor: string;
  onToggle: (id: string, done: boolean) => void;
  onDelete: (hw: Homework) => void;
}) {
  const Colors = useColors();
  const due = dueDateLabel(new Date(hw.dueDate), Colors);

  return (
    <StyledPressable onLongPress={() => onDelete(hw)}>
      <Stack
        flexDirection="row"
        alignItems="center"
        gap={14}
        paddingHorizontal={16}
        paddingVertical={14}
        backgroundColor={Colors.bgCard}
      >
        {/* Done checkbox */}
        <StyledPressable
          width={26}
          height={26}
          borderRadius={13}
          borderWidth={2}
          borderColor={hw.done ? subjectColor : Colors.border}
          backgroundColor={hw.done ? subjectColor : "transparent"}
          alignItems="center"
          justifyContent="center"
          onPress={() => onToggle(hw.id, !hw.done)}
        >
          {hw.done && (
            <StyledText fontSize={13} color={Colors.white}>
              ✓
            </StyledText>
          )}
        </StyledPressable>

        {/* Content */}
        <Stack flex={1} gap={4}>
          <Text
            fontSize={14}
            fontWeight="700"
            color={hw.done ? Colors.textMuted : Colors.textPrimary}
            style={hw.done ? { textDecorationLine: "line-through" } : undefined}
            numberOfLines={2}
          >
            {hw.title}
          </Text>
          <Stack flexDirection="row" alignItems="center" gap={8}>
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
            <Text variant="caption" fontWeight="600" color={due.color}>
              {due.text}
            </Text>
          </Stack>
        </Stack>
      </Stack>
    </StyledPressable>
  );
}

export default function HomeworkScreen() {
  const Colors = useColors();
  const {
    data: homeworks,
    loading,
    refetch,
    toggleDone,
    remove,
  } = useHomework();
  const { data: subjects } = useSubjects();
  const [showDone, setShowDone] = useState(false);
  const [showAdd, setShowAdd] = useState(false);

  useFocusEffect(
    useCallback(() => {
      refetch();
    }, []),
  );

  const subjectMap = Object.fromEntries(
    subjects.map((s) => [s.id, { name: s.name, color: s.color }]),
  );

  const pending = homeworks.filter((h) => !h.done);
  const done = homeworks.filter((h) => h.done);

  const handleDelete = useCallback(
    async (hw: Homework) => {
      const ok = await dialogueService.confirm({
        title: "Delete homework?",
        message: `"${hw.title}" will be removed.`,
        icon: "🗑️",
        confirmLabel: "Delete",
        destructive: true,
      });
      if (ok) {
        await remove(hw.id);
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
        title="Home work"
        titleAlignment="left"
        titleProps={{
          color: Colors.textPrimary,
          fontSize: 20,
          fontWeight: "700",
          fontFamily: "PlusJakartaSans_700Bold",
        }}
        rightIcon={
          <Stack flexDirection="row" alignItems="center" gap={6}>
            <Text variant="label" color={Colors.textMuted}>
              Show done
            </Text>
            <Switch
              value={showDone}
              onChange={setShowDone}
              size="sm"
              activeColor={Colors.primary}
            />
          </Stack>
        }
      />
      {loading ? (
        <Stack padding={16}>
          <StyledSkeleton template="list-item" repeat={4} />
        </Stack>
      ) : homeworks.length === 0 ? (
        <StyledEmptyState
          variant="minimal"
          illustration="🎉"
          title="No homework!"
          description="Enjoy your free time 🎊"
          animated
        />
      ) : (
        <ScrollView
          contentContainerStyle={{
            paddingTop: 16,
            paddingHorizontal: 16,
            paddingBottom: 140,
          }}
        >
          {/* Pending */}
          {pending.length > 0 && (
            <StyledCard
              marginBottom={8}
              borderRadius={16}
              backgroundColor={Colors.bgCard}
              borderWidth={1}
              borderColor={Colors.border}
              overflow="hidden"
            >
              {pending.map((hw, i) => {
                const sub = subjectMap[hw.subjectId ?? ""];
                return (
                  <Stack key={hw.id}>
                    <HomeworkRow
                      hw={hw}
                      subjectName={sub?.name ?? "Unknown"}
                      subjectColor={sub?.color ?? Colors.primary}
                      onToggle={toggleDone}
                      onDelete={handleDelete}
                    />
                    {i < pending.length - 1 && (
                      <StyledDivider
                        borderBottomColor={Colors.border}
                        marginLeft={56}
                      />
                    )}
                  </Stack>
                );
              })}
            </StyledCard>
          )}

          {/* Done section */}
          {showDone && done.length > 0 && (
            <>
              <Text
                variant="label"
                color={Colors.textMuted}
                letterSpacing={0.5}
                paddingBottom={8}
              >
                Completed ({done.length})
              </Text>
              <StyledCard
                borderRadius={16}
                backgroundColor={Colors.bgCard}
                borderWidth={1}
                borderColor={Colors.border}
                overflow="hidden"
              >
                {done.map((hw, i) => {
                  const sub = subjectMap[hw.subjectId ?? ""];
                  return (
                    <Stack key={hw.id}>
                      <HomeworkRow
                        hw={hw}
                        subjectName={sub?.name ?? "Unknown"}
                        subjectColor={sub?.color ?? Colors.primary}
                        onToggle={toggleDone}
                        onDelete={handleDelete}
                      />
                      {i < done.length - 1 && (
                        <StyledDivider
                          borderBottomColor={Colors.border}
                          marginLeft={56}
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

      {/* FAB — above floating tab bar */}
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

      <AddHomeworkSheet
        visible={showAdd}
        onClose={() => {
          setShowAdd(false);
          refetch();
        }}
      />
    </StyledPage>
  );
}
