import { create } from 'zustand'
import { getAllSettings, setSetting } from '../services/settings.service'
import type { AppSettings } from '../services/settings.service'

interface SettingsState extends AppSettings {
  // Hydration
  hydrate: () => Promise<void>
  bootReady: boolean
  setBootReady: (ready: boolean) => void

  // True for exactly one render after a cold-launch hydrate when the user's
  // persisted Default Start Tab isn't Today ('index') — consumed once by the
  // Today tab route to redirect at startup, then cleared. This makes the
  // startup preference actually take effect (it previously only navigated
  // when pressed inside Settings) without turning it into a permanent lock:
  // once cleared, the Today tab is reachable normally like any other tab.
  startupRedirectPending: boolean
  clearStartupRedirect: () => void

  // Individual setters (persist to DB)
  setLockEnabled: (enabled: boolean) => Promise<void>
  setBiometricEnabled: (enabled: boolean) => Promise<void>
  setRemindersEnabled: (enabled: boolean) => Promise<void>
  setDefaultTab: (tab: 'index' | 'homework' | 'exams') => Promise<void>
}

export const useSettingsStore = create<SettingsState>((set) => ({
  // Initial state (defaults)
  lockEnabled: false,
  biometricEnabled: false,
  remindersEnabled: true,
  defaultTab: 'index',
  bootReady: false,
  startupRedirectPending: false,

  // Hydrate from DB on app start
  hydrate: async () => {
    try {
      const all = await getAllSettings()
      set({
        lockEnabled: all.lockEnabled,
        biometricEnabled: all.biometricEnabled,
        remindersEnabled: all.remindersEnabled,
        defaultTab: all.defaultTab,
        startupRedirectPending: all.defaultTab !== 'index',
        bootReady: true,
      })
    } catch (err) {
      console.error('[useSettingsStore] Hydration error:', err)
      set({ bootReady: true })
    }
  },

  setBootReady: (ready) => set({ bootReady: ready }),
  clearStartupRedirect: () => set({ startupRedirectPending: false }),

  // Setters (sync to DB)
  setLockEnabled: async (enabled) => {
    set({ lockEnabled: enabled })
    try {
      await setSetting('lockEnabled', enabled)
    } catch (err) {
      console.error('[useSettingsStore] Failed to save lockEnabled:', err)
    }
  },

  setBiometricEnabled: async (enabled) => {
    set({ biometricEnabled: enabled })
    try {
      await setSetting('biometricEnabled', enabled)
    } catch (err) {
      console.error('[useSettingsStore] Failed to save biometricEnabled:', err)
    }
  },

  setRemindersEnabled: async (enabled) => {
    set({ remindersEnabled: enabled })
    try {
      await setSetting('remindersEnabled', enabled)
    } catch (err) {
      console.error('[useSettingsStore] Failed to save remindersEnabled:', err)
    }
  },

  setDefaultTab: async (tab) => {
    set({ defaultTab: tab })
    try {
      await setSetting('defaultTab', tab)
    } catch (err) {
      console.error('[useSettingsStore] Failed to save defaultTab:', err)
    }
  },
}))
