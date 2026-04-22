/**
 * RevenueCatManager
 *
 * Production purchase manager using RevenueCat for billing.
 * Implementation ported from Vela's proven test store setup.
 *
 * Product Mapping:
 * - Kronos: com.kronos.timetable.premium.monthly/yearly/lifetime
 * - Vela:   vela_premium_monthly/yearly/lifetime (for reference)
 *
 * Setup for Kronos:
 * 1. Get sandbox API key from RevenueCat dashboard (Kronos Test Store project)
 * 2. Create 3 products in RevenueCat Test Store matching product IDs above
 * 3. Create offering "default" with all 3 packages
 * 4. Set entitlement to "premium"
 *
 * Setup for production:
 * 1. Create products in App Store Connect with real product IDs
 * 2. Get production API keys from RevenueCat
 * 3. Update API_KEY in this file (or use env vars)
 * 4. Test with sandbox testers
 * 5. Switch to production key before app store release
 *
 * See: https://docs.revenuecat.com/docs/configuring-products
 */
import * as SecureStore from 'expo-secure-store'
import type { IPurchaseManager, EntitlementInfo, PremiumPlan } from './IPurchaseManager'
import { PREMIUM_STORAGE_KEY } from '../../constants/premium'

// Import RevenueCat SDK
let Purchases: any = null
async function importPurchases() {
  if (!Purchases) {
    const module = await import('react-native-purchases')
    Purchases = module.default
  }
  return Purchases
}

// ─── Product IDs (RevenueCat Test Store: Kronos) ───────────────────────────

const KRONOS_PRODUCT_IDS = {
  MONTHLY:  'kronos_premium_monthly',
  YEARLY:   'kronos_premium_yearly',
  LIFETIME: 'kronos_premium_lifetime',
} as const

// ─── RevenueCat Configuration ──────────────────────────────────────────────
// Entitlement identifier: "premium"
// Offering identifier: "default"
// API Keys: Test Store (dev) → Production (app store submission)
const REVENUECAT_API_KEY = __DEV__
  ? 'test_OiqxogdQQQsphMbZeRymGfZeery'  // Kronos Test Store (sandbox)
  : 'appl_production_key_for_kronos'    // TODO: Production key before app store

// ─── State ────────────────────────────────────────────────────────────────

let isRevenueCatInitialized = false

export class RevenueCatManager implements IPurchaseManager {
  /**
   * Initialize RevenueCat with API credentials.
   * Must be called before any purchase operations.
   */
  async initialize(): Promise<void> {
    if (isRevenueCatInitialized) {
      if (__DEV__) {
        console.log('[RevenueCatManager] Already initialized, skipping')
      }
      return
    }

    try {
      if (__DEV__) {
        console.log('[RevenueCatManager] Starting initialization...')
        console.log('[RevenueCatManager] Environment:', __DEV__ ? 'development (Test Store)' : 'production')
        console.log('[RevenueCatManager] API Key:', REVENUECAT_API_KEY.substring(0, 10) + '...')
      }
      
      const SDK = await importPurchases()
      
      if (__DEV__) {
        console.log('[RevenueCatManager] RevenueCat SDK imported successfully')
      }
      
      // Initialize RevenueCat with API key
      // For development: Using Test Store configuration
      // For production: Using real API key from RevenueCat dashboard
      await SDK.configure({
        apiKey: REVENUECAT_API_KEY,
        appUserID: undefined, // Let RevenueCat generate one
      })
      
      if (__DEV__) {
        console.log('[RevenueCatManager] SDK configured successfully')
      }
      
      isRevenueCatInitialized = true
      console.log('[RevenueCatManager] Initialization completed successfully')
    } catch (err) {
      console.error('[RevenueCatManager] Initialization failed:', err)
      isRevenueCatInitialized = false
      throw err
    }
  }

  private assertInitialized(): void {
    if (!isRevenueCatInitialized) {
      throw new Error(
        '[RevenueCatManager] Not initialized. ' +
        'Call initialize() during app bootstrap.'
      )
    }
  }

  /**
   * Get current entitlement status from RevenueCat.
   * Reads from SecureStore cache first, then validates via RevenueCat.
   * (Pattern ported from Vela's proven implementation)
   */
  async getEntitlement(): Promise<EntitlementInfo> {
    try {
      // First try cache
      const raw = await SecureStore.getItemAsync(PREMIUM_STORAGE_KEY)
      let cached: EntitlementInfo | null = null
      
      if (raw) {
        try {
          cached = JSON.parse(raw)
          // Check if cached entitlement has expired
          if (cached && cached.expiresAt && new Date(cached.expiresAt) < new Date()) {
            await this.clearTestEntitlement()
            return { isActive: false, plan: null, expiresAt: null, purchasedAt: null }
          }
        } catch {
          cached = null
        }
      }

      // Check RevenueCat for current status
      if (!isRevenueCatInitialized) {
        await this.initialize()
      }

      try {
        const SDK = await importPurchases()
        const customerInfo = await SDK.getCustomerInfo()
        const isActive = !!customerInfo.entitlements.active['premium']
        
        if (isActive) {
          const entitlement = customerInfo.entitlements.active['premium']
          
          // Determine plan from product ID
          const productId = entitlement.productIdentifier || ''
          let plan: PremiumPlan = 'monthly'
          
          if (productId.includes('lifetime') || productId.includes('life')) {
            plan = 'lifetime'
          } else if (productId.includes('annual') || productId.includes('yearly') || productId.includes('year')) {
            plan = 'yearly'
          }
          
          const newInfo: EntitlementInfo = {
            isActive: true,
            plan,
            expiresAt: entitlement.expirationDate || null,
            purchasedAt: new Date().toISOString(),
          }
          
          // Cache it
          await SecureStore.setItemAsync(PREMIUM_STORAGE_KEY, JSON.stringify(newInfo))
          return newInfo
        } else {
          // No active entitlement
          await this.clearTestEntitlement()
          return { isActive: false, plan: null, expiresAt: null, purchasedAt: null }
        }
      } catch (err: any) {
        // RevenueCat error; return cached if available
        if (cached?.isActive) {
          console.warn('[RevenueCatManager] RevenueCat check failed, using cached:', err?.message)
          return cached
        }
        console.warn('[RevenueCatManager] RevenueCat check failed, returning inactive:', err?.message)
        return { isActive: false, plan: null, expiresAt: null, purchasedAt: null }
      }
    } catch {
      return { isActive: false, plan: null, expiresAt: null, purchasedAt: null }
    }
  }

