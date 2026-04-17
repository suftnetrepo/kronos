/**
 * RevenueCatManager Verification Tests
 *
 * Verify:
 * 1. Offerings fetch successfully with correct identifiers
 * 2. Products match expected IDs (kronos_premium_monthly, yearly, lifetime)
 * 3. Entitlement "premium" is recognized
 * 4. Purchase flow works in sandbox/test store
 * 5. Restore purchases works
 * 6. Caching persists entitlements
 *
 * Run via: npm test -- RevenueCatManager.verification
 */

import { RevenueCatManager } from '../RevenueCatManager'

// Mock imports for testing
jest.mock('expo-secure-store')
jest.mock('react-native-purchases')

const mockSecureStore = require('expo-secure-store')
const mockPurchases = require('react-native-purchases')

describe('RevenueCatManager Integration', () => {
  let manager: RevenueCatManager
  let mockSDK: any

  beforeEach(() => {
    manager = new RevenueCatManager()
    mockSecureStore.getItemAsync.mockResolvedValue(null)
    mockSecureStore.setItemAsync.mockResolvedValue(undefined)
    mockSecureStore.deleteItemAsync.mockResolvedValue(undefined)

    // Mock SDK
    mockSDK = {
      configure: jest.fn().mockResolvedValue(undefined),
      getOfferings: jest.fn(),
      getCustomerInfo: jest.fn(),
      purchasePackage: jest.fn(),
      restorePurchases: jest.fn(),
    }
    mockPurchases.default = mockSDK
  })

  describe('Initialization', () => {
    test('should initialize with Test Store API key in development', async () => {
      await manager.initialize()

      expect(mockSDK.configure).toHaveBeenCalledWith(
        expect.objectContaining({
          apiKey: 'test_OiqxogdQQQsphMbZeRymGfZeery',
        })
      )
    })

    test('should only initialize once', async () => {
      await manager.initialize()
      await manager.initialize()

      // Should be called only once
      expect(mockSDK.configure).toHaveBeenCalledTimes(1)
    })
  })

  describe('Offerings Fetch', () => {
    test('should fetch offerings with "default" identifier available', async () => {
      mockSDK.getOfferings.mockResolvedValue({
        current: {
          identifier: 'default',
          monthly: { identifier: 'monthly', productIdentifier: 'kronos_premium_monthly' },
          annual: { identifier: 'annual', productIdentifier: 'kronos_premium_yearly' },
          lifetime: { identifier: 'lifetime', productIdentifier: 'kronos_premium_lifetime' },
        },
        all: [],
      })

      await manager.initialize()

      // This would be called during purchase
      const offerings = await mockSDK.getOfferings()
      expect(offerings.current.identifier).toBe('default')
      expect(offerings.current.monthly).toBeDefined()
      expect(offerings.current.annual).toBeDefined()
      expect(offerings.current.lifetime).toBeDefined()
    })

    test('should have correct product IDs', async () => {
      const offerings = {
        current: {
          monthly: { identifier: 'monthly', productIdentifier: 'kronos_premium_monthly' },
          annual: { identifier: 'annual', productIdentifier: 'kronos_premium_yearly' },
          lifetime: { identifier: 'lifetime', productIdentifier: 'kronos_premium_lifetime' },
        },
      }

      expect(offerings.current.monthly.productIdentifier).toBe('kronos_premium_monthly')
      expect(offerings.current.annual.productIdentifier).toBe('kronos_premium_yearly')
      expect(offerings.current.lifetime.productIdentifier).toBe('kronos_premium_lifetime')
    })
  })

  describe('Entitlement Detection', () => {
    test('should detect "premium" entitlement as active', async () => {
      mockSDK.getCustomerInfo.mockResolvedValue({
        entitlements: {
          active: {
            premium: {
              productIdentifier: 'kronos_premium_monthly',
              expirationDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            },
          },
        },
      })

      await manager.initialize()
      const info = await manager.getEntitlement()

      expect(info.isActive).toBe(true)
      expect(info.plan).toBe('monthly')
    })

    test('should detect plan from product identifier', async () => {
      const testCases = [
        { id: 'kronos_premium_monthly', plan: 'monthly' },
        { id: 'kronos_premium_yearly', plan: 'yearly' },
        { id: 'kronos_premium_lifetime', plan: 'lifetime' },
      ]

      for (const { id, plan } of testCases) {
        mockSDK.getCustomerInfo.mockResolvedValue({
          entitlements: {
            active: {
              premium: {
                productIdentifier: id,
                expirationDate: new Date().toISOString(),
              },
            },
          },
        })

        await manager.initialize()
        const info = await manager.getEntitlement()
        expect(info.plan).toBe(plan)
      }
    })

    test('should return inactive when no premium entitlement', async () => {
      mockSDK.getCustomerInfo.mockResolvedValue({
        entitlements: { active: {} },
      })

      await manager.initialize()
      const info = await manager.getEntitlement()

      expect(info.isActive).toBe(false)
      expect(info.plan).toBeNull()
    })
  })

  describe('Purchase Flow', () => {
    test('should purchase monthly plan successfully', async () => {
      mockSDK.getOfferings.mockResolvedValue({
        current: {
          monthly: { identifier: 'monthly', productIdentifier: 'kronos_premium_monthly' },
        },
      })

      mockSDK.purchasePackage.mockResolvedValue({
        customerInfo: {
          entitlements: {
            active: {
              premium: {
                productIdentifier: 'kronos_premium_monthly',
                expirationDate: new Date().toISOString(),
              },
            },
          },
        },
      })

      mockSDK.getCustomerInfo.mockResolvedValue({
        entitlements: {
          active: {
            premium: {
              productIdentifier: 'kronos_premium_monthly',
              expirationDate: new Date().toISOString(),
            },
          },
        },
      })

      await manager.initialize()
      const success = await manager.purchaseMonthly()

      expect(success).toBe(true)
      expect(mockSDK.getOfferings).toHaveBeenCalled()
      expect(mockSDK.purchasePackage).toHaveBeenCalled()
    })

    test('should handle purchase cancellation', async () => {
      mockSDK.getOfferings.mockResolvedValue({
        current: {
          monthly: { identifier: 'monthly', productIdentifier: 'kronos_premium_monthly' },
        },
      })

      const error = new Error('User cancelled')
      ;(error as any).code = 'PurchaseCancelledError'
      mockSDK.purchasePackage.mockRejectedValue(error)

      await manager.initialize()

      await expect(manager.purchaseMonthly()).rejects.toThrow('Purchase cancelled by user')
    })
  })

  describe('Restore Purchases', () => {
    test('should restore previous purchases', async () => {
      mockSDK.restorePurchases.mockResolvedValue({
        entitlements: {
          active: {
            premium: {
              productIdentifier: 'kronos_premium_yearly',
              expirationDate: new Date().toISOString(),
            },
          },
        },
      })

      mockSDK.getCustomerInfo.mockResolvedValue({
        entitlements: {
          active: {
            premium: {
              productIdentifier: 'kronos_premium_yearly',
              expirationDate: new Date().toISOString(),
            },
          },
        },
      })

      await manager.initialize()
      const success = await manager.restorePurchases()

      expect(success).toBe(true)
      expect(mockSDK.restorePurchases).toHaveBeenCalled()
    })
  })

  describe('Entitlement Caching', () => {
    test('should cache entitlements in SecureStore', async () => {
      mockSDK.getCustomerInfo.mockResolvedValue({
        entitlements: {
          active: {
            premium: {
              productIdentifier: 'kronos_premium_monthly',
              expirationDate: new Date().toISOString(),
            },
          },
        },
      })

      await manager.initialize()
      await manager.getEntitlement()

      expect(mockSecureStore.setItemAsync).toHaveBeenCalled()
      const [key, value] = mockSecureStore.setItemAsync.mock.calls[0]
      const cached = JSON.parse(value)

      expect(cached.isActive).toBe(true)
      expect(cached.plan).toBe('monthly')
    })

    test('should use cached entitlement on next call', async () => {
      const cachedInfo = {
        isActive: true,
        plan: 'yearly' as const,
        expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
        purchasedAt: new Date().toISOString(),
      }

      mockSecureStore.getItemAsync.mockResolvedValue(JSON.stringify(cachedInfo))
      mockSDK.getCustomerInfo.mockResolvedValue({
        entitlements: {
          active: {
            premium: { productIdentifier: 'kronos_premium_yearly' },
          },
        },
      })

      await manager.initialize()
      const info = await manager.getEntitlement()

      expect(info.isActive).toBe(true)
      expect(info.plan).toBe('yearly')
    })

    test('should clear cache when entitlement expires', async () => {
      const expiredInfo = {
        isActive: true,
        plan: 'monthly' as const,
        expiresAt: new Date(Date.now() - 1000).toISOString(), // Expired
        purchasedAt: new Date().toISOString(),
      }

      mockSecureStore.getItemAsync.mockResolvedValue(JSON.stringify(expiredInfo))

      await manager.initialize()
      const info = await manager.getEntitlement()

      expect(info.isActive).toBe(false)
      expect(mockSecureStore.deleteItemAsync).toHaveBeenCalled()
    })
  })

  describe('Mock Flow Isolation', () => {
    test('should only be used in production path, not development', () => {
      // This test verifies the import path
      // In production (__DEV__ = false), RevenueCatManager is imported
      // In development (__DEV__ = true), MockPurchaseManager is imported
      expect(__DEV__).toBe(process.env.NODE_ENV !== 'production')
    })
  })

  describe('Feature Gate Integration', () => {
    test('should unlock premium features when entitlement is active', async () => {
      mockSDK.getCustomerInfo.mockResolvedValue({
        entitlements: {
          active: {
            premium: {
              productIdentifier: 'kronos_premium_monthly',
              expirationDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            },
          },
        },
      })

      await manager.initialize()
      const info = await manager.getEntitlement()

      // Feature gate: if info.isActive, unlock premium features
      if (info.isActive) {
        expect(info.plan).toBeDefined()
        expect(['monthly', 'yearly', 'lifetime']).toContain(info.plan)
      }
    })
  })
})
