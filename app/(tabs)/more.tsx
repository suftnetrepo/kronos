import React from 'react'
import { ScrollView } from 'react-native'
import { Stack, StyledPressable, StyledPage } from 'fluent-styles'
import { useRouter } from 'expo-router'
import { Text, PremiumIcon } from '../../src/components'
import { SettingsIcon } from '../../src/icons/navigation'
import { BoltIcon } from '../../src/icons/ui'
import { useColors } from '../../src/constants'

export default function More() {
  const C = useColors()
  const r = useRouter()

  const row = (icon: React.ReactNode, title: string, sub: string, onPress: () => void) => (
    <StyledPressable onPress={onPress}>
      <Stack flexDirection="row" alignItems="center" padding={14} borderRadius={16} backgroundColor={C.bgCard} borderWidth={1} borderColor={C.border} marginBottom={9}>
        <Stack width={38} height={38} borderRadius={12} alignItems="center" justifyContent="center" backgroundColor={C.primary + '12'}>{icon}</Stack>
        <Stack flex={1} marginLeft={12}>
          <Text variant="label" color={C.textPrimary}>{title}</Text>
          <Text variant="caption" color={C.textSecondary}>{sub}</Text>
        </Stack>
        <PremiumIcon name="chevron" size={16} color={C.textMuted} />
      </Stack>
    </StyledPressable>
  )

  return (
    <StyledPage flex={1} backgroundColor={C.bg}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 180 }}>
        <Stack marginTop={18} marginBottom={20}>
          <Text variant="header" color={C.textPrimary}>More</Text>
          <Text variant="bodySmall" color={C.textSecondary}>Academic tools, personalisation and your data.</Text>
        </Stack>

        {/* Planning surfaces — Timetable and Calendar carry equal weight;
            Calendar has no other entry point in the app, see the product audit. */}
        <Text variant="overline" color={C.textMuted} marginBottom={9}>PLANNING</Text>
        {row(<PremiumIcon name="clock" size={17} color={C.primary} />, 'Timetable', 'Day and week schedule', () => r.push('/timetable' as any))}
        {row(<PremiumIcon name="calendar" size={17} color={C.primary} />, 'Academic Calendar', 'Classes, tasks and exams in one view', () => r.push('/calendar' as any))}

        <Text variant="overline" color={C.textMuted} marginTop={13} marginBottom={9}>PREFERENCES</Text>
        {row(<SettingsIcon size={17} color={C.primary} />, 'Settings', 'Appearance, notifications, backup and security', () => r.push('/settings' as any))}
        {row(<BoltIcon size={17} color={C.primary} strokeWidth={2.2} />, 'Kronos Premium', 'Unlock advanced productivity features', () => r.push('/premium' as any))}
      </ScrollView>
    </StyledPage>
  )
}
