import { useCallback } from 'react'
import { usePremiumStore, usePurchaseReadinessStore } from '../stores'
import {
  purchaseMonthly, purchaseYearly, purchaseLifetime,
  restorePurchases, getEntitlement,
} from '../services/premiumService'
import { toastService, loaderService } from 'fluent-styles'
import { FREE_LIMITS } from '../constants/premium'

export function usePremium() {
  const { isPremium, plan, setEntitlement } = usePremiumStore()
  const { isReady, isLoading: purchaseInitLoading, error: purchaseInitError } = usePurchaseReadinessStore()

  const refresh = useCallback(async () => {
    const info = await getEntitlement()
    setEntitlement(info.isActive, info.plan)
  }, [setEntitlement])

  const buyMonthly = useCallback(async () => {
    if (!isReady) {
      const msg = purchaseInitError 
        ? `Store unavailable: ${purchaseInitError}`
        : 'Store is loading. Please wait...'
      toastService.error('Cannot purchase', msg)
      return false
    }
    
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
  }, [isReady, purchaseInitError, refresh])

  const buyYearly = useCallback(async () => {
    if (!isReady) {
      const msg = purchaseInitError 
        ? `Store unavailable: ${purchaseInitError}`
        : 'Store is loading. Please wait...'
      toastService.error('Cannot purchase', msg)
      return false
    }
    
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
  }, [isReady, purchaseInitError, refresh])

  const buyLifetime = useCallback(async () => {
    if (!isReady) {
      const msg = purchaseInitError 
        ? `Store unavailable: ${purchaseInitError}`
        : 'Store is loading. Please wait...'
      toastService.error('Cannot purchase', msg)
      return false
    }
    
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
  }, [isReady, purchaseInitError, refresh])

  const restore = useCallback(async () => {
    if (!isReady) {
      const msg = purchaseInitError 
        ? `Store unavailable: ${purchaseInitError}`
        : 'Store is loading. Please wait...'
      toastService.error('Cannot restore', msg)
      return false
    }
    
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
  }, [isReady, purchaseInitError, refresh])

  return {
    isPremium,
    plan,
    refresh,
    buyMonthly,
    buyYearly,
    buyLifetime,
    restore,
    limits: FREE_LIMITS,
    // Purchase manager state (for UI feedback)
    purchaseManagerReady: isReady,
    purchaseManagerLoading: purchaseInitLoading,
    purchaseManagerError: purchaseInitError,
    // Gate helpers — call with current count to check if action is allowed
    canAddSubject:  (count: number) => isPremium || count < FREE_LIMITS.SUBJECTS,
    canAddHomework: (count: number) => isPremium || count < FREE_LIMITS.HOMEWORK_MONTH,
    canAddExam:     (count: number) => isPremium || count < FREE_LIMITS.EXAMS,
    canUseTheme:    (key: string)   => isPremium || key === 'indigo',
  }
}
