import React, { useState, useCallback } from "react";
import { ScrollView, Modal } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { dismissKeyboardThenOpen } from "../../utils/keyboard";
import {
  Stack,
  StyledPressable,
  StyledTextInput,
  StyledDatePicker,
  StyledPage,
} from "fluent-styles";
import { toastService, loaderService } from "fluent-styles";
import { format } from "date-fns";
import { Text } from "../../components/text";
import { useColors } from "../../constants";
import { useHomework, useSubjects } from "../../hooks";
import { useAppStore } from "../../stores";
import { usePremium } from "../../hooks/usePremium";
import type { Subject } from "../../db/schema";

// A real full screen (pushed via router), not a Modal — see AddExamSheet
// for why: a transparent RN Modal + a focused TextInput has a
// real-device-only keyboard/rendering bug that a plain screen sidesteps
// entirely.
export function AddHomeworkSheet() {
  const Colors = useColors();
  const { create, data: allHomework } = useHomework();
  const { data: subjects, refetch: refetchSubjects } = useSubjects();
  const { invalidateData } = useAppStore();
  const premium = usePremium();

  // See AddExamSheet — a course added after this screen mounted needs a
  // refetch on focus, or the picker keeps showing the mount-time list.
  useFocusEffect(
    useCallback(() => {
      refetchSubjects();
    }, [refetchSubjects]),
  );

  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [subjectId, setSubjectId] = useState<string | null>(null);
  const [dueDate, setDueDate] = useState<Date>(new Date());
  const [showDate, setShowDate] = useState(false);
  const [showSubjects, setShowSubjects] = useState(false);
  const [touched, setTouched] = useState({ title: false });
  const [attemptedSubmit, setAttemptedSubmit] = useState(false);

  const selectedSubject = subjects.find((s) => s.id === subjectId);

  // Validation
  const titleError =
    (touched.title || attemptedSubmit) && !title.trim()
      ? "Title is required"
      : null;
  const isValid = !!title.trim();

  const handleSave = useCallback(async () => {
    setAttemptedSubmit(true);

    if (!isValid) {
      toastService.error("Form invalid", "Please fill in all required fields");
      return;
    }

    // Count only this month's homework for the free limit check
    const now = new Date();
    const thisMonthCount = allHomework.filter((h) => {
      const d = new Date(h.createdAt);
      return (
        d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()
      );
    }).length;
    if (!premium.canAddHomework(thisMonthCount)) {
      toastService.error(
        "Free limit reached",
        `Upgrade to Premium to add more than ${premium.limits.HOMEWORK_MONTH} homework items per month`,
      );
      router.back();
      router.push("/premium" as any);
      return;
    }

    const id = loaderService.show({ label: "Saving…", variant: "spinner" });
    try {
      await create({
        title: title.trim(),
        description: desc.trim() || null,
        subjectId: subjectId ?? null,
        dueDate,
        done: false,
      });
      invalidateData();
      toastService.success("Homework added!");
      router.back();
    } catch (err: any) {
      toastService.error("Failed to save", err?.message);
    } finally {
      loaderService.hide(id);
    }
  }, [
    premium,
    allHomework,
    title,
    desc,
    subjectId,
    dueDate,
    isValid,
    create,
    invalidateData,
  ]);

  return (
    <StyledPage showStatusBar backgroundColor={Colors.bg}>
      {/* Header */}
      <StyledPage.Header.Full>
        <Stack
          flexDirection="row"
          alignItems="center"
          justifyContent="space-between"
          paddingHorizontal={20}
          paddingVertical={14}
          borderBottomWidth={1}
          borderBottomColor={Colors.border}
        >
          <StyledPressable onPress={() => router.back()}>
            <Text variant="button" color={Colors.textMuted}>
              Cancel
            </Text>
          </StyledPressable>
          <Text variant="title" color={Colors.textPrimary}>
            Add Homework
          </Text>
          <StyledPressable onPress={handleSave} disabled={!isValid}>
            <Text
              variant="button"
              color={isValid ? Colors.primary : Colors.textMuted}
            >
              Save
            </Text>
          </StyledPressable>
        </Stack>
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
            placeholder="e.g. Chapter 5 exercises"
            value={title}
            onChangeText={(value) => {
              setTitle(value);
              if (!touched.title) setTouched((s) => ({ ...s, title: true }));
            }}
            fontSize={15}
            borderRadius={12}
            autoFocus
            returnKeyType="next"
          />
          {titleError ? (
            <Text variant="caption" color={Colors.error}>
              {titleError}
            </Text>
          ) : null}
        </Stack>

        {/* Description */}
        <Stack gap={6} marginBottom={16}>
          <Text variant="overline" color={Colors.textMuted}>
            NOTES (OPTIONAL)
          </Text>
          <StyledTextInput
            variant="filled"
            placeholder="Any details..."
            value={desc}
            onChangeText={setDesc}
            fontSize={14}
            borderRadius={12}
            multiline
            numberOfLines={3}
            returnKeyType="next"
          />
        </Stack>

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
            onPress={() => dismissKeyboardThenOpen(() => setShowSubjects(true))}
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

        {/* Due date */}
        <Stack gap={6} marginBottom={16}>
          <Text variant="overline" color={Colors.textMuted}>
            DUE DATE
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
              📅 {format(dueDate, "EEE, MMM d, yyyy")}
            </Text>
            <Text variant="body" color={Colors.textMuted}>
              ›
            </Text>
          </StyledPressable>
        </Stack>
      </ScrollView>

      {/* Subject picker modal — no TextInput inside, unaffected by the
          Modal+keyboard bug, so this can stay a Modal. */}
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

      {/* Date picker modal — same reasoning, stays a Modal. */}
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
                  Due date
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
                  value={dueDate}
                  onChange={setDueDate}
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
    </StyledPage>
  );
}

// ─── Subject picker ───────────────────────────────────────────────────────────
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
              Select subject
            </Text>
            <Stack width={60} />
          </Stack>
          <ScrollView contentContainerStyle={{ paddingVertical: 8 }}>
            {/* None option */}
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
