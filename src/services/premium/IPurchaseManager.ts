/**
 * IPurchaseManager
 *
 * Abstract interface for purchase implementations (mock or real).
 * Both MockPurchaseManager and RevenueCatManager implement this.
 *
 * This allows clean separation: premiumService depends only on this interface,
 * not on specific implementations.
 */

export type PremiumPlan = 'monthly' | 'yearly' | 'lifetime' | null

export interface EntitlementInfo {
  isActive:    boolean
  plan:        PremiumPlan
  expiresAt:   string | null
  purchasedAt: string | null
}

export interface IPurchaseManager {
  /**
   * Get current entitlement status
   */
  getEntitlement(): Promise<EntitlementInfo>

  /**
   * Purchase monthly subscription (with trial if configured)
   * @returns true if successful
   */
  purchaseMonthly(): Promise<boolean>

  /**
   * Purchase yearly subscription (with trial if configured)
   * @returns true if successful
   */
  purchaseYearly(): Promise<boolean>

  /**
   * Purchase lifetime access (one-time)
   * @returns true if successful
   */
  purchaseLifetime(): Promise<boolean>

  /**
   * Restore previous purchases (for existing subscribers on new device)
   * @returns true if any purchases were restored
   */
  restorePurchases(): Promise<boolean>

  /**
   * Manually set entitlement (test/dev only)
   * @throws if called in production
   */
  grantTestEntitlement?(plan: PremiumPlan, months?: number): Promise<void>

  /**
   * Clear entitlement (test/dev only)
   * @throws if called in production
   */
  clearTestEntitlement?(): Promise<void>
}
