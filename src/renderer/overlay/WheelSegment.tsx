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
  onLeave
}: Omit<WheelSegmentProps, 'onClick'>): React.ReactElement {
  const baseColor = isHovered
    ? 'rgba(255, 255, 255, 0.18)'
    : 'rgba(18, 20, 26, 0.78)'

  const borderColor = isHovered
    ? 'rgba(255, 255, 255, 0.65)'
    : 'rgba(255, 255, 255, 0.14)'

  return (
    <motion.g
      initial={{ scale: 0.6, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{
        type: 'spring',
        stiffness: 500,
        damping: 30,
        delay: index * 0.02
      }}
      style={{ transformOrigin: '0px 0px', transformBox: 'fill-box' }}
    >
      {/* Segment fill */}
      <motion.path
        d={path}
        fill={baseColor}
        stroke={borderColor}
        strokeWidth={isHovered ? 1.5 : 1}
        style={{ cursor: 'pointer', backdropFilter: 'blur(28px)' }}
        animate={{
          scale: isHovered ? 1.045 : 1,
          filter: isHovered
            ? 'drop-shadow(0 0 18px rgba(255, 255, 255, 0.28))'
            : 'none'
        }}
        transition={{ type: 'spring', stiffness: 600, damping: 35 }}
        onMouseEnter={onHover}
        onMouseLeave={onLeave}
      />

      {/* Glow ring on hover */}
      {isHovered && (
        <motion.path
          d={path}
          fill="none"
          stroke="rgba(255, 255, 255, 0.75)"
          strokeWidth={2}
          opacity={0.8}
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.8 }}
          exit={{ opacity: 0 }}
          style={{ pointerEvents: 'none' }}
        />
      )}

      {/* Icon */}
      <text
        x={labelPos.x}
        y={labelPos.y - 11}
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize="24"
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
        fontSize="11.5"
        fontWeight={isHovered ? '600' : '500'}
        letterSpacing="0.01em"
        fill={isHovered ? '#ffffff' : 'rgba(255, 255, 255, 0.75)'}
        fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
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
