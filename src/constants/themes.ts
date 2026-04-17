import { palettes } from 'fluent-styles'

export type ThemeKey = 'indigo' | 'ocean' | 'forest' | 'midnight' | 'rose'

export interface AppColors {
  primary:       string
  primaryDark:   string
  primaryLight:  string
  accent:        string
  bg:            string
  bgCard:        string
  bgInput:       string
  bgMuted:       string
  textPrimary:   string
  textSecondary: string
  textMuted:     string
  textOnDark:    string
  border:        string
  borderFocus:   string
  success:       string
  warning:       string
  error:         string
  info:          string
  white:         string
  // Subject chip colours
  chipBg:        string
  chipActive:    string
}

// ─── Indigo (default) ─────────────────────────────────────────────────────────
export const IndigoTheme: AppColors = {
  primary:       palettes.indigo[600],
  primaryDark:   palettes.indigo[800],
  primaryLight:  palettes.indigo[400],
  accent:        palettes.indigo[50],
  bg:            '#F5F5F7',
  bgCard:        palettes.white,
  bgInput:       palettes.coolGray[100],
  bgMuted:       palettes.coolGray[200],
  textPrimary:   palettes.gray[900],
  textSecondary: palettes.gray[600],
  textMuted:     palettes.gray[400],
  textOnDark:    palettes.white,
  border:        palettes.coolGray[200],
  borderFocus:   palettes.indigo[500],
  success:       palettes.green[600],
  warning:       palettes.amber[500],
  error:         palettes.red[600],
  info:          palettes.blue[600],
  white:         palettes.white,
  chipBg:        palettes.coolGray[100],
  chipActive:    palettes.indigo[600],
}

// ─── Ocean ────────────────────────────────────────────────────────────────────
export const OceanTheme: AppColors = {
  primary:       palettes.blue[600],
  primaryDark:   palettes.blue[800],
  primaryLight:  palettes.blue[400],
  accent:        palettes.blue[50],
  bg:            palettes.blueGray[50],
  bgCard:        palettes.white,
  bgInput:       palettes.blueGray[100],
  bgMuted:       palettes.blueGray[200],
  textPrimary:   palettes.blueGray[900],
  textSecondary: palettes.blueGray[600],
  textMuted:     palettes.blueGray[400],
  textOnDark:    palettes.white,
  border:        palettes.blueGray[200],
  borderFocus:   palettes.blue[500],
  success:       palettes.teal[600],
  warning:       palettes.amber[500],
  error:         palettes.red[600],
  info:          palettes.blue[500],
  white:         palettes.white,
  chipBg:        palettes.blueGray[100],
  chipActive:    palettes.blue[600],
}

// ─── Forest ───────────────────────────────────────────────────────────────────
export const ForestTheme: AppColors = {
  primary:       palettes.green[700],
  primaryDark:   palettes.green[900],
  primaryLight:  palettes.green[500],
  accent:        palettes.green[50],
  bg:            palettes.warmGray[50],
  bgCard:        palettes.white,
  bgInput:       palettes.warmGray[100],
  bgMuted:       palettes.warmGray[200],
  textPrimary:   palettes.gray[900],
  textSecondary: palettes.gray[600],
  textMuted:     palettes.gray[400],
  textOnDark:    palettes.white,
  border:        palettes.warmGray[200],
  borderFocus:   palettes.green[600],
  success:       palettes.green[600],
  warning:       palettes.amber[500],
  error:         palettes.red[600],
  info:          palettes.blue[600],
  white:         palettes.white,
  chipBg:        palettes.warmGray[100],
  chipActive:    palettes.green[700],
}

// ─── Midnight ─────────────────────────────────────────────────────────────────
export const MidnightTheme: AppColors = {
  primary:       palettes.violet[400],
  primaryDark:   palettes.violet[600],
  primaryLight:  palettes.violet[300],
  accent:        palettes.violet[900],
  bg:            palettes.blueGray[900],
  bgCard:        palettes.blueGray[800],
  bgInput:       palettes.blueGray[700],
  bgMuted:       palettes.blueGray[700],
  textPrimary:   palettes.blueGray[50],
  textSecondary: palettes.blueGray[300],
  textMuted:     palettes.blueGray[500],
  textOnDark:    palettes.white,
  border:        palettes.blueGray[700],
  borderFocus:   palettes.violet[400],
  success:       palettes.emerald[400],
  warning:       palettes.amber[400],
  error:         palettes.red[400],
  info:          palettes.blue[400],
  white:         palettes.white,
  chipBg:        palettes.blueGray[700],
  chipActive:    palettes.violet[400],
}


// ─── Rose ─────────────────────────────────────────────────────────────────────
export const RoseTheme: AppColors = {
  primary:       palettes.rose[500],
  primaryDark:   palettes.rose[700],
  primaryLight:  palettes.rose[300],
  accent:        palettes.rose[50],
  bg:            '#FDF6F7',
  bgCard:        palettes.white,
  bgInput:       palettes.pink[50],
  bgMuted:       palettes.pink[100],
  textPrimary:   palettes.gray[900],
  textSecondary: palettes.gray[600],
  textMuted:     palettes.gray[400],
  textOnDark:    palettes.white,
  border:        palettes.pink[100],
  borderFocus:   palettes.rose[400],
  success:       palettes.green[600],
  warning:       palettes.amber[500],
  error:         palettes.red[600],
  info:          palettes.blue[600],
  white:         palettes.white,
  chipBg:        palettes.pink[100],
  chipActive:    palettes.rose[500],
}

export const THEMES: Record<ThemeKey, AppColors> = {
  indigo:   IndigoTheme,
  ocean:    OceanTheme,
  forest:   ForestTheme,
  midnight: MidnightTheme,
  rose:     RoseTheme,
}

export const THEME_META: Record<ThemeKey, { label: string; emoji: string; preview: string[]; description: string }> = {
  indigo:   { label: 'Kronos',   emoji: '⚡', preview: [palettes.indigo[600],  palettes.indigo[400],  '#F5F5F7'], description: 'Clean and powerful — the default' },
  ocean:    { label: 'Ocean',    emoji: '🌊', preview: [palettes.blue[600],    palettes.blue[400],    palettes.blueGray[50]], description: 'Calm blues & serene waters' },
  forest:   { label: 'Forest',   emoji: '🌿', preview: [palettes.green[700],   palettes.green[500],   palettes.warmGray[50]], description: 'Natural greens & earthy tones' },
  midnight: { label: 'Midnight', emoji: '🌙', preview: [palettes.violet[400],  palettes.violet[300],  palettes.blueGray[900]], description: 'Dark mode with violet accents' },
  rose:     { label: 'Rose',     emoji: '🌸', preview: [palettes.rose[500],    palettes.pink[300],    '#FDF6F7'], description: 'Warm pinks & mauves' },
}

// ─── Subject colour palette — for the colour picker ───────────────────────────
export const SUBJECT_COLORS = [
  '#6366F1', // indigo
  '#8B5CF6', // violet
  '#EC4899', // pink
  '#EF4444', // red
  '#F97316', // orange
  '#EAB308', // yellow
  '#22C55E', // green
  '#14B8A6', // teal
  '#3B82F6', // blue
  '#06B6D4', // cyan
  '#84CC16', // lime
  '#F59E0B', // amber
  '#6B7280', // gray
  '#1F2937', // dark
] as const

export type SubjectColor = typeof SUBJECT_COLORS[number]
