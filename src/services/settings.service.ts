import { db } from '../db'
import { settings } from '../db/schema'
import { eq } from 'drizzle-orm'

/**
 * Settings Service
 *
 * Provides centralized access to app-level settings via the singleton settings record.
 * All settings are persisted in the database and hydrated into the settings store on app start.
 */

export interface AppSettings {
  lockEnabled: boolean
  biometricEnabled: boolean
  remindersEnabled: boolean
  defaultTab: 'index' | 'homework' | 'exams'
  downloadedExportPath?: string
}

const DEFAULT_SETTINGS: AppSettings = {
  lockEnabled: false,
  biometricEnabled: false,
  remindersEnabled: true,
  defaultTab: 'index',
}

/**
 * Ensure settings singleton exists
 */
const ensureSingleton = async (): Promise<void> => {
  const existing = await db
    .select()
    .from(settings)
    .where(eq(settings.id, 'singleton'))
    .limit(1)

  if (!existing.length) {
    await db.insert(settings).values({
      id: 'singleton',
      firstDayOfWeek: 'MON',
      updatedAt: new Date(),
    })
  }
}

/**
 * Get a single app setting
 * Falls back to default if not found
 */
export const getSetting = async <T = unknown>(key: keyof AppSettings): Promise<T | null> => {
  try {
    await ensureSingleton()
    const rows = await db
      .select()
      .from(settings)
      .where(eq(settings.id, 'singleton'))
      .limit(1)

    if (!rows.length) return null

    const record = rows[0]
    const value = record[key as keyof typeof record]

    if (value === null || value === undefined) {
      return DEFAULT_SETTINGS[key] as T
    }

    return value as T
  } catch (err) {
    console.warn(`[settingsService] Error reading setting ${key}:`, err)
    return DEFAULT_SETTINGS[key] as T
  }
}

/**
 * Set a single app setting
 */
export const setSetting = async (key: keyof AppSettings, value: unknown): Promise<void> => {
  try {
    await ensureSingleton()
    await db
      .update(settings)
      .set({ [key]: value, updatedAt: new Date() })
      .where(eq(settings.id, 'singleton'))
  } catch (err) {
    console.error(`[settingsService] Error writing setting ${key}:`, err)
    throw err
  }
}

/**
 * Get all app settings
 */
export const getAllSettings = async (): Promise<AppSettings> => {
  try {
    await ensureSingleton()
    const rows = await db
      .select()
      .from(settings)
      .where(eq(settings.id, 'singleton'))
      .limit(1)

    if (!rows.length) return DEFAULT_SETTINGS

    const record = rows[0]
    return {
      lockEnabled: record.lockEnabled ?? DEFAULT_SETTINGS.lockEnabled,
      biometricEnabled: record.biometricEnabled ?? DEFAULT_SETTINGS.biometricEnabled,
      remindersEnabled: record.remindersEnabled ?? DEFAULT_SETTINGS.remindersEnabled,
      defaultTab: (record.defaultTab as any) ?? DEFAULT_SETTINGS.defaultTab,
      downloadedExportPath: record.downloadedExportPath ?? undefined,
    } as AppSettings
  } catch (err) {
    console.warn('[settingsService] Error reading all settings:', err)
    return DEFAULT_SETTINGS
  }
}

export const settingsService = {
  getSetting,
  setSetting,
  getAllSettings,
}
