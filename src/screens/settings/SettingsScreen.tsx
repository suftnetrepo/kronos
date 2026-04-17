import React, { useCallback, useState, useEffect } from "react";
import { ScrollView } from "react-native";
import { ShareIcon, ImportIcon } from "../../icons/timetable";
import { BoltIcon, RefreshIcon, TrashIcon, BeakerIcon, UndoIcon, LockIcon } from "../../icons/ui";
import { GraduationCapIcon } from "../../icons/navigation";
import { router, useFocusEffect } from "expo-router";
import {
  Stack,
  StyledText,
  StyledPressable,
  StyledCard,
  StyledDivider,
  Checkmark,
  theme,
  StyledPage,
  Switch,
} from "fluent-styles";
import {
  dialogueService,
  toastService,
  loaderService,
  actionSheetService,
} from "fluent-styles";
import { Text } from "../../components";
import { useColors, THEMES } from "../../constants";
import { THEME_META } from "../../constants/themes";
import { THEME_ICONS } from "../../constants/icons";
import type { ThemeKey } from "../../constants";
import { useThemeStore, useAppStore } from "../../stores";
import { useSettings } from "../../hooks/useSettings";
import { usePremium } from "../../hooks/usePremium";
import { PREMIUM_THEMES } from "../../constants/premium";
import { clearEntitlement } from "../../services/premiumService";
import { db } from "../../db";
import { subjects, homework, exams, settings } from "../../db/schema";
import { ShareTimetableContent } from "../timetable/ShareTimetableContent";
import { ImportTimetableContent } from "../timetable/ImportTimetableContent";
import {
  cancelAllReminders,
  forceResyncAllReminders,
} from "../../services/notificationService";
import {
  getLastImport,
  performUndoImport,
} from "../../services/timetableShareService";

const SectionHeader: React.FC<{ label: string }> = ({ label }) => {
  const Colors = useColors();
  return (
    <Text
      variant="overline"
      color={Colors.textMuted}
      paddingHorizontal={20}
      paddingTop={24}
      paddingBottom={8}
    >
      {label}
    </Text>
  );
};

