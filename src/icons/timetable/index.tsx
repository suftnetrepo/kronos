import React from 'react'
import Svg, { Path, Circle } from 'react-native-svg'

interface IconProps {
  size?:        number
  color?:       string
  strokeWidth?: number
}

// ─── Lightning bolt (Kronos logo) ─────────────────────────────────────────────
export const LightningBoltIcon: React.FC<{ size?: number; color?: string }> = ({
  size = 24, color = '#fff',
}) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M13 2L4.09 12.97A1 1 0 005 14.5h6.5L11 22l8.91-10.97A1 1 0 0019 9.5h-6.5L13 2z"
      fill={color}
    />
  </Svg>
)

// ─── Import (download arrow into tray) ────────────────────────────────────────
export const ImportIcon: React.FC<IconProps> = ({
  size = 24, color = '#000', strokeWidth = 2,
}) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"
      stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"
    />
    <Path
      d="M7 10l5 5 5-5"
      stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"
    />
    <Path
      d="M12 15V3"
      stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"
    />
  </Svg>
)

// ─── Share (three connected nodes) ────────────────────────────────────────────
export const ShareIcon: React.FC<IconProps> = ({
  size = 24, color = '#000', strokeWidth = 2,
}) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Circle cx={18} cy={5}  r={3} stroke={color} strokeWidth={strokeWidth} />
    <Circle cx={6}  cy={12} r={3} stroke={color} strokeWidth={strokeWidth} />
    <Circle cx={18} cy={19} r={3} stroke={color} strokeWidth={strokeWidth} />
    <Path
      d="M8.59 13.51l6.83 3.98M15.41 6.51l-6.82 3.98"
      stroke={color} strokeWidth={strokeWidth} strokeLinecap="round"
    />
  </Svg>
)
