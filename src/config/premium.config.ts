/**
 * Premium Configuration
 *
 * Separates development (mock) and production (RevenueCat) environments.
 * This allows clean swaps without coupling production code to test logic.
 */

export type PremiumEnvironment = 'development' | 'production'

export const PREMIUM_ENV = __DEV__ ? 'development' : 'production'

/**
 * Gets the appropriate purchase manager for the current environment.
 * Now uses RevenueCatManager for both dev and production.
 * - Dev: RevenueCat Test Store (sandbox)
 * - Production: RevenueCat Production (real charges)
 * 
 * MockPurchaseManager is available but must be explicitly enabled via ENABLE_MOCK_PURCHASES flag
 */
export async function getPurchaseManager() {
  // FOR TESTING: Set to true to use mock purchases instead of RevenueCat
  const ENABLE_MOCK_PURCHASES = false
  
  if (ENABLE_MOCK_PURCHASES) {
    const { MockPurchaseManager } = await import(
      /* webpackChunkName: "mock-purchases" */ '../services/premium/MockPurchaseManager'
    )
    return new MockPurchaseManager()
  }

  // Default: Always use RevenueCat (Test Store in dev, Production in release)
  const { RevenueCatManager } = await import(
    /* webpackChunkName: "revenuecat-purchases" */ '../services/premium/RevenueCatManager'
  )
  return new RevenueCatManager()
}

/**
 * Singleton instance — initialized on first use
 */
let purchaseManagerInstance: any = null

export async function initializePurchaseManager() {
  if (!purchaseManagerInstance) {
    purchaseManagerInstance = await getPurchaseManager()
  }
  return purchaseManagerInstance
}

export function getPurchaseManagerSync() {
  if (!purchaseManagerInstance) {
    throw new Error(
      '[Premium Config] Purchase manager not initialized. ' +
      'Call initializePurchaseManager() during app bootstrap.'
    )
  }
  return purchaseManagerInstance
}
