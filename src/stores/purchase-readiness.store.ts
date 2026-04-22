/**
 * Purchase Readiness Store
 *
 * Centralized state for purchase manager initialization and readiness.
 * Components depend on this to know if they can call purchase methods.
 *
 * States:
 * - Initial: isReady=false, isLoading=false, error=null
 * - Initializing: isReady=false, isLoading=true, error=null
 * - Ready: isReady=true, isLoading=false, error=null
 * - Failed: isReady=false, isLoading=false, error="message"
 * - Retrying: isReady=false, isLoading=true, error="previous error"
 */

import { create } from 'zustand'

interface PurchaseReadinessState {
  isReady: boolean
  isLoading: boolean
  error: string | null

  // Actions
  setLoading: (loading: boolean) => void
  setReady: () => void
  setError: (error: string) => void
  reset: () => void
}

export const usePurchaseReadinessStore = create<PurchaseReadinessState>((set) => ({
  isReady: false,
  isLoading: false,
  error: null,

  setLoading: (loading) => {
    if (__DEV__) {
      console.log('[PurchaseReadiness]', loading ? 'Initialization started' : 'Initialization finished')
    }
    set({ isLoading: loading })
  },

  setReady: () => {
    if (__DEV__) {
      console.log('[PurchaseReadiness] Initialization succeeded')
    }
    set({ isReady: true, isLoading: false, error: null })
  },

  setError: (error) => {
    if (__DEV__) {
      console.error('[PurchaseReadiness] Initialization failed:', error)
    }
    set({ isReady: false, isLoading: false, error })
  },

  reset: () => {
    if (__DEV__) {
      console.log('[PurchaseReadiness] State reset')
    }
    set({ isReady: false, isLoading: false, error: null })
  },
}))
