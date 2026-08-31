import React, { useState, useCallback } from "react";
import { ScrollView } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { dismissKeyboardThenOpen } from "../../utils/keyboard";
import {
  Stack,
  StyledPressable,
  StyledTextInput,
  StyledDatePicker,
  StyledDivider,
  Switch,
  StyledForm,
  StyledPage,
  StyledDropdown,
  Popup,
} from "fluent-styles";
import type { DropdownOptionItem } from "fluent-styles";
import { toastService, loaderService } from "fluent-styles";
import { format } from "date-fns";
import { Text } from "../../components/text";
import { ModalFormHeader } from "../../components/ModalFormHeader";
import { useColors } from "../../constants";
import { EXAM_REMINDER_OPTIONS } from "../../constants";
import { useExams } from "../../hooks/useExams";
import { useSubjects } from "../../hooks";
import { usePremium } from "../../hooks/usePremium";
import { requestNotificationPermission } from "../../services/notificationService";

// A real full screen (pushed via router), not a Popup/Modal — a transparent
// RN Modal combined with an autofocused TextInput has a real-device-only
// bug (not reproducible in the Simulator) where the keyboard's async,
// separate-process show/hide on hardware can leave the modal content blank
// until the keyboard dismisses. A plain screen has no Modal in the mix, so
// there's nothing for the keyboard to desync with.
export function AddExamSheet() {
  const Colors = useColors();
  const { create, data: allExams } = useExams();
  const { data: subjects, refetch: refetchSubjects } = useSubjects();
  const premium = usePremium();

  // Courses are created on a separate screen, so a subject added after this
  // one mounted (e.g. via Quick Add -> Class, then back to Add Exam) needs
  // a refetch on focus — the mount-time fetch alone would leave the picker
  // stuck showing whatever existed when this screen first loaded.
  useFocusEffect(
    useCallback(() => {
      refetchSubjects();
    }, [refetchSubjects]),
  );

  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [room, setRoom] = useState("");
  const [subjectId, setSubjectId] = useState<string | null>(null);
  const [examDate, setExamDate] = useState<Date>(new Date());
  const [reminder, setReminder] = useState<number | null>(null);
  const [reminderOn, setReminderOn] = useState(false);
  const [showDate, setShowDate] = useState(false);
  const [touched, setTouched] = useState({ title: false });
  const [attemptedSubmit, setAttemptedSubmit] = useState(false);

  // "" stands in for "no course" — StyledDropdown's value is always a
  // string, so null can't be represented directly.
  const subjectOptions: DropdownOptionItem[] = [
    { value: "", label: "No course" },
    ...subjects.map((s) => ({ value: s.id, label: s.name })),
  ];

  // Validation
  const titleError =
    (touched.title || attemptedSubmit) && !title.trim()
      ? "Title is required"
      : null;
  const isValid = !!title.trim();

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
    setAttemptedSubmit(true);

    if (!isValid) {
      toastService.error("Form invalid", "Please fill in all required fields");
      return;
    }

    if (!premium.canAddExam(allExams.length)) {
      toastService.error(
        "Free limit reached",
        `Upgrade to Premium to add more than ${premium.limits.EXAMS} exams`,
      );
      router.back();
      router.push("/premium");
      return;
    }
    try {
      await loaderService.wrap(
        () =>
          create({
            title: title.trim(),
            notes: notes.trim() || null,
            room: room.trim() || null,
            subjectId: subjectId ?? null,
            date: examDate,
            reminder: reminderOn ? reminder : null,
          }),
        { label: "Saving…", variant: "spinner" },
      );
      toastService.success("Exam added!");
      router.back();
    } catch (err: any) {
      toastService.error("Failed to save", err?.message);
    }
  }, [
    premium,
    allExams,
    isValid,
    title,
    notes,
    room,
    subjectId,
    examDate,
    create,
  ]);

  return (
    <StyledPage showStatusBar backgroundColor={Colors.bg}>
      {/* Header */}
      <StyledPage.Header.Full>
        <ModalFormHeader
          title="New Exam"
          onCancel={() => router.back()}
          onSave={handleSave}
          saveDisabled={!isValid}
        />
      </StyledPage.Header.Full>

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
            onChangeText={(value) => {
              setTitle(value);
              if (!touched.title) setTouched((s) => ({ ...s, title: true }));
            }}
            fontSize={15}
            borderRadius={12}
            autoFocus
          />
          {titleError ? (
            <Text variant="caption" color={Colors.error}>
              {titleError}
            </Text>
          ) : null}
        </Stack>

        <StyledForm>
          {/* Subject picker */}
          <Stack gap={6} marginBottom={16}>
            <StyledDropdown
              label="Course"
              value={subjectId ?? ""}
              placeholder="Select course (optional)"
              data={subjectOptions}
              clearable
              onChange={(item) => setSubjectId(item?.value || null)}
            />
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
              onPress={() => dismissKeyboardThenOpen(() => setShowDate(true))}
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
          <StyledDivider borderBottomColor={Colors.border} marginBottom={16} />
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
            <Stack gap={8}>
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
                        borderColor={active ? Colors.primary : Colors.border}
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
        </StyledForm>
      </ScrollView>

      {/* Date picker popup — no TextInput inside, unaffected by the
          Modal+keyboard bug, so this can stay a Popup. */}
      <Popup
        visible={showDate}
        onClose={() => setShowDate(false)}
        overlayColor="rgba(0,0,0,0.5)"
        roundRadius={24}
        colors={{ background: Colors.bgCard, handle: Colors.border }}
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
      </Popup>
    </StyledPage>
  );
}
