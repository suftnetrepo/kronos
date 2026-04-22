/**
 * premiumService.ts
 *
 * Premium entitlement and purchase service.
 * Now decoupled from mock/production implementation via IPurchaseManager.
 *
 * Production integration:
 * - This file remains unchanged for production
 * - Only the purchase manager changes (MockPurchaseManager → RevenueCatManager)
 * - All product IDs are in constants/premium.ts and matched in App Store Connect
 *
 * Setup for production:
 * See PREMIUM_SETUP.md and src/services/premium/RevenueCatManager.ts for seams.
 */
import type { IPurchaseManager, EntitlementInfo, PremiumPlan } from './premium/IPurchaseManager'
import { getPurchaseManagerSync } from '../config/premium.config'
import { usePurchaseReadinessStore } from '../stores'

// ─── Export types ──────────────────────────────────────────────────────────────

export type { PremiumPlan, EntitlementInfo } from './premium/IPurchaseManager'

// ─── Helper to check if purchase manager is ready ───────────────────────────────

function assertPurchaseManagerReady(): void {
  const { isReady, error } = usePurchaseReadinessStore.getState()
  
  if (!isReady) {
    if (error) {
      throw new Error(
        `[Premium] Purchase manager failed to initialize: ${error}. ` +
        'Please restart the app or contact support if the issue persists.'
      )
    }
    throw new Error(
      '[Premium] Purchase manager is not ready yet. ' +
      'Please wait for the app to finish loading before attempting a purchase.'
    )
  }
}

// ─── Wrappers around purchase manager ──────────────────────────────────────────
// These provide the same interface as before, but now call the pluggable manager
// and check that the manager is ready before proceeding

export const getEntitlement = async (): Promise<EntitlementInfo> => {
  // getEntitlement can be called even during bootstrap to check status
  // It will use cached value if available
  const manager = getPurchaseManagerSync()
  return manager.getEntitlement()
}

export const isPremiumActive = async (): Promise<boolean> => {
  const info = await getEntitlement()
  return info.isActive
}

export const purchaseMonthly = async (): Promise<boolean> => {
  assertPurchaseManagerReady()
  const manager = getPurchaseManagerSync()
  
  if (__DEV__) {
    console.log('[Premium] Purchase attempt: monthly')
  }
  
  return manager.purchaseMonthly()
}

export const purchaseYearly = async (): Promise<boolean> => {
  assertPurchaseManagerReady()
  const manager = getPurchaseManagerSync()
  
  if (__DEV__) {
    console.log('[Premium] Purchase attempt: yearly')
  }
  
  return manager.purchaseYearly()
}

export const purchaseLifetime = async (): Promise<boolean> => {
  assertPurchaseManagerReady()
  const manager = getPurchaseManagerSync()
  
  if (__DEV__) {
    console.log('[Premium] Purchase attempt: lifetime')
  }
  
  return manager.purchaseLifetime()
}

export const restorePurchases = async (): Promise<boolean> => {
  assertPurchaseManagerReady()
  const manager = getPurchaseManagerSync()
  
  if (__DEV__) {
    console.log('[Premium] Restore purchases attempt')
  }
  
  return manager.restorePurchases()
}

// ─── Test/dev helpers (only in development) ────────────────────────────────────

export const grantEntitlement = async (plan: PremiumPlan, months?: number): Promise<void> => {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('[premiumService] grantEntitlement is dev-only')
  }
  const manager = getPurchaseManagerSync()
  if (manager.grantTestEntitlement) {
    await manager.grantTestEntitlement(plan, months)
  }
}

export const clearEntitlement = async (): Promise<void> => {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('[premiumService] clearEntitlement is dev-only')
  }
  const manager = getPurchaseManagerSync()
  if (manager.clearTestEntitlement) {
    await manager.clearTestEntitlement()
  }
}