export default function SettingsScreen() {
  const Colors = useColors();
  const { themeKey, setTheme } = useThemeStore();
  const { invalidateData } = useAppStore();
  const premium = usePremium();
  const appSettings = useSettings();
  const [hasRecentImport, setHasRecentImport] = useState(false);

  // Check for recent import whenever screen comes into focus
  useFocusEffect(
    useCallback(() => {
      const lastImport = getLastImport();
      setHasRecentImport(lastImport !== null);
    }, []),
  );

  // ── Validate theme access whenever premium status changes ─────────────────
  // If user becomes non-premium while using a premium theme, switch to free tier
  useEffect(() => {
    if (!premium.isPremium && PREMIUM_THEMES.includes(themeKey as any)) {
      console.log(
        `[SettingsScreen] Premium lost. Theme "${themeKey}" is no longer accessible. Switching to "indigo".`,
      );
      setTheme("indigo");
    }
  }, [premium.isPremium, themeKey, setTheme]);

  // ── Reminders toggle ───────────────────────────────────────────────────────
  const handleRemindersToggle = useCallback(
    (enabled: boolean) => {
      appSettings.setRemindersEnabled(enabled).catch((err) => {
        console.error("[SettingsScreen] Failed to toggle reminders:", err);
      });
    },
    [appSettings],
  );

  // ── Resync reminders (recovery for stale/missing IDs) ──────────────────────
  const handleResyncReminders = useCallback(async () => {
    const ok = await dialogueService.confirm({
      title: "Resync reminders?",
      message:
        "This will clear and reschedule all your class reminders. Use this if reminders become out of sync.",
      icon: "🔄",
      confirmLabel: "Resync",
    });
    if (!ok) return;

    const id = loaderService.show({ label: "Resyncing…", variant: "spinner" });
    try {
      const count = await forceResyncAllReminders();
      loaderService.hide(id);
      toastService.success(
        `Synced ${count} subjects`,
        count > 0 ? "Reminders rescheduled" : "No reminders to sync",
      );
    } catch (err: any) {
      loaderService.hide(id);
      toastService.error("Resync failed", err?.message);
    }
  }, []);

  // ── Theme press — gate non-free themes ──────────────────────────────────────
  const handleThemePress = useCallback(
    (key: ThemeKey) => {
      if (!premium.canUseTheme(key)) {
        router.push("/premium" as any);
        return;
      }
      setTheme(key);
    },
    [premium, setTheme],
  );

  // ── Share timetable ──────────────────────────────────────────────────────────
  const handleShare = useCallback(() => {
    actionSheetService.present(<ShareTimetableContent />, {
      title: "Share Timetable",
      theme: "light",
    });
  }, []);

  const handleImport = useCallback(() => {
    actionSheetService.present(<ImportTimetableContent onDone={() => {}} />, {
      title: "Import Timetable",
      theme: "light",
    });
  }, []);

  // ── Undo last import ───────────────────────────────────────────────────────
  const handleUndoImport = useCallback(async () => {
    const lastImport = getLastImport();
    if (!lastImport) {
      toastService.warning("Nothing to undo", "No recent import found");
      return;
    }

    const ok = await dialogueService.confirm({
      title: `Undo import?`,
      message: `This will remove the ${lastImport.subjectIds.length} subject${lastImport.subjectIds.length !== 1 ? "s" : ""} you just imported. Homework and exams associated with these subjects will also be deleted.`,
      icon: "↩️",
      confirmLabel: "Undo",
      destructive: true,
    });
    if (!ok) return;

    const id = loaderService.show({ label: "Undoing…", variant: "spinner" });
    try {
      const deletedCount = await performUndoImport(
        lastImport.id,
        db,
        subjects,
        toastService,
      );
      loaderService.hide(id);
      invalidateData();
      toastService.success(
        `Undid import of ${deletedCount} subject${deletedCount !== 1 ? "s" : ""}`,
      );
    } catch (err: any) {
      loaderService.hide(id);
      toastService.error("Undo failed", err?.message ?? "Something went wrong");
    }
  }, [invalidateData]);

  // ── Clear all data ───────────────────────────────────────────────────────────
  const handleClearAll = useCallback(async () => {
    const ok = await dialogueService.confirm({
      title: "Clear all data?",
      message:
        "This will permanently delete all subjects, homework, exams and settings. This cannot be undone.",
      icon: "⚠️",
      confirmLabel: "Delete everything",
      destructive: true,
    });
    if (!ok) return;

    try {
      await loaderService.wrap(
        async () => {
          await cancelAllReminders();
          await db.delete(exams);
          await db.delete(homework);
          await db.delete(subjects);
          await db.delete(settings);
          await db.insert(settings).values({
            id: "singleton",
            firstDayOfWeek: "MON",
            updatedAt: new Date(),
          });
        },
        { label: "Clearing…", variant: "spinner" },
      );
      invalidateData();
      toastService.success("All data cleared");
    } catch (err: any) {
      toastService.error("Failed to clear", err?.message);
    }
  }, [invalidateData]);

  // ── Dev: reset premium entitlement ──────────────────────────────────────────
  const handleResetPremium = useCallback(async () => {
    const ok = await dialogueService.confirm({
      title: "Reset premium?",
      message:
        "This will remove your premium entitlement so you can test the paywall again.",
      icon: "🧪",
      confirmLabel: "Reset",
      destructive: true,
    });
    if (!ok) return;

    // Clear entitlement from storage
    await clearEntitlement();

    // Refresh premium state (will reflect cleared entitlement)
    await premium.refresh();

    // CRITICAL: Re-validate theme access with the NEW premium state.
    // After refresh(), premium.isPremium is now false, so canUseTheme(premiumTheme) = false.
    // If current active theme is premium-only, switch to the free tier default.
    if (PREMIUM_THEMES.includes(themeKey as any)) {
      console.log(
        `[SettingsScreen] Active theme "${themeKey}" is premium-only. Switching to "indigo".`,
      );
      setTheme("indigo");
    }

    toastService.info("Premium reset", "You are now on the free tier");
  }, [premium, themeKey, setTheme]);

  return (
    <StyledPage flex={1} backgroundColor={Colors.bg}>
      <StyledPage.Header
        paddingHorizontal={4}
        paddingVertical={8}
        marginHorizontal={16}
        borderRadius={8}
        backArrowProps={{ onPress: () => router.back() }}
        shapeProps={{
          size: 40,
          backgroundColor: Colors.bgCard,
          borderColor: Colors.border,
          borderWidth: 0.5,
        }}
        title="Settings"
        titleAlignment="left"
        titleProps={{
          color: Colors.textPrimary,
          fontSize : 20,
          fontWeight: "700",
          fontFamily: "PlusJakartaSans_700Bold",
        }}
      />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
        {/* ── Premium banner / badge ────────────────────────────────── */}
        {!premium.isPremium ? (
          <StyledPressable
            marginHorizontal={16}
            marginTop={16}
            marginBottom={4}
            borderRadius={20}
            overflow="hidden"
            onPress={() => router.push("/premium" as any)}
          >
            <Stack
              paddingVertical={18}
              paddingHorizontal={20}
              borderRadius={20}
              backgroundColor={Colors.primary}
            >
              <Stack
                horizontal
                alignItems="center"
                justifyContent="space-between"
              >
                <Stack gap={4}>
                  <Stack horizontal alignItems="center" gap={8}>
                    <BoltIcon size={20} color={Colors.white} strokeWidth={2.5} />
                    <Text variant="title" color={Colors.white}>
                      Upgrade to Premium
                    </Text>
                  </Stack>
                  <Text variant="bodySmall" color={Colors.white + "CC"}>
                    Unlimited everything · All themes
                  </Text>
                </Stack>
                <Stack
                  paddingVertical={8}
                  paddingHorizontal={16}
                  borderRadius={20}
                  backgroundColor={Colors.white + "33"}
                >
                  <Text variant="button" color={Colors.white}>
                    View →
                  </Text>
                </Stack>
              </Stack>
            </Stack>
          </StyledPressable>
        ) : (
          <Stack
            marginHorizontal={16}
            marginTop={16}
            marginBottom={4}
            paddingVertical={14}
            paddingHorizontal={20}
            borderRadius={20}
            backgroundColor={Colors.primary + "15"}
            borderWidth={1}
            borderColor={Colors.primary + "30"}
            horizontal
            alignItems="center"
            gap={12}
          >
            <BoltIcon size={24} color={Colors.primary} strokeWidth={2} />
            <Stack flex={1}>
              <Text variant="subtitle" color={Colors.primary}>
                Kronos Premium
              </Text>
              <Text variant="bodySmall" color={Colors.textMuted}>
                {premium.plan === "lifetime"
                  ? "Lifetime access"
                  : `${premium.plan} subscription`}
              </Text>
            </Stack>
            <Text variant="metric" color={Colors.primary}>
              ✓
            </Text>
          </Stack>
        )}

        {/* ── Appearance (Vertical Theme Tiles) ─────────────────────── */}
        <SectionHeader label="Appearance" />
        <Stack marginHorizontal={16} gap={6}>
          {(Object.keys(THEME_META) as ThemeKey[]).map((key) => {
            const meta = THEME_META[key];
            const theme = THEMES[key];
            const active = themeKey === key;
            const locked = !premium.canUseTheme(key);

            return (
              <StyledPressable
                key={key}
                flexDirection="column"
                gap={4}
                paddingVertical={14}
                paddingHorizontal={16}
                borderRadius={16}
                borderWidth={2}
                borderColor={active ? theme.primary : Colors.border}
                backgroundColor={active ? theme.accent + "30" : Colors.bgCard}
                opacity={locked ? 0.6 : 1}
                onPress={() => handleThemePress(key)}
              >
                {/* Top: Label + description + checkmark/lock */}
                <Stack flexDirection="row" alignItems="flex-start" gap={10}>
                  {/* Label + description */}
                  <Stack flex={1} gap={2}>
                    <Stack horizontal alignItems="center" gap={6}>
                      {React.createElement(THEME_ICONS[key], {
                        size: 18,
                        color: active ? theme.primary : Colors.textPrimary,
                        strokeWidth: 2,
                      })}
                      <Text
                        variant="subtitle"
                        color={active ? theme.primary : Colors.textPrimary}
                      >
                        {meta.label}
                      </Text>
                    </Stack>
                    <Text variant="bodySmall" color={Colors.textMuted}>
                      {meta.description}
                    </Text>
                  </Stack>

                  {/* Bottom: Colour swatches */}
                  <Stack horizontal gap={4}>
                    {meta.preview.map((c: string, i: number) => (
                      <Stack
                        key={i}
                        width={18}
                        height={18}
                        borderRadius={9}
                        backgroundColor={c}
                        borderWidth={1}
                        borderColor="rgba(0,0,0,0.08)"
                      />
                    ))}
                  </Stack>
                  {/* Active checkmark OR premium lock */}
                  {active ? (
                    <Stack
                      width={24}
                      height={24}
                      borderRadius={12}
                      backgroundColor={theme.primary}
                      alignItems="center"
                      justifyContent="center"
                    >
                      <Checkmark size={12} color={Colors.white} strokeWidth={2.5} />
                    </Stack>
                  ) : locked ? (
                    <Stack
                      width={24}
                      height={24}
                      borderRadius={12}
                      backgroundColor={Colors.bgMuted}
                      alignItems="center"
                      justifyContent="center"
                    >
                      <LockIcon size={12} color={Colors.textMuted} strokeWidth={2} />
                    </Stack>
                  ) : null}
                </Stack>
              </StyledPressable>
            );
          })}
        </Stack>

        {/* ── Reminders ─────────────────────────────────────────────── */}
        <SectionHeader label="Reminders" />
        <StyledCard
          shadow="light"
          marginHorizontal={16}
          borderRadius={16}
          backgroundColor={Colors.bgCard}
          borderWidth={1}
          borderColor={Colors.border}
          overflow="hidden"
        >
          <Stack
            horizontal
            alignItems="center"
            gap={14}
            paddingHorizontal={20}
            paddingVertical={14}
          >
            <Stack flex={1} gap={2}>
              <Text variant="subtitle" color={Colors.textPrimary}>
                Enable reminders
              </Text>
              <Text variant="bodySmall" color={Colors.textMuted}>
                Get notified before your classes
              </Text>
            </Stack>
            <Switch
              value={appSettings.remindersEnabled}
              onChange={handleRemindersToggle}
            />
          </Stack>
          <StyledDivider height={0.3} borderBottomColor={Colors.border} />
          <StyledPressable
            flexDirection="row"
            alignItems="center"
            gap={14}
            paddingHorizontal={20}
            paddingVertical={14}
            onPress={handleResyncReminders}
          >
            <RefreshIcon size={24} color={Colors.textPrimary} strokeWidth={2} />
            <Stack flex={1} gap={2}>
              <Text variant="subtitle" color={Colors.textPrimary}>
                Resync reminders
              </Text>
              <Text variant="bodySmall" color={Colors.textMuted}>
                Fix missing or duplicate reminders
              </Text>
            </Stack>
            <StyledText fontSize={16} color={Colors.textMuted}>
              ›
            </StyledText>
          </StyledPressable>
        </StyledCard>

        {/* ── Timetable ─────────────────────────────────────────────── */}
        <SectionHeader label="Timetable" />
        <StyledCard
          shadow="light"
          marginHorizontal={16}
          borderRadius={16}
          backgroundColor={Colors.bgCard}
          borderWidth={1}
          borderColor={Colors.border}
          overflow="hidden"
        >
          <StyledPressable
            flexDirection="row"
            alignItems="center"
            gap={14}
            paddingHorizontal={20}
            paddingVertical={14}
            onPress={handleShare}
          >
            <Stack
              width={36}
              height={36}
              borderRadius={10}
              backgroundColor={Colors.primary + "15"}
              alignItems="center"
              justifyContent="center"
            >
              <ShareIcon size={18} color={Colors.primary} strokeWidth={2} />
            </Stack>
            <Stack flex={1} gap={2}>
              <Text variant="subtitle" color={Colors.textPrimary}>
                Share timetable
              </Text>
              <Text variant="bodySmall" color={Colors.textMuted}>
                Send your schedule to a classmate
              </Text>
            </Stack>
            <StyledText fontSize={16} color={Colors.textMuted}>
              ›
            </StyledText>
          </StyledPressable>
          <StyledDivider height={0.3} borderBottomColor={Colors.border} />
          <StyledPressable
            flexDirection="row"
            alignItems="center"
            gap={14}
            paddingHorizontal={20}
            paddingVertical={14}
            onPress={handleImport}
          >
            <Stack
              width={36}
              height={36}
              borderRadius={10}
              backgroundColor={Colors.primary + "15"}
              alignItems="center"
              justifyContent="center"
            >
              <ImportIcon size={18} color={Colors.primary} strokeWidth={2} />
            </Stack>
            <Stack flex={1} gap={2}>
              <Text variant="subtitle" color={Colors.textPrimary}>
                Import timetable
              </Text>
              <Text variant="bodySmall" color={Colors.textMuted}>
                Add subjects from a classmate's code or file
              </Text>
            </Stack>
            <StyledText fontSize={16} color={Colors.textMuted}>
              ›
            </StyledText>
          </StyledPressable>

          {/* Undo last import (only shown if recent import exists) */}
          {hasRecentImport && (
            <>
              <StyledDivider borderBottomColor={Colors.border} />
              <StyledPressable
                flexDirection="row"
                alignItems="center"
                gap={14}
                paddingHorizontal={20}
                paddingVertical={14}
                onPress={handleUndoImport}
              >
                <Stack
                  width={36}
                  height={36}
                  borderRadius={10}
                  backgroundColor={Colors.error + "15"}
                  alignItems="center"
                  justifyContent="center"
                >
                  <UndoIcon size={20} color={Colors.error} strokeWidth={2} />
                </Stack>
                <Stack flex={1} gap={2}>
                  <Text variant="subtitle" color={Colors.error}>
                    Undo last import
                  </Text>
                  <Text variant="bodySmall" color={Colors.textMuted}>
                    Remove subjects added by your most recent import
                  </Text>
                </Stack>
                <StyledText fontSize={16} color={Colors.textMuted}>
                  ›
                </StyledText>
              </StyledPressable>
            </>
          )}
        </StyledCard>

        {/* ── About ─────────────────────────────────────────────────── */}
        <SectionHeader label="About" />
        <StyledCard
          shadow="light"
          marginHorizontal={16}
          borderRadius={16}
          backgroundColor={Colors.bgCard}
          borderWidth={1}
          borderColor={Colors.border}
          overflow="hidden"
        >
          <Stack
            horizontal
            alignItems="center"
            gap={14}
            paddingHorizontal={20}
            paddingVertical={14}
          >
            <BoltIcon size={24} color={Colors.primary} strokeWidth={2} />
            <Text
              flex={1}
              variant="subtitle"
              color={Colors.textPrimary}
            >
              Kronos
            </Text>
            <Text variant="body" color={Colors.textMuted}>
              v1.0.0
            </Text>
          </Stack>
          <StyledDivider height={0.3} borderBottomColor={Colors.border} />
          <Stack
            horizontal
            alignItems="center"
            gap={14}
            paddingHorizontal={20}
            paddingVertical={14}
          >
            <GraduationCapIcon size={24} color={Colors.textPrimary} strokeWidth={2} />
            <Text
              flex={1}
              variant="subtitle"
              color={Colors.textPrimary}
            >
              Student timetable
            </Text>
            <Text variant="body" color={Colors.textMuted}>
              free
            </Text>
          </Stack>
        </StyledCard>

        {/* ── Danger zone ───────────────────────────────────────────── */}
        <SectionHeader label="Danger Zone" />
        <StyledCard
          shadow="light"
          marginHorizontal={16}
          borderRadius={16}
          backgroundColor={Colors.bgCard}
          borderWidth={1}
          borderColor={Colors.border}
          overflow="hidden"
        >
          <StyledPressable
            flexDirection="row"
            alignItems="center"
            gap={14}
            paddingHorizontal={20}
            paddingVertical={14}
            onPress={handleClearAll}
          >
            <TrashIcon size={24} color={Colors.error} strokeWidth={2} />
            <Text
              flex={1}
              variant="subtitle"
              color={Colors.error}
            >
              Clear all data
            </Text>
          </StyledPressable>

          {/* Dev-only reset row */}
          {__DEV__ && (
            <>
              <StyledDivider height={0.3} borderBottomColor={Colors.border} />
              <StyledPressable
                flexDirection="row"
                alignItems="center"
                gap={14}
                paddingHorizontal={20}
                paddingVertical={14}
                onPress={handleResetPremium}
              >
                <BeakerIcon size={24} color={Colors.warning} strokeWidth={2} />
                <Text
                  flex={1}
                  variant="subtitle"
                  color={Colors.warning}
                >
                  Reset premium (dev)
                </Text>
              </StyledPressable>
            </>
          )}
        </StyledCard>
      </ScrollView>
    </StyledPage>
  );
}
