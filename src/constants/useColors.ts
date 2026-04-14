import { useThemeStore } from '../stores'
import { THEMES }        from './themes'
import type { AppColors } from './themes'

export const useColors = (): AppColors => {
  const { themeKey } = useThemeStore()
  return THEMES[themeKey]
}
