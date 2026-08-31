import React from "react";
import {
  Stack,
  StyledText,
  StyledPressable,
  StyledCard,
} from "fluent-styles";
import { Text, SwipeDeleteAction } from "../../components";
import { useColors } from "../../constants";
import type { Subject } from "../../db/schema";

// ─── Subject card — timeline row ──────────────────────────────────────────────
// Extracted out of the old (now-deleted, unused) HomeScreen so the Home
// planning hub's embedded Timetable pane (HomeTimetableView) can keep using
// it without dragging in the rest of that dead screen.
export function SubjectCard({
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
