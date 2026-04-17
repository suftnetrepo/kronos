import { useCallback } from 'react'
import { useSettingsStore } from '../stores/settings.store'

/**
 * Custom hook to access and update app settings
 *
 * Usage:
 *   const { lockEnabled, setLockEnabled } = useSettings()
 */
export const useSettings = () => {
  const {
    lockEnabled,
    biometricEnabled,
    remindersEnabled,
    setLockEnabled,
    setBiometricEnabled,
    setRemindersEnabled,
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

  return {
    lockEnabled,
    biometricEnabled,
    remindersEnabled,
    setLockEnabled: updateLock,
    setBiometricEnabled: updateBiometric,
    setRemindersEnabled: updateReminders,
  }
}
