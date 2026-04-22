import React, { useState, useCallback, useEffect } from "react";
import { ScrollView, Modal } from "react-native";
import {
  Stack,
  StyledPressable,
  StyledTextInput,
  StyledDatePicker,
  StyledDivider,
  Switch,
  StyledForm,
} from "fluent-styles";
import { toastService, loaderService, dialogueService } from "fluent-styles";
import { format } from "date-fns";
import { Text } from "../../components/text";
import { useColors } from "../../constants";
import { EXAM_REMINDER_OPTIONS } from "../../constants";
import { useExams } from "../../hooks/useExams";
import { useSubjects } from "../../hooks";
import { requestNotificationPermission } from "../../services/notificationService";
import type { Exam, Subject } from "../../db/schema";

interface EditExamSheetProps {
  exam: Exam | null;
  visible: boolean;
  onClose: () => void;
}

export function EditExamSheet({ exam, visible, onClose }: EditExamSheetProps) {
  const Colors = useColors();
  const { update, remove } = useExams();
  const { data: subjects } = useSubjects();

  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [room, setRoom] = useState("");
  const [subjectId, setSubjectId] = useState<string | null>(null);
  const [examDate, setExamDate] = useState<Date>(new Date());
  const [reminder, setReminder] = useState<number | null>(null);
  const [reminderOn, setReminderOn] = useState(false);
  const [showDate, setShowDate] = useState(false);
  const [showSubjects, setShowSubjects] = useState(false);

  useEffect(() => {
    if (exam) {
      setTitle(exam.title);
      setNotes(exam.notes ?? "");
      setRoom(exam.room ?? "");
      setSubjectId(exam.subjectId ?? null);
      setExamDate(new Date(exam.date));
      const hasReminder = exam.reminder !== null && exam.reminder !== undefined;
      setReminder(hasReminder ? exam.reminder : null);
      setReminderOn(hasReminder);
    }
  }, [exam]);

  const selectedSubject = subjects.find((s) => s.id === subjectId);

  const handleReminderToggle = async (on: boolean) => {
    if (on) {
      const granted = await requestNotificationPermission();
      if (!granted) {
        toastService.warning(
          "Notifications disabled",
          "Enable in Settings to use reminders",
        );
        return;
      }
      setReminder(60);
    } else {
      setReminder(null);
    }
    setReminderOn(on);
  };

  const handleSave = useCallback(async () => {
    if (!exam) return;
    if (!title.trim()) {
      toastService.error("Title required", "Enter an exam title");
      return;
    }
    try {
      await loaderService.wrap(
        () =>
          update(exam.id, {
            title: title.trim(),
            notes: notes.trim() || null,
            room: room.trim() || null,
            subjectId: subjectId ?? null,
            date: examDate,
            reminder: reminderOn ? reminder : null,
          }),
        { label: "Saving…", variant: "spinner" },
      );
      toastService.success("Exam updated!");
      onClose();
    } catch (err: any) {
      toastService.error("Failed to save", err?.message);
    }
  }, [exam, title, notes, room, subjectId, examDate, update, onClose]);

  const handleDelete = useCallback(async () => {
    if (!exam) return;
    const ok = await dialogueService.confirm({
      title: "Delete exam?",
      message: `"${exam.title}" will be removed.`,
      icon: "🗑️",
      confirmLabel: "Delete",
      destructive: true,
    });
    if (!ok) return;
    try {
      await loaderService.wrap(() => remove(exam.id), {
        label: "Deleting…",
        variant: "spinner",
      });
      toastService.success("Exam deleted");
      onClose();
    } catch (err: any) {
      toastService.error("Failed to delete", err?.message);
    }
  }, [exam, remove, onClose]);

  if (!exam) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Stack
        flex={1}
        backgroundColor="rgba(0,0,0,0.45)"
        justifyContent="flex-end"
      >
        <Stack
          backgroundColor={Colors.bgCard}
          borderTopLeftRadius={28}
          borderTopRightRadius={28}
          maxHeight="85%"
        >
          {/* Handle */}
          <Stack alignItems="center" paddingTop={12} paddingBottom={4}>
            <Stack
              width={40}
              height={4}
              borderRadius={2}
              backgroundColor={Colors.border}
            />
          </Stack>

          {/* Header */}
          <Stack
            flexDirection="row"
            alignItems="center"
            justifyContent="space-between"
            paddingHorizontal={20}
            paddingVertical={14}
            borderBottomWidth={1}
            borderBottomColor={Colors.border}
          >
            <StyledPressable onPress={onClose}>
              <Text variant="button" color={Colors.textMuted}>
                Cancel
              </Text>
            </StyledPressable>
            <Text variant="title" color={Colors.textPrimary}>
              Edit Exam
            </Text>
            <StyledPressable onPress={handleSave}>
              <Text variant="button" color={Colors.primary}>
                Save
              </Text>
            </StyledPressable>
          </Stack>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
          >
            {/* Title */}
            <Stack gap={6} marginBottom={16}>
              <Text variant="overline" color={Colors.textMuted}>
                TITLE *
              </Text>
              <StyledTextInput
                variant="filled"
                placeholder="e.g. Midterm Exam"
                value={title}
                onChangeText={setTitle}
                fontSize={15}
                borderRadius={12}
              />
            </Stack>
            <StyledForm>
              {/* Subject picker */}
              <Stack gap={6} marginBottom={16}>
                <Text variant="overline" color={Colors.textMuted}>
                  SUBJECT
                </Text>
                <StyledPressable
                  flexDirection="row"
                  alignItems="center"
                  justifyContent="space-between"
                  paddingHorizontal={16}
                  paddingVertical={14}
                  borderRadius={12}
                  backgroundColor={Colors.bgInput}
                  onPress={() => setShowSubjects(true)}
                >
                  {selectedSubject ? (
                    <Stack flexDirection="row" alignItems="center" gap={10}>
                      <Stack
                        width={12}
                        height={12}
                        borderRadius={6}
                        backgroundColor={selectedSubject.color}
                      />
                      <Text variant="label" color={Colors.textPrimary}>
                        {selectedSubject.name}
                      </Text>
                    </Stack>
                  ) : (
                    <Text variant="body" color={Colors.textMuted}>
                      Select subject (optional)
                    </Text>
                  )}
                  <Text variant="body" color={Colors.textMuted}>
                    ›
                  </Text>
                </StyledPressable>
              </Stack>

              {/* Date */}
              <Stack gap={6} marginBottom={16}>
                <Text variant="overline" color={Colors.textMuted}>
                  DATE
                </Text>
                <StyledPressable
                  flexDirection="row"
                  alignItems="center"
                  justifyContent="space-between"
                  paddingHorizontal={16}
                  paddingVertical={14}
                  borderRadius={12}
                  backgroundColor={Colors.bgInput}
                  onPress={() => setShowDate(true)}
                >
                  <Text variant="label" color={Colors.textPrimary}>
                    📅 {format(examDate, "EEE, MMM d, yyyy")}
                  </Text>
                  <Text variant="body" color={Colors.textMuted}>
                    ›
                  </Text>
                </StyledPressable>
              </Stack>

              {/* Room */}
              <Stack gap={6} marginBottom={16}>
                <Text variant="overline" color={Colors.textMuted}>
                  ROOM (OPTIONAL)
                </Text>
                <StyledTextInput
                  variant="filled"
                  placeholder="e.g. Hall B, Room 204"
                  value={room}
                  onChangeText={setRoom}
                  fontSize={15}
                  borderRadius={12}
                />
              </Stack>

              {/* Notes */}
              <Stack gap={6} marginBottom={16}>
                <Text variant="overline" color={Colors.textMuted}>
                  NOTES (OPTIONAL)
                </Text>
                <StyledTextInput
                  variant="filled"
                  placeholder="Topics covered, materials allowed…"
                  value={notes}
                  onChangeText={setNotes}
                  fontSize={14}
                  borderRadius={12}
                  multiline
                  numberOfLines={3}
                />
              </Stack>

              {/* Reminder toggle */}
              <StyledDivider
                borderBottomColor={Colors.border}
                marginBottom={16}
              />
              <Stack
                flexDirection="row"
                alignItems="center"
                justifyContent="space-between"
                marginBottom={reminderOn ? 12 : 0}
              >
                <Stack gap={2}>
                  <Text variant="label" color={Colors.textPrimary}>
                    🔔 Exam reminder
                  </Text>
                  <Text variant="bodySmall" color={Colors.textMuted}>
                    Get notified before exam
                  </Text>
                </Stack>
                <Switch
                  value={reminderOn}
                  onChange={handleReminderToggle}
                  activeColor={Colors.primary}
                />
              </Stack>

              {/* Reminder duration */}
              {reminderOn && (
                <Stack gap={8} marginBottom={24}>
                  <Text variant="overline" color={Colors.textMuted}>
                    NOTIFY ME
                  </Text>
                  <Stack flexDirection="row" flexWrap="wrap" gap={8}>
                    {EXAM_REMINDER_OPTIONS.filter((o) => o.value !== null).map(
                      (opt) => {
                        const active = reminder === opt.value;
                        return (
                          <StyledPressable
                            key={opt.value}
                            paddingHorizontal={14}
                            paddingVertical={9}
                            borderRadius={12}
                            borderWidth={2}
                            borderColor={
                              active ? Colors.primary : Colors.border
                            }
                            backgroundColor={
                              active ? Colors.primary + "15" : Colors.bgCard
                            }
                            onPress={() => setReminder(opt.value as number)}
                          >
                            <Text
                              variant="button"
                              fontSize={13}
                              color={active ? Colors.primary : Colors.textMuted}
                            >
                              {opt.label}
                            </Text>
                          </StyledPressable>
                        );
                      },
                    )}
                  </Stack>
                </Stack>
              )}

              {/* Delete */}
              <StyledPressable
                alignItems="center"
                justifyContent="center"
                paddingVertical={14}
                borderRadius={14}
                backgroundColor={Colors.error + "14"}
                onPress={handleDelete}
              >
                <Text variant="button" color={Colors.error}>
                  🗑️ Delete Exam
                </Text>
              </StyledPressable>
            </StyledForm>
          </ScrollView>
        </Stack>
      </Stack>

      {/* Subject picker modal */}
      {showSubjects && (
        <SubjectPickerModal
          subjects={subjects}
          selected={subjectId}
          onSelect={(id) => {
            setSubjectId(id);
            setShowSubjects(false);
          }}
          onClose={() => setShowSubjects(false)}
        />
      )}

      {/* Date picker modal */}
      {showDate && (
        <Modal
          visible
          transparent
          animationType="slide"
          onRequestClose={() => setShowDate(false)}
        >
          <Stack
            flex={1}
            backgroundColor="rgba(0,0,0,0.5)"
            justifyContent="flex-end"
          >
            <Stack
              backgroundColor={Colors.bgCard}
              borderTopLeftRadius={24}
              borderTopRightRadius={24}
            >
              <Stack
                horizontal
                alignItems="center"
                justifyContent="space-between"
                paddingHorizontal={20}
                paddingVertical={14}
                borderBottomWidth={1}
                borderBottomColor={Colors.border}
              >
                <StyledPressable onPress={() => setShowDate(false)}>
                  <Text variant="button" color={Colors.textMuted}>
                    Cancel
                  </Text>
                </StyledPressable>
                <Text variant="title" color={Colors.textPrimary}>
                  Exam date
                </Text>
                <StyledPressable onPress={() => setShowDate(false)}>
                  <Text variant="button" color={Colors.primary}>
                    Done
                  </Text>
                </StyledPressable>
              </Stack>
              <Stack paddingHorizontal={16} paddingBottom={32}>
                <StyledDatePicker
                  mode="date"
                  variant="inline"
                  value={examDate}
                  onChange={setExamDate}
                  showTodayButton
                  colors={{
                    selected: Colors.primary,
                    today: Colors.primary,
                    confirmBg: Colors.primary,
                  }}
                />
              </Stack>
            </Stack>
          </Stack>
        </Modal>
      )}
    </Modal>
  );
}

