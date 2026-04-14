/**
 * MockPaymentSheet
 *
 * Simulates the native Apple / Google payment sheet during development.
 * Shows a realistic-looking dialog with product details, a 1.5s processing
 * delay, and Confirm / Cancel buttons.
 *
 * Remove this component (and its usage in PremiumScreen) once RevenueCat
 * is integrated — real billing replaces this entirely.
 */
import React, { useState } from 'react'
import { Modal, ActivityIndicator } from 'react-native'
import { Stack, StyledText, StyledPressable, StyledDivider } from 'fluent-styles'
import { useColors } from '../../constants'
import { PREMIUM_PRICING } from '../../constants/premium'

type PlanKey = 'MONTHLY' | 'YEARLY' | 'ONE_TIME'

interface MockPaymentSheetProps {
  visible:   boolean
  plan:      PlanKey
  onConfirm: () => void
  onCancel:  () => void
}

export const MockPaymentSheet: React.FC<MockPaymentSheetProps> = ({
  visible, plan, onConfirm, onCancel,
}) => {
  const Colors  = useColors()
  const pricing = PREMIUM_PRICING[plan]
  const [processing, setProcessing] = useState(false)

  const handleConfirm = async () => {
    setProcessing(true)
    // Simulate Apple's ~1.5s payment processing delay
    await new Promise(r => setTimeout(r, 1500))
    setProcessing(false)
    onConfirm()
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onCancel}>
      <Stack flex={1} backgroundColor="rgba(0,0,0,0.5)" justifyContent="flex-end">

        {/* Sheet */}
        <Stack
          backgroundColor={Colors.bgCard}
          borderTopLeftRadius={24} borderTopRightRadius={24}
          paddingBottom={40} overflow="hidden"
        >
          {/* Apple Pay–style header */}
          <Stack
            backgroundColor="#F2F2F7"
            paddingVertical={16} paddingHorizontal={20}
            alignItems="center"
            borderBottomWidth={1} borderBottomColor={Colors.border}
          >
            <Stack width={36} height={4} borderRadius={2}
              backgroundColor={Colors.border} marginBottom={14} />

            {/* App + payment method row */}
            <Stack horizontal alignItems="center" gap={10} marginBottom={8}>
              <Stack
                width={40} height={40} borderRadius={10}
                backgroundColor="#4F46E5"
                alignItems="center" justifyContent="center"
              >
                <StyledText fontSize={20}>⚡</StyledText>
              </Stack>
              <Stack gap={1}>
                <StyledText fontSize={14} fontWeight="700" color={Colors.textPrimary}>
                  Kronos
                </StyledText>
                <StyledText fontSize={12} color={Colors.textMuted}>
                  In-App Purchase
                </StyledText>
              </Stack>
            </Stack>

            {/* DEV ONLY badge */}
            {__DEV__ && (
              <Stack paddingHorizontal={10} paddingVertical={4}
                borderRadius={8} backgroundColor="#FF9500">
                <StyledText fontSize={10} fontWeight="700" color="#fff">
                  🧪 MOCK — No real charge
                </StyledText>
              </Stack>
            )}
          </Stack>

          {/* Product details */}
          <Stack paddingHorizontal={24} paddingTop={24} paddingBottom={8} gap={6}>
            <StyledText fontSize={20} fontWeight="800" color={Colors.textPrimary} textAlign="center">
              Kronos Premium — {pricing.label}
            </StyledText>
            <StyledText fontSize={15} color={Colors.textMuted} textAlign="center">
              {'trial' in pricing
                ? `${pricing.trial}, then ${pricing.price} ${pricing.period}`
                : `${pricing.price} ${pricing.period}`}
            </StyledText>
            {'saving' in pricing && (
              <Stack alignItems="center" marginTop={4}>
                <Stack paddingHorizontal={12} paddingVertical={4}
                  borderRadius={20} backgroundColor="#6366F1">
                  <StyledText fontSize={12} fontWeight="700" color="#fff">
                    {(pricing as any).saving}
                  </StyledText>
                </Stack>
              </Stack>
            )}
          </Stack>

          <StyledDivider
            borderBottomColor={Colors.border}
            marginHorizontal={24} marginVertical={16}
          />

          {/* Legal copy */}
          <Stack paddingHorizontal={24} marginBottom={24}>
            <StyledText fontSize={11} color={Colors.textMuted} textAlign="center" lineHeight={16}>
              {'trial' in pricing
                ? `Your ${(pricing as any).trial} begins today. After the trial, you will be charged ${pricing.price} ${pricing.period} unless you cancel before the trial ends.`
                : plan === 'ONE_TIME'
                ? 'This is a one-time purchase. You will have lifetime access to all premium features.'
                : `You will be charged ${pricing.price} ${pricing.period}. Cancel anytime in App Store settings.`}
              {'\n'}Payment will be charged to your Apple ID.
            </StyledText>
          </Stack>

          {/* Buttons */}
          <Stack paddingHorizontal={20} gap={10}>
            <StyledPressable
              paddingVertical={16} borderRadius={14}
              backgroundColor={processing ? Colors.bgMuted : '#6366F1'}
              alignItems="center" justifyContent="center"
              onPress={handleConfirm}
              disabled={processing}
            >
              {processing ? (
                <Stack horizontal alignItems="center" gap={10}>
                  <ActivityIndicator size="small" color="#6366F1" />
                  <StyledText fontSize={15} fontWeight="700" color={Colors.textMuted}>
                    Processing…
                  </StyledText>
                </Stack>
              ) : (
                <StyledText fontSize={15} fontWeight="800" color="#fff">
                  {'trial' in pricing ? 'Start Free Trial' : 'Confirm Purchase'}
                </StyledText>
              )}
            </StyledPressable>

            <StyledPressable
              paddingVertical={14} borderRadius={14}
              backgroundColor={Colors.bgMuted}
              alignItems="center"
              onPress={onCancel}
              disabled={processing}
            >
              <StyledText fontSize={15} fontWeight="600" color={Colors.textSecondary}>
                Cancel
              </StyledText>
            </StyledPressable>
          </Stack>
        </Stack>
      </Stack>
    </Modal>
  )
}
