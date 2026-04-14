/**
 * premiumService.ts
 *
 * Current: SecureStore-based local entitlement + mock purchase flow.
 *
 * ─── To go live with RevenueCat ───────────────────────────────────────────────
 * 1. npm install react-native-purchases
 * 2. In App Store Connect, create subscription group "Kronos Premium" with
 *    the 3 product IDs defined in constants/premium.ts
 * 3. Replace the 4 functions marked REVENUECAT_SWAP below
 * 4. Delete MockPaymentSheet.tsx
 * 5. In PremiumScreen.tsx, remove MockPaymentSheet import + usage
 * 6. In SettingsScreen.tsx, remove "Reset premium (dev)" row
 * 7. Remove this comment block
 * ─────────────────────────────────────────────────────────────────────────────
 */
import * as SecureStore from 'expo-secure-store'
import { PREMIUM_STORAGE_KEY } from '../constants/premium'

export type PremiumPlan = 'monthly' | 'yearly' | 'lifetime' | null

export interface EntitlementInfo {
  isActive:    boolean
  plan:        PremiumPlan
  expiresAt:   string | null
  purchasedAt: string | null
}

// ─── Read entitlement ─────────────────────────────────────────────────────────

export const getEntitlement = async (): Promise<EntitlementInfo> => {
  try {
    const raw = await SecureStore.getItemAsync(PREMIUM_STORAGE_KEY)
    if (!raw) return { isActive: false, plan: null, expiresAt: null, purchasedAt: null }

    const info: EntitlementInfo = JSON.parse(raw)

    // Check expiry for subscriptions
    if (info.expiresAt && new Date(info.expiresAt) < new Date()) {
      await clearEntitlement()
      return { isActive: false, plan: null, expiresAt: null, purchasedAt: null }
    }

    return info
  } catch {
    return { isActive: false, plan: null, expiresAt: null, purchasedAt: null }
  }
}

export const isPremiumActive = async (): Promise<boolean> => {
  const info = await getEntitlement()
  return info.isActive
}

// ─── Write / clear entitlement ────────────────────────────────────────────────

export const grantEntitlement = async (plan: PremiumPlan, months?: number): Promise<void> => {
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

export const clearEntitlement = async (): Promise<void> => {
  await SecureStore.deleteItemAsync(PREMIUM_STORAGE_KEY)
}

// ─── Purchase functions ───────────────────────────────────────────────────────
// REVENUECAT_SWAP: Replace each function body with the RevenueCat equivalent.
// Keep signatures identical — no other files need updating.

export const purchaseMonthly = async (): Promise<boolean> => {
  // REVENUECAT_SWAP ↓
  // const offerings = await Purchases.getOfferings()
  // const pkg = offerings.current?.monthly
  // if (!pkg) throw new Error('Monthly package not found')
  // await Purchases.purchasePackage(pkg)
  // const info = await Purchases.getCustomerInfo()
  // return !!info.entitlements.active['premium']
  await grantEntitlement('monthly', 1)
  return true
}

export const purchaseYearly = async (): Promise<boolean> => {
  // REVENUECAT_SWAP ↓
  // const offerings = await Purchases.getOfferings()
  // const pkg = offerings.current?.annual
  // if (!pkg) throw new Error('Annual package not found')
  // await Purchases.purchasePackage(pkg)
  // const info = await Purchases.getCustomerInfo()
  // return !!info.entitlements.active['premium']
  await grantEntitlement('yearly')
  return true
}

export const purchaseLifetime = async (): Promise<boolean> => {
  // REVENUECAT_SWAP ↓
  // const offerings = await Purchases.getOfferings()
  // const pkg = offerings.current?.lifetime
  // if (!pkg) throw new Error('Lifetime package not found')
  // await Purchases.purchasePackage(pkg)
  // const info = await Purchases.getCustomerInfo()
  // return !!info.entitlements.active['premium']
  await grantEntitlement('lifetime')
  return true
}

export const restorePurchases = async (): Promise<boolean> => {
  // REVENUECAT_SWAP ↓
  // const info = await Purchases.restorePurchases()
  // const active = !!info.entitlements.active['premium']
  // if (active) {
  //   const id = info.entitlements.active['premium'].productIdentifier
  //   const plan = id.includes('lifetime') ? 'lifetime'
  //     : id.includes('annual') ? 'yearly' : 'monthly'
  //   await grantEntitlement(plan)
  // }
  // return active
  return false
}
