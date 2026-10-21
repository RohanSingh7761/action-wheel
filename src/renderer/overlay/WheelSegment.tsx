import React from 'react'
import { motion } from 'framer-motion'
import type { ActionMeta } from '../../shared/ipc-types'

interface WheelSegmentProps {
  index: number
  total: number
  action: ActionMeta
  path: string
  labelPos: { x: number; y: number }
  isHovered: boolean
  isProcessing: boolean
  onHover: () => void
  onLeave: () => void
}

function renderVectorIcon(icon: string, isHovered: boolean) {
  const stroke = isHovered ? '#FFFFFF' : 'rgba(215, 222, 235, 0.72)'
  const strokeWidth = isHovered ? 1.85 : 1.75

  switch (icon) {
    case 'pdf':
      return (
        <g stroke={stroke} strokeWidth={strokeWidth} fill="none" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <path d="M9 13v4" />
          <path d="M12 13v4" />
          <path d="M15 13v4" />
        </g>
      )
    case 'convert':
      return (
        <g stroke={stroke} strokeWidth={strokeWidth} fill="none" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
          <path d="M3 3v5h5" />
          <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
          <path d="M21 21v-5h-5" />
        </g>
      )
    case 'crop':
      return (
        <g stroke={stroke} strokeWidth={strokeWidth} fill="none" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 2v14a2 2 0 0 0 2 2h14" />
          <path d="M18 22V8a2 2 0 0 0-2-2H2" />
        </g>
      )
    case 'compress':
      return (
        <g stroke={stroke} strokeWidth={strokeWidth} fill="none" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 14h6v6" />
          <path d="M20 10h-6V4" />
          <path d="M14 10l7-7" />
          <path d="M3 21l7-7" />
        </g>
      )
    case 'copy':
      return (
        <g stroke={stroke} strokeWidth={strokeWidth} fill="none" strokeLinecap="round" strokeLinejoin="round">
          <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
        </g>
      )
    default:
      return null
  }
}

export default function WheelSegment({
  index,
  action,
  path,
  labelPos,
  isHovered,
  isProcessing,
  onHover,
  onLeave
}: WheelSegmentProps): React.ReactElement {
  // Production-grade restrained surface
  const fillColor = isHovered ? 'rgba(32, 36, 45, 0.96)' : 'rgba(18, 20, 26, 0.92)'
  const strokeColor = isHovered ? 'rgba(255, 255, 255, 0.32)' : 'rgba(255, 255, 255, 0.08)'

  return (
    <g style={{ cursor: 'pointer' }}>
      {/* Segment Arc Body */}
      <motion.path
        d={path}
        fill={fillColor}
        stroke={strokeColor}
        strokeWidth={isHovered ? 1.25 : 0.85}
        initial={false}
        animate={{
          fill: fillColor,
          stroke: strokeColor
        }}
        transition={{ duration: 0.12, ease: 'easeOut' }}
        onMouseEnter={onHover}
        onMouseLeave={onLeave}
      />

      {/* Subtle top edge highlight when hovered */}
      {isHovered && (
        <path
          d={path}
          fill="none"
          stroke="rgba(255, 255, 255, 0.18)"
          strokeWidth={2}
          style={{ pointerEvents: 'none' }}
        />
      )}

      {/* Vector Line Icon */}
      <svg
        x={labelPos.x - 11}
        y={labelPos.y - 20}
        width={22}
        height={22}
        viewBox="0 0 24 24"
        style={{ pointerEvents: 'none', overflow: 'visible' }}
      >
        {renderVectorIcon(action.icon, isHovered)}
      </svg>

      {/* Action Label */}
      <text
        x={labelPos.x}
        y={labelPos.y + 14}
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize="11.5"
        fontWeight={isHovered ? '600' : '500'}
        letterSpacing="0.015em"
        fill={isHovered ? '#FFFFFF' : 'rgba(225, 230, 240, 0.72)'}
        fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI Variable Text', 'Segoe UI', sans-serif"
        style={{ pointerEvents: 'none', userSelect: 'none', transition: 'fill 0.12s ease' }}
      >
        {action.label}
      </text>

      {/* Processing Spinner Arc */}
      {isProcessing && (
        <motion.path
          d={path}
          fill="rgba(255, 255, 255, 0.08)"
          stroke="#ffffff"
          strokeWidth={1.5}
          strokeDasharray="16 64"
          animate={{ strokeDashoffset: [0, -80] }}
          transition={{ duration: 0.7, repeat: Infinity, ease: 'linear' }}
          style={{ pointerEvents: 'none' }}
        />
      )}
    </g>
  )
}
