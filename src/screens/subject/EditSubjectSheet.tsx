import React, { useState, useCallback, useEffect } from "react";
import { ScrollView, Modal } from "react-native";
import {
  Stack,
  StyledPressable,
  StyledTextInput,
  StyledDivider,
  Switch,
  StyledForm,
} from "fluent-styles";
import { toastService, loaderService, dialogueService } from "fluent-styles";
import { Text } from "../../components/text";
import { useColors } from "../../constants";
import { REMINDER_OPTIONS, SUBJECT_COLORS } from "../../constants";
import { DAYS, DAY_LABELS } from "../../db/schema";
import { useSubjects } from "../../hooks";
import { useAppStore } from "../../stores";
import {
  scheduleSubjectReminders,
  cancelSubjectReminders,
  requestNotificationPermission,
  storeReminderIds,
  getStoredReminderIds,
} from "../../services/notificationService";
import { subjectService } from "../../services/subjectService";
import type { Day, Subject } from "../../db/schema";

interface EditSubjectSheetProps {
  subjectId: string;
  visible: boolean;
  onClose: () => void;
  onDeleted: () => void;
}

const TIME_OPTIONS = Array.from({ length: 24 * 4 }, (_, i) => {
  const h = Math.floor(i / 4);
  const m = (i % 4) * 15;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}).filter((t) => {
  const [h] = t.split(":").map(Number);
  return h >= 6 && h <= 22;
});

