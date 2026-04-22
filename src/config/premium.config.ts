/**
 * Premium Configuration
 *
 * Separates development (mock) and production (RevenueCat) environments.
 * This allows clean swaps without coupling production code to test logic.
 * 
 * Diagnostics:
 * - In dev, all initialization steps are logged to help debug purchase flow issues
 * - In production, only errors are logged
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
    if (__DEV__) {
      console.log('[Premium Config] Using MockPurchaseManager (testing mode)')
    }
    const { MockPurchaseManager } = await import(
      /* webpackChunkName: "mock-purchases" */ '../services/premium/MockPurchaseManager'
    )
    return new MockPurchaseManager()
  }

  // Default: Always use RevenueCat (Test Store in dev, Production in release)
  if (__DEV__) {
    console.log('[Premium Config] Using RevenueCatManager (environment: ' + PREMIUM_ENV + ')')
  }
  const { RevenueCatManager } = await import(
    /* webpackChunkName: "revenuecat-purchases" */ '../services/premium/RevenueCatManager'
  )
  return new RevenueCatManager()
}

/**
 * Singleton instance — initialized on first use
 */
let purchaseManagerInstance: any = null
let initializationPromise: Promise<any> | null = null

export async function initializePurchaseManager() {
  if (purchaseManagerInstance) {
    if (__DEV__) {
      console.log('[Premium Config] Purchase manager already initialized, skipping')
    }
    return purchaseManagerInstance
  }

  // If initialization is in progress, wait for it
  if (initializationPromise) {
    if (__DEV__) {
      console.log('[Premium Config] Initialization in progress, waiting...')
    }
    return await initializationPromise
  }

  // Start initialization
  initializationPromise = (async () => {
    try {
      if (__DEV__) {
        console.log('[Premium Config] Starting purchase manager initialization...')
      }
      
      purchaseManagerInstance = await getPurchaseManager()
      
      if (__DEV__) {
        console.log('[Premium Config] Getting purchase manager instance...')
      }
      
      // Call initialize on the manager (for RevenueCat, this sets up the SDK)
      await purchaseManagerInstance.initialize()
      
      if (__DEV__) {
        console.log('[Premium Config] Purchase manager initialized successfully')
      }
      
      return purchaseManagerInstance
    } catch (err) {
      if (__DEV__) {
        console.error('[Premium Config] Purchase manager initialization failed:', err)
      }
      throw err
    }
  })()

  return await initializationPromise
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
