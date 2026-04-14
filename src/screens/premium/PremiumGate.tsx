import React from 'react'
import { router } from 'expo-router'
import { Stack, StyledText, StyledPressable } from 'fluent-styles'
import { useColors } from '../../constants'
import { usePremium } from '../../hooks/usePremium'

interface PremiumGateProps {
  /** Feature name shown in the lock panel */
  feature:      string
  /** Short description below the feature name */
  description?: string
  /** Children shown when the user is premium */
  children:     React.ReactNode
  /** Compact inline banner instead of full centred overlay */
  compact?:     boolean
}

/**
 * Wraps any UI section. Renders children when premium is active,
 * otherwise shows a lock panel with an Upgrade button.
 *
 * Usage:
 *   <PremiumGate feature="Unlimited subjects">
 *     <AddSubjectButton />
 *   </PremiumGate>
 */
export const PremiumGate: React.FC<PremiumGateProps> = ({
  feature, description, children, compact = false,
}) => {
  const Colors = useColors()
  const { isPremium } = usePremium()

  if (isPremium) return <>{children}</>

  if (compact) {
    return (
      <Stack
        horizontal alignItems="center" gap={12}
        paddingVertical={12} paddingHorizontal={16}
        borderRadius={14}
        backgroundColor={Colors.bgMuted}
        borderWidth={1} borderColor={Colors.border}
      >
        <StyledText fontSize={18}>⚡</StyledText>
        <Stack flex={1} gap={2}>
          <StyledText fontSize={13} fontWeight="700" color={Colors.textPrimary}>
            {feature}
          </StyledText>
          {description && (
            <StyledText fontSize={12} color={Colors.textMuted}>{description}</StyledText>
          )}
        </Stack>
        <StyledPressable
          paddingVertical={8} paddingHorizontal={14}
          borderRadius={20} backgroundColor="#6366F1"
          onPress={() => router.push('/premium' as any)}
        >
          <StyledText fontSize={12} fontWeight="700" color="#fff">Upgrade</StyledText>
        </StyledPressable>
      </Stack>
    )
  }

  return (
    <Stack
      alignItems="center" justifyContent="center" gap={12}
      paddingVertical={32} paddingHorizontal={24}
      borderRadius={20}
      backgroundColor={Colors.bgCard}
      borderWidth={1} borderColor={Colors.border}
      borderStyle="dashed"
    >
      <Stack
        width={52} height={52} borderRadius={26}
        backgroundColor="#6366F115"
        alignItems="center" justifyContent="center"
      >
        <StyledText fontSize={24}>🔒</StyledText>
      </Stack>
      <Stack alignItems="center" gap={4}>
        <StyledText fontSize={16} fontWeight="800" color={Colors.textPrimary}>
          {feature}
        </StyledText>
        {description && (
          <StyledText fontSize={13} color={Colors.textMuted} textAlign="center">
            {description}
          </StyledText>
        )}
      </Stack>
      <StyledPressable
        paddingVertical={12} paddingHorizontal={28}
        borderRadius={24} backgroundColor="#6366F1"
        onPress={() => router.push('/premium' as any)}
        style={{
          shadowColor:   '#6366F1',
          shadowOffset:  { width: 0, height: 4 },
          shadowOpacity: 0.3,
          shadowRadius:  8,
          elevation:     4,
        }}
      >
        <StyledText fontSize={14} fontWeight="700" color="#fff">
          Unlock with Premium ⚡
        </StyledText>
      </StyledPressable>
    </Stack>
  )
}

/**
 * Inline banner shown at the top of a screen to nudge free users.
 * Renders nothing when the user is already premium.
 */
export const PremiumBanner: React.FC<{
  message:  string
  subtext?: string
}> = ({ message, subtext }) => {
  const Colors = useColors()
  const { isPremium } = usePremium()

  if (isPremium) return null

  return (
    <StyledPressable
      horizontal alignItems="center" gap={12}
      marginHorizontal={16} marginBottom={12}
      paddingVertical={12} paddingHorizontal={16}
      borderRadius={16}
      backgroundColor="#6366F115"
      borderWidth={1} borderColor="#6366F130"
      onPress={() => router.push('/premium' as any)}
    >
      <StyledText fontSize={20}>⚡</StyledText>
      <Stack flex={1} gap={2}>
        <StyledText fontSize={13} fontWeight="700" color="#6366F1">{message}</StyledText>
        {subtext && (
          <StyledText fontSize={11} color={Colors.textMuted}>{subtext}</StyledText>
        )}
      </Stack>
      <StyledText fontSize={13} fontWeight="700" color="#6366F1">→</StyledText>
    </StyledPressable>
  )
}
