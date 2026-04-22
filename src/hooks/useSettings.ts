import { useCallback } from 'react'
import { useSettingsStore } from '../stores/settings.store'

/**
 * Custom hook to access and update app settings
 *
 * Usage:
 *   const { lockEnabled, setLockEnabled, defaultTab, setDefaultTab } = useSettings()
 */
export const useSettings = () => {
  const {
    lockEnabled,
    biometricEnabled,
    remindersEnabled,
    defaultTab,
    setLockEnabled,
    setBiometricEnabled,
    setRemindersEnabled,
    setDefaultTab,
  } = useSettingsStore()

  const updateLock = useCallback(
    (enabled: boolean) => setLockEnabled(enabled),
    [setLockEnabled]
  )

  const updateBiometric = useCallback(
    (enabled: boolean) => setBiometricEnabled(enabled),
    [setBiometricEnabled]
  )

  const updateReminders = useCallback(
    (enabled: boolean) => setRemindersEnabled(enabled),
    [setRemindersEnabled]
  )

  const updateDefaultTab = useCallback(
    (tab: 'index' | 'homework' | 'exams') => setDefaultTab(tab),
    [setDefaultTab]
  )

  return {
    lockEnabled,
    biometricEnabled,
    remindersEnabled,
    defaultTab,
    setLockEnabled: updateLock,
    setBiometricEnabled: updateBiometric,
    setRemindersEnabled: updateReminders,
    setDefaultTab: updateDefaultTab,
  }
}
