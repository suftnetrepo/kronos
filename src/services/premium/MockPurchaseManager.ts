/**
 * MockPurchaseManager
 *
 * Simulates purchase flow during development (without RevenueCat).
 * Uses SecureStore to persist mock entitlements locally.
 *
 * IMPORTANT: This is development-only and will be disabled in production.
 */
import * as SecureStore from 'expo-secure-store'
import { PREMIUM_STORAGE_KEY } from '../../constants/premium'
import type { IPurchaseManager, EntitlementInfo, PremiumPlan } from './IPurchaseManager'

export class MockPurchaseManager implements IPurchaseManager {
  async getEntitlement(): Promise<EntitlementInfo> {
    try {
      const raw = await SecureStore.getItemAsync(PREMIUM_STORAGE_KEY)
      if (!raw) return { isActive: false, plan: null, expiresAt: null, purchasedAt: null }

      const info: EntitlementInfo = JSON.parse(raw)

      // Check expiry for subscriptions
      if (info.expiresAt && new Date(info.expiresAt) < new Date()) {
        await this.clearTestEntitlement()
        return { isActive: false, plan: null, expiresAt: null, purchasedAt: null }
      }

      return info
    } catch {
      return { isActive: false, plan: null, expiresAt: null, purchasedAt: null }
    }
  }

  async purchaseMonthly(): Promise<boolean> {
    // Simulate 1.5s payment processing
    await new Promise(r => setTimeout(r, 1500))
    await this.grantTestEntitlement('monthly', 1)
    return true
  }

  async purchaseYearly(): Promise<boolean> {
    // Simulate 1.5s payment processing
    await new Promise(r => setTimeout(r, 1500))
    await this.grantTestEntitlement('yearly')
    return true
  }

  async purchaseLifetime(): Promise<boolean> {
    // Simulate 1.5s payment processing
    await new Promise(r => setTimeout(r, 1500))
    await this.grantTestEntitlement('lifetime')
    return true
  }

  async restorePurchases(): Promise<boolean> {
    // Mock: always return false (no purchases to restore in dev)
    return false
  }

  async grantTestEntitlement(plan: PremiumPlan, months?: number): Promise<void> {
    const now = new Date()
    const expiresAt = plan === 'lifetime' ? null
      : plan === 'yearly'  ? new Date(now.setFullYear(now.getFullYear() + 1)).toISOString()
      : new Date(now.setMonth(now.getMonth() + (months ?? 1))).toISOString()

    const info: EntitlementInfo = {
      isActive:    true,
      plan,
      expiresAt,
      purchasedAt: new Date().toISOString(),
    }
    await SecureStore.setItemAsync(PREMIUM_STORAGE_KEY, JSON.stringify(info))
  }

  async clearTestEntitlement(): Promise<void> {
    await SecureStore.deleteItemAsync(PREMIUM_STORAGE_KEY)
  }
}
