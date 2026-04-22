import { create }      from 'zustand'
import * as SecureStore from 'expo-secure-store'
import type { ThemeKey } from '../constants/themes'
import { STORAGE_KEYS }  from '../constants'
import type { PremiumPlan } from '../services/premiumService'

// ─── Theme store ──────────────────────────────────────────────────────────────

interface ThemeState {
  themeKey:  ThemeKey
  setTheme:  (key: ThemeKey) => void
  loadTheme: () => Promise<void>
}

export const useThemeStore = create<ThemeState>((set) => ({
  themeKey: 'indigo',
  setTheme: (key) => {
    set({ themeKey: key })
    SecureStore.setItemAsync(STORAGE_KEYS.THEME, key).catch(() => {})
  },
  loadTheme: async () => {
    try {
      const saved = await SecureStore.getItemAsync(STORAGE_KEYS.THEME)
      if (saved) set({ themeKey: saved as ThemeKey })
    } catch {}
  },
}))

// ─── App store — selected day, data version ───────────────────────────────────

type DayKey = 'MON' | 'TUE' | 'WED' | 'THU' | 'FRI' | 'SAT' | 'SUN'

interface AppState {
  selectedDay:    DayKey
  dataVersion:    number
  setSelectedDay: (day: DayKey) => void
  invalidateData: () => void
}

const getTodayKey = (): DayKey => {
  const days: DayKey[] = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']
  return days[new Date().getDay()]
}

export const useAppStore = create<AppState>((set) => ({
  selectedDay:    getTodayKey(),
  dataVersion:    0,
  setSelectedDay: (day) => set({ selectedDay: day }),
  invalidateData: ()    => set((s) => ({ dataVersion: s.dataVersion + 1 })),
}))

// ─── Premium store ─────────────────────────────────────────────────────────────

interface PremiumState {
  isPremium:      boolean
  plan:           PremiumPlan
  loading:        boolean
  setEntitlement: (active: boolean, plan: PremiumPlan) => void
  setLoading:     (v: boolean) => void
}

export const usePremiumStore = create<PremiumState>((set) => ({
  isPremium:      false,
  plan:           null,
  loading:        true,
  setEntitlement: (active, plan) => set({ isPremium: active, plan, loading: false }),
  setLoading:     (v)            => set({ loading: v }),
}))

// ─── Purchase Readiness store ──────────────────────────────────────────────────

export { usePurchaseReadinessStore } from './purchase-readiness.store'

// ─── Settings store (Phase 2) ─────────────────────────────────────────────────

export { useSettingsStore } from './settings.store'
