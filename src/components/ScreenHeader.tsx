import React from 'react'
import { Stack, StyledPressable } from 'fluent-styles'
import Svg, { Path } from 'react-native-svg'
import { Text } from './text'
import { useColors } from '../constants'

type Props = {
  onBack: () => void
  actionLabel?: string
  onAction?: () => void
  title?: string
  subtitle?: string
  centered?: boolean
}

function BackArrow({ color, size = 19 }: { color: string; size?: number }) {
  return <Svg width={size} height={size} viewBox="0 0 24 24" fill="none"><Path d="M15 18l-6-6 6-6" stroke={color} strokeWidth={2.25} strokeLinecap="round" strokeLinejoin="round" /></Svg>
}

export function ScreenHeader({ onBack, actionLabel, onAction, title, subtitle, centered = false }: Props) {
  const C = useColors()
  return <Stack minHeight={48} flexDirection="row" alignItems="center" justifyContent="space-between">
    <StyledPressable
      width={44} height={44} alignItems="center" justifyContent="center"
      onPress={onBack} accessibilityRole="button" accessibilityLabel="Go back"
    >
      <Stack width={38} height={38} borderRadius={19} alignItems="center" justifyContent="center" backgroundColor={C.bgCard} borderWidth={1} borderColor={C.border}>
        <BackArrow color={C.textPrimary} />
      </Stack>
    </StyledPressable>
    {title ? <Stack position={centered ? 'absolute' : undefined} left={centered ? 56 : undefined} right={centered ? 56 : undefined} alignItems={centered ? 'center' : 'flex-start'} pointerEvents="none">
      <Text variant="header" fontSize={25} color={C.textPrimary}>{title}</Text>
      {subtitle ? <Text variant="caption" color={C.textMuted} marginTop={1}>{subtitle}</Text> : null}
    </Stack> : <Stack flex={1} />}
    {actionLabel && onAction ? <StyledPressable minWidth={56} height={44} paddingLeft={12} alignItems="flex-end" justifyContent="center" onPress={onAction} accessibilityRole="button" accessibilityLabel={actionLabel}><Text variant="label" color={C.primary}>{actionLabel}</Text></StyledPressable> : <Stack width={44} />}
  </Stack>
}
