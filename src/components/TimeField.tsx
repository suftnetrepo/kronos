import React from 'react'
import { StyledDropdown, type DropdownOptionItem } from 'fluent-styles'

export const TIME_OPTIONS: DropdownOptionItem[] = Array.from({ length: 24 * 4 }, (_, i) => {
  const h = Math.floor(i / 4)
  const m = (i % 4) * 15
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
})
  .filter((t) => {
    const [h] = t.split(':').map(Number)
    return h >= 6 && h <= 22
  })
  .map((t) => ({ value: t, label: t }))

// fluent-styles' own StyledDropdown — an anchored, position-measured panel,
// not a bottom-sheet Modal driven by a JS Animated transform (see Popup's
// runAnimation). It still opens through a transparent RN `Modal`, so it
// isn't guaranteed proof against the same real-device keyboard interaction,
// but it doesn't share Popup's specific mechanism (a native-driver
// Animated.Value composed against a frame the keyboard's async native
// resize may have changed underneath it) — its panel position is measured
// once via onLayout, not animated into place.
export function TimeField({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (time: string) => void
}) {
  return (
    <StyledDropdown
      label={label}
      placeholder="Select time"
      data={TIME_OPTIONS}
      value={value}
      onChange={(item) => onChange(item.value)}
      variant="filled"
     
    />
  )
}
