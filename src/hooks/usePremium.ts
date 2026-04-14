import { useCallback } from 'react'
import { usePremiumStore } from '../stores'
import {
  purchaseMonthly, purchaseYearly, purchaseLifetime,
  restorePurchases, getEntitlement,
} from '../services/premiumService'
import { toastService, loaderService } from 'fluent-styles'
import { FREE_LIMITS } from '../constants/premium'

export function usePremium() {
  const { isPremium, plan, setEntitlement } = usePremiumStore()

  const refresh = useCallback(async () => {
    const info = await getEntitlement()
    setEntitlement(info.isActive, info.plan)
  }, [setEntitlement])

  const buyMonthly = useCallback(async () => {
    try {
      await loaderService.wrap(
        () => purchaseMonthly(),
        { label: 'Processing…', variant: 'spinner' },
      )
      await refresh()
      toastService.success('Welcome to Kronos Premium! 🎉')
      return true
    } catch (err: any) {
      toastService.error('Purchase failed', err?.message)
      return false
    }
  }, [refresh])

  const buyYearly = useCallback(async () => {
    try {
      await loaderService.wrap(
        () => purchaseYearly(),
        { label: 'Processing…', variant: 'spinner' },
      )
      await refresh()
      toastService.success('Welcome to Kronos Premium! 🎉')
      return true
    } catch (err: any) {
      toastService.error('Purchase failed', err?.message)
      return false
    }
  }, [refresh])

  const buyLifetime = useCallback(async () => {
    try {
      await loaderService.wrap(
        () => purchaseLifetime(),
        { label: 'Processing…', variant: 'spinner' },
      )
      await refresh()
      toastService.success('Welcome to Kronos Premium! 🎉')
      return true
    } catch (err: any) {
      toastService.error('Purchase failed', err?.message)
      return false
    }
  }, [refresh])

  const restore = useCallback(async () => {
    try {
      const restored = await loaderService.wrap(
        () => restorePurchases(),
        { label: 'Restoring…', variant: 'spinner' },
      )
      if (restored) {
        await refresh()
        toastService.success('Purchases restored!')
      } else {
        toastService.info('No purchases found', 'No active subscription found for this account')
      }
      return restored
    } catch (err: any) {
      toastService.error('Restore failed', err?.message)
      return false
    }
  }, [refresh])

  return {
    isPremium,
    plan,
    refresh,
    buyMonthly,
    buyYearly,
    buyLifetime,
    restore,
    limits: FREE_LIMITS,
    // Gate helpers — call with current count to check if action is allowed
    canAddSubject:  (count: number) => isPremium || count < FREE_LIMITS.SUBJECTS,
    canAddHomework: (count: number) => isPremium || count < FREE_LIMITS.HOMEWORK_MONTH,
    canAddExam:     (count: number) => isPremium || count < FREE_LIMITS.EXAMS,
    canUseTheme:    (key: string)   => isPremium || key === 'indigo',
  }
}