  /**
   * Purchase monthly subscription via RevenueCat.
   */
  async purchaseMonthly(): Promise<boolean> {
    this.assertInitialized()

    try {
      const SDK = await importPurchases()
      const offerings = await SDK.getOfferings()
      
      if (!offerings.current) {
        throw new Error('No offerings available from RevenueCat')
      }

      const pkg = offerings.current.monthly
      if (!pkg) {
        throw new Error('Monthly package not found in offerings')
      }

      console.log('[RevenueCatManager] Purchasing monthly:', pkg.identifier)
      await SDK.purchasePackage(pkg)
      
      // Validate entitlement
      const result = await this.getEntitlement()
      return result.isActive
    } catch (err: any) {
      console.error('[RevenueCatManager] Monthly purchase failed:', err?.message)
      if (err?.code === 'PurchaseCancelledError') {
        throw new Error('Purchase cancelled by user')
      }
      throw err
    }
  }

  /**
   * Purchase yearly subscription via RevenueCat.
   */
  async purchaseYearly(): Promise<boolean> {
    this.assertInitialized()

    try {
      const SDK = await importPurchases()
      const offerings = await SDK.getOfferings()
      
      if (!offerings.current) {
        throw new Error('No offerings available from RevenueCat')
      }

      const pkg = offerings.current.annual
      if (!pkg) {
        throw new Error('Yearly package not found in offerings')
      }

      console.log('[RevenueCatManager] Purchasing yearly:', pkg.identifier)
      await SDK.purchasePackage(pkg)
      
      const result = await this.getEntitlement()
      return result.isActive
    } catch (err: any) {
      console.error('[RevenueCatManager] Yearly purchase failed:', err?.message)
      if (err?.code === 'PurchaseCancelledError') {
        throw new Error('Purchase cancelled by user')
      }
      throw err
    }
  }

  /**
   * Purchase lifetime subscription via RevenueCat.
   */
  async purchaseLifetime(): Promise<boolean> {
    this.assertInitialized()

    try {
      const SDK = await importPurchases()
      const offerings = await SDK.getOfferings()
      
      if (!offerings.current) {
        throw new Error('No offerings available from RevenueCat')
      }

      // Lifetime might be called "lifetime" or search for it
      let pkg = offerings.current.lifetime
      if (!pkg) {
        pkg = Object.values(offerings.current.availablePackages || {}).find((p: any) =>
          p.identifier.toLowerCase().includes('lifetime')
        )
      }
      
      if (!pkg) {
        throw new Error('Lifetime package not found in offerings')
      }

      console.log('[RevenueCatManager] Purchasing lifetime:', (pkg as any).identifier)
      await SDK.purchasePackage(pkg as any)
      
      const result = await this.getEntitlement()
      return result.isActive
    } catch (err: any) {
      console.error('[RevenueCatManager] Lifetime purchase failed:', err?.message)
      if (err?.code === 'PurchaseCancelledError') {
        throw new Error('Purchase cancelled by user')
      }
      throw err
    }
  }

  /**
   * Restore previous purchases from RevenueCat.
   * Useful when user switches devices or reinstalls app.
   */
  async restorePurchases(): Promise<boolean> {
    this.assertInitialized()

    try {
      const SDK = await importPurchases()
      console.log('[RevenueCatManager] Attempting to restore purchases...')
      await SDK.restorePurchases()
      
      const result = await this.getEntitlement()
      return result.isActive
    } catch (err: any) {
      console.error('[RevenueCatManager] Restore purchases failed:', err?.message)
      return false
    }
  }

  /**
   * Manually grant entitlement (dev/testing only).
   * In production, entitlements come from RevenueCat after purchase.
   * This is for QA scenarios and manual testing.
   */
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

  /**
   * Clear test entitlement (dev/testing only).
   */
  async clearTestEntitlement(): Promise<void> {
    try {
      await SecureStore.deleteItemAsync(PREMIUM_STORAGE_KEY)
    } catch {
      // Ignore errors if item doesn't exist
    }
  }
}

/**
 * Initialize RevenueCat during app bootstrap
 * Call this in app/_layout.tsx during bootstrap phase
 */
export async function initializeRevenueCat(): Promise<void> {
  if (process.env.NODE_ENV === 'production') {
    const manager = new RevenueCatManager()
    await manager.initialize()
  }
  // In development, MockPurchaseManager is used instead
}