// ─── Subject picker ────────────────────────────────────────────────────────────
function SubjectPickerModal({
  subjects,
  selected,
  onSelect,
  onClose,
}: {
  subjects: Subject[];
  selected: string | null;
  onSelect: (id: string | null) => void;
  onClose: () => void;
}) {
  const Colors = useColors();
  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <Stack
        flex={1}
        backgroundColor="rgba(0,0,0,0.5)"
        justifyContent="flex-end"
      >
        <Stack
          backgroundColor={Colors.bgCard}
          borderTopLeftRadius={24}
          borderTopRightRadius={24}
          maxHeight="60%"
        >
          <Stack
            horizontal
            alignItems="center"
            justifyContent="space-between"
            paddingHorizontal={20}
            paddingVertical={14}
            borderBottomWidth={1}
            borderBottomColor={Colors.border}
          >
            <StyledPressable onPress={onClose}>
              <Text variant="button" color={Colors.textMuted}>
                Cancel
              </Text>
            </StyledPressable>
            <Text variant="title" color={Colors.textPrimary}>
              Select subject
            </Text>
            <Stack width={60} />
          </Stack>
          <ScrollView contentContainerStyle={{ paddingVertical: 8 }}>
            <StyledPressable
              flexDirection="row"
              alignItems="center"
              gap={14}
              paddingHorizontal={20}
              paddingVertical={14}
              backgroundColor={
                !selected ? Colors.primary + "12" : "transparent"
              }
              onPress={() => onSelect(null)}
            >
              <Stack
                width={12}
                height={12}
                borderRadius={6}
                backgroundColor={Colors.textMuted}
              />
              <Text flex={1} variant="label" color={Colors.textMuted}>
                No subject
              </Text>
              {!selected && (
                <Text variant="button" color={Colors.primary}>
                  ✓
                </Text>
              )}
            </StyledPressable>
            {subjects.map((s) => (
              <StyledPressable
                key={s.id}
                flexDirection="row"
                alignItems="center"
                gap={14}
                paddingHorizontal={20}
                paddingVertical={14}
                backgroundColor={
                  selected === s.id ? Colors.primary + "12" : "transparent"
                }
                onPress={() => onSelect(s.id)}
              >
                <Stack
                  width={12}
                  height={12}
                  borderRadius={6}
                  backgroundColor={s.color}
                />
                <Text
                  flex={1}
                  variant={selected === s.id ? "label" : "body"}
                  color={
                    selected === s.id ? Colors.primary : Colors.textPrimary
                  }
                >
                  {s.name}
                </Text>
                {selected === s.id && (
                  <Text variant="button" color={Colors.primary}>
                    ✓
                  </Text>
                )}
              </StyledPressable>
            ))}
          </ScrollView>
        </Stack>
      </Stack>
    </Modal>
  );
}
