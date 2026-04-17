// ─── Icon mappings for consistent UI across the app ───────────────────────────
// This file maps UI elements to their corresponding icon components

import {
  BoltIcon,
  DropletIcon,
  LeafIcon,
  MoonIcon,
  HeartIcon,
  BooksIcon,
  ClipboardIcon,
  PaletteIcon,
  BellIcon,
  RefreshIcon,
  TrashIcon,
  BeakerIcon,
} from '../icons/ui'

import type { ThemeKey } from './themes'

// ─── Theme icon mapping ────────────────────────────────────────────────────────
export const THEME_ICONS: Record<ThemeKey, React.FC<{ size?: number; color?: string; strokeWidth?: number }>> = {
  indigo:   BoltIcon,      // ⚡ → Lightning bolt
  ocean:    DropletIcon,   // 🌊 → Droplet/wave
  forest:   LeafIcon,      // 🌿 → Leaf
  midnight: MoonIcon,      // 🌙 → Moon
  rose:     HeartIcon,     // 🌸 → Heart
}

// ─── Premium feature icon order (to replace FEATURE_EMOJIS array) ──────────────
export const PREMIUM_FEATURE_ICONS = [
  BooksIcon,       // Unlimited subjects
  ClipboardIcon,   // Unlimited homework
  BoltIcon,        // Unlimited exams (using bolt as power/capability)
  PaletteIcon,     // All themes
  BellIcon,        // Smart reminders
  RefreshIcon,     // Future features
]

// ─── Settings row icons ───────────────────────────────────────────────────────
export const SETTINGS_ICONS = {
  premium: BoltIcon,
  resync: RefreshIcon,
  clearAll: TrashIcon,
  resetPremium: BeakerIcon,
}
