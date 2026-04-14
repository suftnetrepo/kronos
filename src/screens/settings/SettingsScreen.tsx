import React, { useCallback } from 'react'
import { ScrollView } from 'react-native'
import { ShareIcon, ImportIcon } from '../../icons/timetable'
import { router } from 'expo-router'
import {
  Stack, StyledText, StyledPressable, StyledCard,
  StyledDivider, Checkmark,
  theme,
  StyledPage,
} from 'fluent-styles'
import { dialogueService, toastService, loaderService, actionSheetService } from 'fluent-styles'
import { useColors, THEMES, THEME_META } from '../../constants'
import type { ThemeKey } from '../../constants'
import { useThemeStore, useAppStore } from '../../stores'
import { usePremium } from '../../hooks/usePremium'
import { PREMIUM_THEMES } from '../../constants/premium'
import { clearEntitlement } from '../../services/premiumService'
import { db } from '../../db'
import { subjects, homework, exams, settings } from '../../db/schema'
import { ShareTimetableContent } from '../timetable/ShareTimetableContent'
import { ImportTimetableContent } from '../timetable/ImportTimetableContent'
import { cancelAllReminders } from '../../services/notificationService'

const SectionHeader: React.FC<{ label: string }> = ({ label }) => {
  const Colors = useColors()
  return (
    <StyledText
      fontSize={14} fontWeight="700" color={Colors.textMuted}
      letterSpacing={1} paddingHorizontal={20} paddingTop={24} paddingBottom={8}>
      {label}
    </StyledText>
  )
}

