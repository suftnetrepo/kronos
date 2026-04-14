// ─── Product identifiers (match App Store Connect / Play Console) ─────────────
export const PREMIUM_PRODUCTS = {
  MONTHLY:  'com.kronos.timetable.premium.monthly',
  YEARLY:   'com.kronos.timetable.premium.yearly',
  ONE_TIME: 'com.kronos.timetable.premium.lifetime',
} as const

// ─── Pricing display (update to match App Store prices) ───────────────────────
export const PREMIUM_PRICING = {
  MONTHLY:  { price: '£0.99', period: 'per month', label: 'Monthly' },
  YEARLY:   { price: '£5.99', period: 'per year',  label: 'Yearly',  saving: 'Save 50%', trial: '7-day free trial' },
  ONE_TIME: { price: '£3.99', period: 'one-time',  label: 'Lifetime' },
} as const

// ─── Free tier limits ──────────────────────────────────────────────────────────
export const FREE_LIMITS = {
  SUBJECTS:         3,
  HOMEWORK_MONTH:   10,
  EXAMS:            3,
} as const

// ─── Feature list shown on paywall ────────────────────────────────────────────
export const PREMIUM_FEATURES = [
  { icon: '📚', title: 'Unlimited subjects',   description: 'Add every class to your timetable' },
  { icon: '📝', title: 'Unlimited homework',   description: 'No monthly cap on homework entries' },
  { icon: '🎓', title: 'Unlimited exams',      description: 'Track every exam, no limits' },
  { icon: '🎨', title: 'All themes',           description: 'Ocean, Forest, Midnight and Rose themes' },
  { icon: '🔔', title: 'Smart reminders',      description: 'Never miss a deadline or exam' },
  { icon: '🔄', title: 'Future features',      description: 'Widgets, semester view & more coming soon' },
] as const

// ─── Theme keys that require premium ──────────────────────────────────────────
// 'indigo' is the free default — all others are premium
export const PREMIUM_THEMES = ['ocean', 'forest', 'midnight', 'rose'] as const

// ─── SecureStore key ──────────────────────────────────────────────────────────
export const PREMIUM_STORAGE_KEY = 'kronos_premium_entitlement'
