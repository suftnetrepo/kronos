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

// ─── Export types ──────────────────────────────────────────────────────────────

export type { PremiumPlan, EntitlementInfo } from './premium/IPurchaseManager'

// ─── Wrappers around purchase manager ──────────────────────────────────────────
// These provide the same interface as before, but now call the pluggable manager

export const getEntitlement = async (): Promise<EntitlementInfo> => {
  const manager = getPurchaseManagerSync()
  return manager.getEntitlement()
}

export const isPremiumActive = async (): Promise<boolean> => {
  const info = await getEntitlement()
  return info.isActive
}

export const purchaseMonthly = async (): Promise<boolean> => {
  const manager = getPurchaseManagerSync()
  return manager.purchaseMonthly()
}

export const purchaseYearly = async (): Promise<boolean> => {
  const manager = getPurchaseManagerSync()
  return manager.purchaseYearly()
}

export const purchaseLifetime = async (): Promise<boolean> => {
  const manager = getPurchaseManagerSync()
  return manager.purchaseLifetime()
}

export const restorePurchases = async (): Promise<boolean> => {
  const manager = getPurchaseManagerSync()
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