export default function SettingsScreen() {
  const Colors  = useColors()
  const { themeKey, setTheme } = useThemeStore()
  const { invalidateData }     = useAppStore()
  const premium                = usePremium()

  // ── Theme press — gate non-free themes ──────────────────────────────────────
  const handleThemePress = useCallback((key: ThemeKey) => {
    if (!premium.canUseTheme(key)) {
      router.push('/premium' as any)
      return
    }
    setTheme(key)
  }, [premium, setTheme])

  // ── Share timetable ──────────────────────────────────────────────────────────
  const handleShare = useCallback(() => {
    actionSheetService.present(
      <ShareTimetableContent />,
      { title: 'Share Timetable', theme: 'light' },
    )
  }, [])

  const handleImport = useCallback(() => {
    actionSheetService.present(
      <ImportTimetableContent onDone={() => {}} />,
      { title: 'Import Timetable', theme: 'light' },
    )
  }, [])

  // ── Clear all data ───────────────────────────────────────────────────────────
  const handleClearAll = useCallback(async () => {
    const ok = await dialogueService.confirm({
      title:        'Clear all data?',
      message:      'This will permanently delete all subjects, homework, exams and settings. This cannot be undone.',
      icon:         '⚠️',
      confirmLabel: 'Delete everything',
      destructive:  true,
    })
    if (!ok) return

    try {
      await loaderService.wrap(
        async () => {
          await cancelAllReminders()
          await db.delete(exams)
          await db.delete(homework)
          await db.delete(subjects)
          await db.delete(settings)
          await db.insert(settings).values({
            id:             'singleton',
            firstDayOfWeek: 'MON',
            updatedAt:      new Date(),
          })
        },
        { label: 'Clearing…', variant: 'spinner' },
      )
      invalidateData()
      toastService.success('All data cleared')
    } catch (err: any) {
      toastService.error('Failed to clear', err?.message)
    }
  }, [invalidateData])

  // ── Dev: reset premium entitlement ──────────────────────────────────────────
  const handleResetPremium = useCallback(async () => {
    const ok = await dialogueService.confirm({
      title:        'Reset premium?',
      message:      'This will remove your premium entitlement so you can test the paywall again.',
      icon:         '🧪',
      confirmLabel: 'Reset',
      destructive:  true,
    })
    if (!ok) return
    await clearEntitlement()
    await premium.refresh()
    // If current theme is premium, reset to indigo
    if (PREMIUM_THEMES.includes(themeKey as any)) setTheme('indigo')
    toastService.info('Premium reset', 'You are now on the free tier')
  }, [premium, themeKey, setTheme])

  return (
     <StyledPage flex={1} backgroundColor={Colors.bg}>
      <StyledPage.Header
        paddingHorizontal={4}
        backgroundColor={theme.colors.gray[1]}
        paddingVertical={8}
        marginHorizontal={16}
        borderRadius={30}
        showBackArrow
        backArrowProps={{ onPress: () => router.back() }}
        shapeProps={{
          size: 40,
          backgroundColor: theme.colors.gray[1],
          borderColor: theme.colors.gray[300],
          borderWidth: 0.5,
        }}
        title="Settings"
        titleAlignment="left"
        
      />

      <ScrollView contentContainerStyle={{ paddingBottom: 120 }}>

        {/* ── Premium banner / badge ────────────────────────────────── */}
        {!premium.isPremium ? (
          <StyledPressable
            marginHorizontal={16} marginTop={16} marginBottom={4}
            borderRadius={20} overflow="hidden"
            onPress={() => router.push('/premium' as any)}
          >
            <Stack
              paddingVertical={18} paddingHorizontal={20}
              borderRadius={20} backgroundColor="#6366F1"
            >
              <Stack horizontal alignItems="center" justifyContent="space-between">
                <Stack gap={4}>
                  <Stack horizontal alignItems="center" gap={8}>
                    <StyledText fontSize={20}>⚡</StyledText>
                    <StyledText fontSize={16} fontWeight="800" color="#fff">
                      Upgrade to Premium
                    </StyledText>
                  </Stack>
                  <StyledText fontSize={12} color="rgba(255,255,255,0.8)">
                    Unlimited everything · All themes
                  </StyledText>
                </Stack>
                <Stack
                  paddingVertical={8} paddingHorizontal={16}
                  borderRadius={20} backgroundColor="rgba(255,255,255,0.2)"
                >
                  <StyledText fontSize={13} fontWeight="700" color="#fff">View →</StyledText>
                </Stack>
              </Stack>
            </Stack>
          </StyledPressable>
        ) : (
          <Stack
            marginHorizontal={16} marginTop={16} marginBottom={4}
            paddingVertical={14} paddingHorizontal={20}
            borderRadius={20} backgroundColor="#6366F115"
            borderWidth={1} borderColor="#6366F130"
            horizontal alignItems="center" gap={12}
          >
            <StyledText fontSize={22}>⚡</StyledText>
            <Stack flex={1}>
              <StyledText fontSize={14} fontWeight="700" color="#6366F1">
                Kronos Premium
              </StyledText>
              <StyledText fontSize={12} color={Colors.textMuted}>
                {premium.plan === 'lifetime' ? 'Lifetime access' : `${premium.plan} subscription`}
              </StyledText>
            </Stack>
            <StyledText fontSize={18} color="#6366F1">✓</StyledText>
          </Stack>
        )}

        {/* ── Appearance ────────────────────────────────────────────── */}
        <SectionHeader label="Appearance" />
        <ScrollView
          horizontal showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, gap: 10, paddingBottom: 4 }}
        >
          {(Object.keys(THEME_META) as ThemeKey[]).map(key => {
            const meta     = THEME_META[key]
            const theme    = THEMES[key]
            const active   = themeKey === key
            const locked   = !premium.canUseTheme(key)

            return (
              <StyledPressable
                key={key}
                width={120}
                alignItems="center" gap={10}
                paddingVertical={18} paddingHorizontal={12}
                borderRadius={18} borderWidth={2}
                borderColor={active ? theme.primary : Colors.border}
                backgroundColor={active ? theme.accent : Colors.bgCard}
                opacity={locked ? 0.6 : 1}
                onPress={() => handleThemePress(key)}
              >
                {/* Colour swatches */}
                <Stack horizontal gap={5}>
                  {meta.preview.map((c: string, i: number) => (
                    <Stack key={i} width={20} height={20} borderRadius={10} backgroundColor={c} />
                  ))}
                </Stack>

                <StyledText fontSize={12} fontWeight="700"
                  color={active ? theme.primary : Colors.textMuted}>
                  {meta.emoji}  {meta.label}
                </StyledText>

                {/* Active checkmark OR premium lock */}
                {active ? (
                  <Stack width={22} height={22} borderRadius={11}
                    backgroundColor={theme.primary}
                    alignItems="center" justifyContent="center">
                    <Checkmark size={11} color="#fff" strokeWidth={3} />
                  </Stack>
                ) : locked ? (
                  <Stack width={22} height={22} borderRadius={11}
                    backgroundColor={Colors.bgMuted}
                    alignItems="center" justifyContent="center">
                    <StyledText fontSize={11}>🔒</StyledText>
                  </Stack>
                ) : null}
              </StyledPressable>
            )
          })}
        </ScrollView>

        {/* ── Timetable ─────────────────────────────────────────────── */}
        <SectionHeader label="Timetable" />
        <StyledCard
          shadow="light"
          marginHorizontal={16} borderRadius={16}
          backgroundColor={Colors.bgCard} borderWidth={1} borderColor={Colors.border}
          overflow="hidden">
          <StyledPressable
            flexDirection='row' alignItems="center" gap={14}
            paddingHorizontal={20} paddingVertical={14}
            onPress={handleShare}
          >
            <Stack
              width={36} height={36} borderRadius={10}
              backgroundColor={Colors.primary + '15'}
              alignItems="center" justifyContent="center"
            >
              <ShareIcon size={18} color={Colors.primary} strokeWidth={2} />
            </Stack>
            <Stack flex={1} gap={2}>
              <StyledText fontSize={15} fontWeight="600" color={Colors.textPrimary}>
                Share timetable
              </StyledText>
              <StyledText fontSize={12} color={Colors.textMuted}>
                Send your schedule to a classmate
              </StyledText>
            </Stack>
            <StyledText fontSize={16} color={Colors.textMuted}>›</StyledText>
          </StyledPressable>
          <StyledDivider borderBottomColor={Colors.border} />
          <StyledPressable
            flexDirection='row' alignItems="center" gap={14}
            paddingHorizontal={20} paddingVertical={14}
            onPress={handleImport}
          >
            <Stack
              width={36} height={36} borderRadius={10}
              backgroundColor={Colors.primary + '15'}
              alignItems="center" justifyContent="center"
            >
              <ImportIcon size={18} color={Colors.primary} strokeWidth={2} />
            </Stack>
            <Stack flex={1} gap={2}>
              <StyledText fontSize={15} fontWeight="600" color={Colors.textPrimary}>
                Import timetable
              </StyledText>
              <StyledText fontSize={12} color={Colors.textMuted}>
                Add subjects from a classmate's code or file
              </StyledText>
            </Stack>
            <StyledText fontSize={16} color={Colors.textMuted}>›</StyledText>
          </StyledPressable>
        </StyledCard>

        {/* ── About ─────────────────────────────────────────────────── */}
        <SectionHeader label="About" />
        <StyledCard
          shadow="light"
          marginHorizontal={16} borderRadius={16}
          backgroundColor={Colors.bgCard} borderWidth={1} borderColor={Colors.border}
          overflow="hidden">
          <Stack horizontal alignItems="center" gap={14}
            paddingHorizontal={20} paddingVertical={14}>
            <StyledText fontSize={22}>⚡</StyledText>
            <StyledText flex={1} fontSize={15} fontWeight="600" color={Colors.textPrimary}>
              Kronos
            </StyledText>
            <StyledText fontSize={14} color={Colors.textMuted}>v1.0.0</StyledText>
          </Stack>
          <StyledDivider borderBottomColor={Colors.border} />
          <Stack horizontal alignItems="center" gap={14}
            paddingHorizontal={20} paddingVertical={14}>
            <StyledText fontSize={22}>🎓</StyledText>
            <StyledText flex={1} fontSize={15} fontWeight="600" color={Colors.textPrimary}>
              Student timetable
            </StyledText>
            <StyledText fontSize={14} color={Colors.textMuted}>free</StyledText>
          </Stack>
        </StyledCard>

        {/* ── Danger zone ───────────────────────────────────────────── */}
        <SectionHeader label="Danger Zone" />
        <StyledCard
          shadow="light"
          marginHorizontal={16} borderRadius={16}
          backgroundColor={Colors.bgCard} borderWidth={1} borderColor={Colors.border}
          overflow="hidden">
          <StyledPressable
            flexDirection='row' alignItems="center" gap={14}
            paddingHorizontal={20} paddingVertical={14}
            onPress={handleClearAll}
          >
            <StyledText fontSize={22}>🗑️</StyledText>
            <StyledText flex={1} fontSize={15} fontWeight="600" color={Colors.error}>
              Clear all data
            </StyledText>
          </StyledPressable>

          {/* Dev-only reset row */}
          {__DEV__ && (
            <>
              <StyledDivider borderBottomColor={Colors.border} />
              <StyledPressable
                flexDirection='row' alignItems="center" gap={14}
                paddingHorizontal={20} paddingVertical={14}
                onPress={handleResetPremium}
              >
                <StyledText fontSize={22}>🧪</StyledText>
                <StyledText flex={1} fontSize={15} fontWeight="600" color={Colors.warning}>
                  Reset premium (dev)
                </StyledText>
              </StyledPressable>
            </>
          )}
        </StyledCard>

      </ScrollView>
    </StyledPage>
  )
}