export function EditSubjectSheet({
  subjectId,
  visible,
  onClose,
  onDeleted,
}: EditSubjectSheetProps) {
  const Colors = useColors();
  const { update, remove } = useSubjects();
  const { invalidateData } = useAppStore();

  // Form state
  const [loaded, setLoaded] = useState(false);
  const [name, setName] = useState("");
  const [teacher, setTeacher] = useState("");
  const [room, setRoom] = useState("");
  const [color, setColor] = useState<string>(SUBJECT_COLORS[0]);
  const [selectedDays, setSelectedDays] = useState<Day[]>([]);
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("10:00");
  const [reminder, setReminder] = useState<number | null>(null);
  const [reminderOn, setReminderOn] = useState(false);
  const [showStart, setShowStart] = useState(false);
  const [showEnd, setShowEnd] = useState(false);
  const [touched, setTouched] = useState({ name: false });
  const [attemptedSubmit, setAttemptedSubmit] = useState(false);

  // Validation
  const nameError = (touched.name || attemptedSubmit) && !name.trim() ? "Subject name is required" : null;
  const daysError = (attemptedSubmit && selectedDays.length === 0) ? "Choose at least one day" : null;
  const timeError =
    attemptedSubmit && startTime >= endTime ? "End time must be after start time" : null;
  const isValid =
    !!name.trim() && selectedDays.length > 0 && startTime < endTime;

  // Load subject data when sheet opens
  useEffect(() => {
    if (!visible || !subjectId) return;
    subjectService.getById(subjectId).then((s) => {
      if (!s) return;
      setName(s.name);
      setTeacher(s.teacher ?? "");
      setRoom(s.room ?? "");
      setColor(s.color);
      setSelectedDays(s.days.split(",").filter(Boolean) as Day[]);
      setStartTime(s.startTime);
      setEndTime(s.endTime);
      setReminder(s.reminder ?? null);
      setReminderOn(!!s.reminder);
      setTouched({ name: false });
      setAttemptedSubmit(false);
      setLoaded(true);
    });
  }, [visible, subjectId]);

  const toggleDay = (day: Day) => {
    setSelectedDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day],
    );
  };

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
      setReminder(15);
    } else {
      setReminder(null);
    }
    setReminderOn(on);
  };

  const handleSave = useCallback(async () => {
    setAttemptedSubmit(true);

    if (!isValid) {
      toastService.error("Form invalid", "Please fill in all required fields");
      return;
    }

    const id = loaderService.show({ label: "Saving…", variant: "spinner" });
    try {
      // Cancel old reminders before saving
      const oldReminderIds = await getStoredReminderIds(subjectId);
      if (oldReminderIds.length > 0) {
        await cancelSubjectReminders(oldReminderIds);
      }

      await update(subjectId, {
        name: name.trim(),
        teacher: teacher.trim() || null,
        room: room.trim() || null,
        color,
        days: selectedDays.join(","),
        startTime,
        endTime,
        reminder: reminderOn ? reminder : null,
      });

      // Reschedule notifications and store new IDs
      if (reminderOn && reminder) {
        const updated = await subjectService.getById(subjectId);
        if (updated) {
          const newReminderIds = await scheduleSubjectReminders(updated);
          await storeReminderIds(subjectId, newReminderIds);
        }
      } else {
        // Clear reminder IDs if reminders are turned off
        await storeReminderIds(subjectId, []);
      }

      invalidateData();
      toastService.success("Subject updated!");
      onClose();
    } catch (err: any) {
      toastService.error("Failed to save", err?.message);
    } finally {
      loaderService.hide(id);
    }
  }, [
    isValid,
    name,
    teacher,
    room,
    color,
    selectedDays,
    startTime,
    endTime,
    reminder,
    reminderOn,
    subjectId,
    update,
    invalidateData,
    onClose,
  ]);

  const handleDelete = useCallback(async () => {
    const ok = await dialogueService.confirm({
      title: "Delete subject?",
      message: "This will also delete all homework for this subject.",
      icon: "🗑️",
      confirmLabel: "Delete",
      destructive: true,
    });
    if (!ok) return;
    const loadId = loaderService.show({
      label: "Deleting…",
      variant: "spinner",
    });
    try {
      // Cancel reminders before deleting
      const reminderIds = await getStoredReminderIds(subjectId);
      if (reminderIds.length > 0) {
        await cancelSubjectReminders(reminderIds);
      }

      await remove(subjectId);
      toastService.success("Subject deleted");
      onDeleted();
    } catch (err: any) {
      toastService.error("Failed to delete", err?.message);
    } finally {
      loaderService.hide(loadId);
    }
  }, [subjectId, remove, onDeleted]);

  if (!loaded) return null;

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
          maxHeight="92%"
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
              Edit Subject
            </Text>
            <StyledPressable onPress={handleSave} disabled={!isValid}>
              <Text variant="button" color={isValid ? Colors.primary : Colors.textMuted}>
                Save
              </Text>
            </StyledPressable>
          </Stack>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
          >
            <StyledForm>
              {/* Subject name */}
              <Stack gap={6} marginBottom={16}>
                <Text variant="overline" color={Colors.textMuted}>
                  SUBJECT NAME *
                </Text>
                <StyledTextInput
                  variant="filled"
                  placeholder="e.g. Mathematics"
                  value={name}
                  onChangeText={(value) => {
                    setName(value);
                    if (!touched.name) setTouched((s) => ({ ...s, name: true }));
                  }}
                  fontSize={15}
                  borderRadius={12}
                />
                {nameError ? (
                  <Text variant="caption" color={Colors.error}>
                    {nameError}
                  </Text>
                ) : null}
              </Stack>

              {/* Teacher + Room */}
              <Stack flexDirection="row" gap={12} marginBottom={16}>
                <Stack flex={1} gap={6}>
                  <Text variant="overline" color={Colors.textMuted}>
                    TEACHER
                  </Text>
                  <StyledTextInput
                    variant="filled"
                    placeholder="Optional"
                    value={teacher}
                    onChangeText={setTeacher}
                    fontSize={14}
                    borderRadius={12}
                  />
                </Stack>
                <Stack flex={1} gap={6}>
                  <Text variant="overline" color={Colors.textMuted}>
                    ROOM
                  </Text>
                  <StyledTextInput
                    variant="filled"
                    placeholder="Optional"
                    value={room}
                    onChangeText={setRoom}
                    fontSize={14}
                    borderRadius={12}
                  />
                </Stack>
              </Stack>

              {/* Days */}
              <Stack gap={8} marginBottom={16}>
                <Text variant="overline" color={Colors.textMuted}>
                  REPEAT ON *
                </Text>
                <Stack flexDirection="row" gap={8} flexWrap="wrap">
                  {DAYS.map((day) => {
                    const active = selectedDays.includes(day);
                    return (
                      <StyledPressable
                        key={day}
                        paddingHorizontal={14}
                        paddingVertical={9}
                        borderRadius={12}
                        borderWidth={2}
                        borderColor={active ? color : Colors.border}
                        backgroundColor={active ? color + "20" : Colors.bgCard}
                        onPress={() => toggleDay(day)}
                      >
                        <Text
                          variant="button"
                          fontSize={13}
                          color={active ? color : Colors.textMuted}
                        >
                          {DAY_LABELS[day]}
                        </Text>
                      </StyledPressable>
                    );
                  })}
                </Stack>
                {daysError ? (
                  <Text variant="caption" color={Colors.error}>
                    {daysError}
                  </Text>
                ) : null}
              </Stack>

              {/* Time */}
              <Stack gap={8} marginBottom={16}>
                <Text variant="overline" color={Colors.textMuted}>
                  TIME *
                </Text>
                <Stack flexDirection="row" gap={12}>
                  <StyledPressable
                    flex={1}
                    flexDirection="row"
                    alignItems="center"
                    justifyContent="space-between"
                    paddingHorizontal={14}
                    paddingVertical={14}
                    borderRadius={12}
                    backgroundColor={Colors.bgInput}
                    onPress={() => setShowStart(true)}
                  >
                    <Text variant="label" color={Colors.textMuted}>
                      From
                    </Text>
                    <Text variant="title" color={Colors.textPrimary}>
                      {startTime}
                    </Text>
                  </StyledPressable>
                  <StyledPressable
                    flex={1}
                    flexDirection="row"
                    alignItems="center"
                    justifyContent="space-between"
                    paddingHorizontal={14}
                    paddingVertical={14}
                    borderRadius={12}
                    backgroundColor={Colors.bgInput}
                    onPress={() => setShowEnd(true)}
                  >
                    <Text variant="label" color={Colors.textMuted}>
                      To
                    </Text>
                    <Text variant="title" color={Colors.textPrimary}>
                      {endTime}
                    </Text>
                  </StyledPressable>
                </Stack>
                {timeError ? (
                  <Text variant="caption" color={Colors.error}>
                    {timeError}
                  </Text>
                ) : null}
              </Stack>

              {/* Colour */}
              <Stack gap={8} marginBottom={16}>
                <Text variant="overline" color={Colors.textMuted}>
                  COLOUR
                </Text>
                <Stack flexDirection="row" flexWrap="wrap" gap={10}>
                  {SUBJECT_COLORS.map((c) => (
                    <StyledPressable
                      key={c}
                      width={36}
                      height={36}
                      borderRadius={18}
                      backgroundColor={c}
                      alignItems="center"
                      justifyContent="center"
                      borderWidth={color === c ? 3 : 0}
                      borderColor={Colors.bgCard}
                      onPress={() => setColor(c)}
                      style={
                        color === c
                          ? {
                              shadowColor: c,
                              shadowOffset: { width: 0, height: 2 },
                              shadowOpacity: 0.5,
                              shadowRadius: 6,
                            }
                          : undefined
                      }
                    >
                      {color === c && (
                        <Text variant="button" fontSize={16} color="#fff">
                          ✓
                        </Text>
                      )}
                    </StyledPressable>
                  ))}
                </Stack>
              </Stack>

              {/* Reminder */}
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
                    🔔 Class reminder
                  </Text>
                  <Text variant="bodySmall" color={Colors.textMuted}>
                    Get notified before class starts
                  </Text>
                </Stack>
                <Switch
                  value={reminderOn}
                  onChange={handleReminderToggle}
                  activeColor={Colors.primary}
                />
              </Stack>

              {reminderOn && (
                <Stack gap={8} marginBottom={16}>
                  <Text variant="overline" color={Colors.textMuted}>
                    NOTIFY ME
                  </Text>
                  <Stack flexDirection="row" flexWrap="wrap" gap={8}>
                    {REMINDER_OPTIONS.filter((o) => o.value !== null).map(
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

              {/* Delete — moved to swipe action on card */}
              {/* <StyledDivider
                borderBottomColor={Colors.border}
                marginVertical={16}
              />
              <StyledPressable
                paddingVertical={16}
                borderRadius={14}
                backgroundColor={Colors.error + "12"}
                alignItems="center"
                onPress={handleDelete}
              >
                <Text variant="button" color={Colors.error}>
                  🗑️ Delete Subject
                </Text>
              </StyledPressable> */}
            </StyledForm>
          </ScrollView>
        </Stack>
      </Stack>

      {/* Time pickers */}
      {showStart && (
        <TimePicker
          value={startTime}
          title="Start time"
          onSelect={(t) => {
            setStartTime(t);
            setShowStart(false);
          }}
          onClose={() => setShowStart(false)}
        />
      )}
      {showEnd && (
        <TimePicker
          value={endTime}
          title="End time"
          onSelect={(t) => {
            setEndTime(t);
            setShowEnd(false);
          }}
          onClose={() => setShowEnd(false)}
        />
      )}
    </Modal>
  );
}

// ─── Shared time picker ───────────────────────────────────────────────────────
function TimePicker({
  value,
  onSelect,
  onClose,
  title,
}: {
  value: string;
  onSelect: (t: string) => void;
  onClose: () => void;
  title: string;
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
              {title}
            </Text>
            <Stack width={60} />
          </Stack>
          <ScrollView contentContainerStyle={{ paddingVertical: 8 }}>
            {TIME_OPTIONS.map((t) => (
              <StyledPressable
                key={t}
                flexDirection="row"
                alignItems="center"
                justifyContent="space-between"
                paddingHorizontal={20}
                paddingVertical={14}
                backgroundColor={
                  t === value ? Colors.primary + "12" : "transparent"
                }
                onPress={() => onSelect(t)}
              >
                <Text
                  variant="metric"
                  fontSize={17}
                  color={t === value ? Colors.primary : Colors.textPrimary}
                >
                  {t}
                </Text>
                {t === value && (
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
