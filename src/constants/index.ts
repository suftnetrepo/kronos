import { IndigoTheme } from './themes'

export { useColors }    from './useColors'
export * from './themes'

// Static fallback for non-React contexts
export const Colors = IndigoTheme

export const Fonts = {
  regular:   'PlusJakartaSans_400Regular',
  medium:    'PlusJakartaSans_500Medium',
  semiBold:  'PlusJakartaSans_600SemiBold',
  bold:      'PlusJakartaSans_700Bold',
  extraBold: 'PlusJakartaSans_800ExtraBold',
} as const

export const STORAGE_KEYS = {
  THEME: 'kronos_theme',
} as const

// Class/timetable reminder options in minutes
export const REMINDER_OPTIONS = [
  { label: 'None',        value: null },
  { label: '5 minutes',   value: 5    },
  { label: '10 minutes',  value: 10   },
  { label: '15 minutes',  value: 15   },
  { label: '30 minutes',  value: 30   },
  { label: '1 hour',      value: 60   },
] as const

// Exam reminder options in minutes
export const EXAM_REMINDER_OPTIONS = [
  { label: 'None',            value: null },
  { label: '1 hour before',   value: 60   },
  { label: '1 day before',    value: 1440 },
  { label: '3 days before',   value: 4320 },
  { label: '1 week before',   value: 10080 },
] as const
