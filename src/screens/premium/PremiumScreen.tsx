import React, { useState } from 'react'
import { ScrollView } from 'react-native'
import { router } from 'expo-router'
import { Stack, StyledText, StyledPressable, StyledCard } from 'fluent-styles'
import { Text } from '../../components'
import { useColors } from '../../constants'
import { PREMIUM_FEATURES, PREMIUM_PRICING } from '../../constants/premium'
import { PREMIUM_FEATURE_ICONS, } from '../../constants/icons'
import { BoltIcon } from '../../icons/ui'
import { usePremium } from '../../hooks/usePremium'

type PlanKey = 'MONTHLY' | 'YEARLY' | 'ONE_TIME'

// ─── Feature row icon circles ──────────────────────────────────────────────────
const FeatureIconCircle: React.FC<{ index: number; colors: ReturnType<typeof useColors> }> = ({ index, colors }) => {
  const IconComponent = PREMIUM_FEATURE_ICONS[index]
  return (
    <Stack
      width={40} height={40} borderRadius={20}
      backgroundColor={colors.primary + '15'}
      alignItems="center" justifyContent="center"
    >
      {IconComponent && <IconComponent size={20} color={colors.primary} strokeWidth={2} />}
    </Stack>
  )
}

// ─── Main screen ───────────────────────────────────────────────────────────────
export default function PremiumScreen() {
  const Colors  = useColors()
  const premium = usePremium()

  const [selected,    setSelected]    = useState<PlanKey>('YEARLY')

  const handlePurchasePress = async () => {
    let success = false
    if (selected === 'MONTHLY')  success = await premium.buyMonthly()
    if (selected === 'YEARLY')   success = await premium.buyYearly()
    if (selected === 'ONE_TIME') success = await premium.buyLifetime()
    if (success) router.back()
  }

  // ── Already premium ──────────────────────────────────────────────────────────
  if (premium.isPremium) {
    return (
      <Stack flex={1} backgroundColor={Colors.bg}
        alignItems="center" justifyContent="center" gap={16} padding={32}>
        <BoltIcon size={48} color={Colors.primary} strokeWidth={1.5} />
        <Text variant="display" color={Colors.textPrimary} textAlign="center">
          You're on Premium
        </Text>
        <Text variant="body" color={Colors.textMuted} textAlign="center">
          {premium.plan === 'lifetime'
            ? 'Lifetime access — enjoy all features forever.'
            : `Your ${premium.plan} subscription is active.`}
        </Text>
        <StyledPressable
          marginTop={8} paddingVertical={14} paddingHorizontal={32}
          borderRadius={30} backgroundColor={Colors.primary}
          onPress={() => router.back()}
        >
          <Text variant="button" color="#fff">Back to Kronos</Text>
        </StyledPressable>
      </Stack>
    )
  }

  return (
    <Stack flex={1} backgroundColor={Colors.bg}>

      {/* Close button */}
      <Stack position="absolute" top={16} right={20} zIndex={10}>
        <StyledPressable
          width={32} height={32} borderRadius={16}
          backgroundColor={Colors.bgMuted}
          alignItems="center" justifyContent="center"
          onPress={() => router.back()}
        >
          <Text variant="button">✕</Text>
        </StyledPressable>
      </Stack>

      <ScrollView showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}>

        {/* ── Hero ──────────────────────────────────────────────────── */}
        <Stack alignItems="center" paddingHorizontal={24}
          paddingTop={20} paddingBottom={20}>
          <Stack horizontal alignItems="center" gap={10} marginBottom={6}>
            <Stack
              width={40} height={40} borderRadius={20}
              backgroundColor={Colors.primary + '18'}
              alignItems="center" justifyContent="center"
            >
              <BoltIcon size={20} color={Colors.primary} strokeWidth={2} />
            </Stack>
            <Text variant="header" color={Colors.textPrimary} letterSpacing={-0.5}>
              Kronos Premium
            </Text>
          </Stack>
          <Text variant="bodySmall" color={Colors.textMuted} textAlign="center">
            Unlock everything. No limits, no ads, no nonsense.
          </Text>
        </Stack>

        {/* ── Feature list ──────────────────────────────────────────── */}
        <StyledCard
          marginHorizontal={20} marginBottom={20}
          borderRadius={20} backgroundColor={Colors.bgCard}
          borderWidth={1} borderColor={Colors.border}
          paddingVertical={12} paddingHorizontal={16}
        >
          {PREMIUM_FEATURES.map((f, i) => (
            <Stack key={i}>
              <Stack horizontal alignItems="center" gap={12} paddingVertical={10}>
                <FeatureIconCircle index={i} colors={Colors} />
                <Stack flex={1} gap={1}>
                  <Text variant="subtitle" color={Colors.textPrimary}>
                    {f.title}
                  </Text>
                  <Text variant="bodySmall" color={Colors.textMuted}>
                    {f.description}
                  </Text>
                </Stack>
                <Text variant="button" color={Colors.primary}>✓</Text>
              </Stack>
              {i < PREMIUM_FEATURES.length - 1 && (
                <Stack height={1} backgroundColor={Colors.border} marginLeft={52} />
              )}
            </Stack>
          ))}
        </StyledCard>

        {/* ── Plan selector ─────────────────────────────────────────── */}
        <Stack paddingHorizontal={20} gap={10} marginBottom={20}>
          <Text variant="overline" color={Colors.textMuted} marginBottom={2}>
            CHOOSE YOUR PLAN
          </Text>

          {(['YEARLY', 'ONE_TIME', 'MONTHLY'] as PlanKey[]).map(key => {
            const p           = PREMIUM_PRICING[key]
            const active      = selected === key
            const isBestValue = key === 'ONE_TIME'

            return (
              <StyledPressable
                key={key}
                onPress={() => setSelected(key)}
                borderRadius={16} borderWidth={2}
                borderColor={active ? Colors.primary : Colors.border}
                backgroundColor={active ? Colors.primary + '10' : Colors.bgCard}
                paddingVertical={14} paddingHorizontal={16}
              >
                <Stack horizontal alignItems="center" gap={12}>

                  {/* Radio dot */}
                  <Stack
                    width={22} height={22} borderRadius={11}
                    borderWidth={2}
                    borderColor={active ? Colors.primary : Colors.textMuted}
                    alignItems="center" justifyContent="center"
                    flexShrink={0}
                  >
                    {active && (
                      <Stack width={11} height={11} borderRadius={6} backgroundColor={Colors.primary} />
                    )}
                  </Stack>

                  {/* Label + badges */}
                  <Stack flex={1} gap={2}>
                    <Stack horizontal alignItems="center" gap={6} flexWrap="wrap">
                      <Text variant="subtitle" color={Colors.textPrimary}>
                        {p.label}
                      </Text>
                      {'saving' in p && (
                        <Stack paddingHorizontal={7} paddingVertical={2}
                          borderRadius={6} backgroundColor={Colors.primary}>
                          <Text variant="caption" color="#fff">
                            {(p as any).saving}
                          </Text>
                        </Stack>
                      )}
                      {isBestValue && (
                        <Stack paddingHorizontal={7} paddingVertical={2}
                          borderRadius={6} backgroundColor={Colors.warning}>
                          <Text variant="caption" color="#fff">
                            BEST VALUE
                          </Text>
                        </Stack>
                      )}
                    </Stack>
                    {'trial' in p && (
                      <Text variant="subLabel" color={Colors.primary}>
                        {(p as any).trial}
                      </Text>
                    )}
                    {key === 'ONE_TIME' && (
                      <Text variant="bodySmall" color={Colors.textMuted}>
                        Pay once, use forever
                      </Text>
                    )}
                    {key === 'MONTHLY' && (
                      <Text variant="bodySmall" color={Colors.textMuted}>
                        Billed monthly, cancel anytime
                      </Text>
                    )}
                  </Stack>

                  {/* Price */}
                  <Stack alignItems="flex-end" gap={1} flexShrink={0}>
                    <Text variant="metric"
                      color={active ? Colors.primary : Colors.textPrimary}>
                      {p.price}
                    </Text>
                    <Text variant="caption" color={Colors.textMuted}>
                      {p.period}
                    </Text>
                  </Stack>

                </Stack>
              </StyledPressable>
            )
          })}
        </Stack>

        {/* ── CTA ───────────────────────────────────────────────────── */}
        <Stack paddingHorizontal={20} gap={12}>
          <StyledPressable
            paddingVertical={18} borderRadius={30}
            backgroundColor={Colors.primary}
            alignItems="center" justifyContent="center"
            onPress={handlePurchasePress}
            style={{
              shadowColor:   Colors.primary,
              shadowOffset:  { width: 0, height: 6 },
              shadowOpacity: 0.35,
              shadowRadius:  12,
              elevation:     6,
            }}
          >
            <Text variant="button" color="#fff">
              {selected === 'YEARLY'   ? '🎉 Start 7-Day Free Trial' :
               selected === 'ONE_TIME' ? '⚡ Buy Lifetime Access'    :
               '🚀 Start Monthly Plan'}
            </Text>
          </StyledPressable>

          <Stack alignItems="center" gap={6}>
            <StyledPressable onPress={premium.restore}>
              <Text variant="subLabel" color={Colors.primary}>
                Restore purchases
              </Text>
            </StyledPressable>
            <Text variant="caption" color={Colors.textMuted} textAlign="center" lineHeight={16}>
              Subscriptions renew automatically. Cancel anytime.{'\n'}
              Payment charged to your Apple ID at confirmation.
            </Text>
          </Stack>
        </Stack>

      </ScrollView>

    </Stack>
  )
}
