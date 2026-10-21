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
  onClick: () => void
}

export default function WheelSegment({
  index,
  action,
  path,
  labelPos,
  isHovered,
  isProcessing,
  onHover,
  onLeave,
  onClick
}: WheelSegmentProps): React.ReactElement {
  // Parse the accent color to extract rgba values for glass effect
  const baseColor = isHovered
    ? action.color.replace(/[\d.]+\)$/, '0.92)')
    : action.color.replace(/[\d.]+\)$/, '0.55)')

  const borderColor = isHovered
    ? 'rgba(255,255,255,0.5)'
    : 'rgba(255,255,255,0.15)'

  return (
    <motion.g
      initial={{ scale: 0.6, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{
        type: 'spring',
        stiffness: 500,
        damping: 30,
        delay: index * 0.025
      }}
      style={{ transformOrigin: '0px 0px', transformBox: 'fill-box' }}
    >
      {/* Segment fill */}
      <motion.path
        d={path}
        fill={baseColor}
        stroke={borderColor}
        strokeWidth={isHovered ? 1.5 : 1}
        style={{ cursor: 'pointer', backdropFilter: 'blur(20px)' }}
        animate={{
          scale: isHovered ? 1.04 : 1,
          filter: isHovered
            ? `drop-shadow(0 0 12px ${action.accentColor}88)`
            : 'none'
        }}
        transition={{ type: 'spring', stiffness: 600, damping: 35 }}
        onMouseEnter={onHover}
        onMouseLeave={onLeave}
        onClick={onClick}
      />

      {/* Glow ring on hover */}
      {isHovered && (
        <motion.path
          d={path}
          fill="none"
          stroke={action.accentColor}
          strokeWidth={2}
          opacity={0.7}
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.7 }}
          exit={{ opacity: 0 }}
          style={{ pointerEvents: 'none' }}
        />
      )}

      {/* Icon */}
      <text
        x={labelPos.x}
        y={labelPos.y - 10}
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize="22"
        style={{ pointerEvents: 'none', userSelect: 'none' }}
      >
        {action.icon}
      </text>

      {/* Label */}
      <text
        x={labelPos.x}
        y={labelPos.y + 16}
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize="11"
        fontWeight={isHovered ? '700' : '500'}
        fill={isHovered ? '#ffffff' : 'rgba(255,255,255,0.85)'}
        fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
        style={{ pointerEvents: 'none', userSelect: 'none' }}
      >
        {action.label}
      </text>

      {/* Processing spinner arc overlay */}
      {isProcessing && (
        <motion.path
          d={path}
          fill="rgba(255,255,255,0.2)"
          stroke="white"
          strokeWidth={2}
          strokeDasharray="20 80"
          animate={{ strokeDashoffset: [0, -100] }}
          transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
          style={{ pointerEvents: 'none' }}
        />
      )}
    </motion.g>
  )
}
