import { create } from 'zustand'
import { getAllSettings, setSetting } from '../services/settings.service'
import type { AppSettings } from '../services/settings.service'

interface SettingsState extends AppSettings {
  // Hydration
  hydrate: () => Promise<void>
  bootReady: boolean
  setBootReady: (ready: boolean) => void

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

  // Hydrate from DB on app start
  hydrate: async () => {
    try {
      const all = await getAllSettings()
      set({
        lockEnabled: all.lockEnabled,
        biometricEnabled: all.biometricEnabled,
        remindersEnabled: all.remindersEnabled,
        defaultTab: all.defaultTab,
        bootReady: true,
      })
    } catch (err) {
      console.error('[useSettingsStore] Hydration error:', err)
      set({ bootReady: true })
    }
  },

  setBootReady: (ready) => set({ bootReady: ready }),

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
