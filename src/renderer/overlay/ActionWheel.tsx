import React, { useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import WheelSegment from './WheelSegment'
import CenterPreview from './CenterPreview'
import type { ActionId, TriggerPayload } from '../../shared/ipc-types'
import { ACTIONS } from '../../shared/ipc-types'

interface ActionWheelProps {
  triggerData: TriggerPayload
  isProcessing: boolean
  processingAction: string | null
  onDismiss: () => void
}

const INNER_R = 68
const OUTER_R = 155
const TOTAL_SEGMENTS = ACTIONS.length // 6
const GAP_DEG = 4 // degrees of gap between segments

function polarToCart(angleDeg: number, r: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180
  return { x: r * Math.cos(rad), y: r * Math.sin(rad) }
}

function segmentPath(index: number, total: number, innerR: number, outerR: number): string {
  const degPerSeg = 360 / total
  const startDeg = index * degPerSeg + GAP_DEG / 2
  const endDeg = (index + 1) * degPerSeg - GAP_DEG / 2
  const largeArc = endDeg - startDeg > 180 ? 1 : 0

  const s1 = polarToCart(startDeg, innerR)
  const s2 = polarToCart(endDeg, innerR)
  const o1 = polarToCart(startDeg, outerR)
  const o2 = polarToCart(endDeg, outerR)

  return [
    `M ${s1.x.toFixed(3)} ${s1.y.toFixed(3)}`,
    `A ${innerR} ${innerR} 0 ${largeArc} 1 ${s2.x.toFixed(3)} ${s2.y.toFixed(3)}`,
    `L ${o2.x.toFixed(3)} ${o2.y.toFixed(3)}`,
    `A ${outerR} ${outerR} 0 ${largeArc} 0 ${o1.x.toFixed(3)} ${o1.y.toFixed(3)}`,
    'Z'
  ].join(' ')
}

function labelPosition(index: number, total: number): { x: number; y: number } {
  const midR = (INNER_R + OUTER_R) / 2
  const degPerSeg = 360 / total
  const midDeg = index * degPerSeg + degPerSeg / 2
  return polarToCart(midDeg, midR)
}

export default function ActionWheel({
  triggerData,
  isProcessing,
  processingAction,
  onDismiss
}: ActionWheelProps): React.ReactElement {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)

  // Clamp position so wheel never goes off screen
  const wheelSize = (OUTER_R + 16) * 2
  const halfSize = wheelSize / 2
  const cx = Math.max(halfSize, Math.min(triggerData.cursorX, window.innerWidth - halfSize))
  const cy = Math.max(halfSize, Math.min(triggerData.cursorY, window.innerHeight - halfSize))

  const handleSegmentClick = useCallback(async (action: ActionId, filePath: string) => {
    if (isProcessing) return
    const api = (window as any).overlayAPI
    if (!api) return
    try {
      await api.selectAction({ action, filePath })
    } catch (err) {
      console.error('selectAction error:', err)
    }
  }, [isProcessing])

  // Click outside wheel = dismiss
  const handleBackdropClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement
    if (target.id === 'wheel-backdrop') {
      onDismiss()
    }
  }, [onDismiss])

  return (
    <motion.div
      id="wheel-backdrop"
      className="fixed inset-0 flex items-center justify-center"
      style={{ background: 'transparent', cursor: 'default' }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.1 }}
      onClick={handleBackdropClick}
    >
      {/* Subtle radial dark vignette so wheel pops */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          background: `radial-gradient(circle ${OUTER_R + 80}px at ${cx}px ${cy}px, transparent 60%, rgba(0,0,0,0.25) 100%)`
        }}
      />

      {/* The Wheel */}
      <motion.div
        className="absolute"
        style={{
          left: cx - halfSize,
          top: cy - halfSize,
          width: wheelSize,
          height: wheelSize,
          pointerEvents: 'none'
        }}
        initial={{ scale: 0.35, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.35, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 420, damping: 28, mass: 0.8 }}
      >
        <svg
          width={wheelSize}
          height={wheelSize}
          viewBox={`${-halfSize} ${-halfSize} ${wheelSize} ${wheelSize}`}
          style={{ overflow: 'visible', pointerEvents: 'all' }}
        >
          {/* Drop shadow filter */}
          <defs>
            <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="4" stdDeviation="12" floodColor="rgba(0,0,0,0.5)" />
            </filter>
            <filter id="glow" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="6" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          <g filter="url(#shadow)">
            {ACTIONS.map((action, i) => (
              <WheelSegment
                key={action.id}
                index={i}
                total={TOTAL_SEGMENTS}
                action={action}
                path={segmentPath(i, TOTAL_SEGMENTS, INNER_R, OUTER_R)}
                labelPos={labelPosition(i, TOTAL_SEGMENTS)}
                isHovered={hoveredIndex === i}
                isProcessing={isProcessing && processingAction === action.id}
                onHover={() => setHoveredIndex(i)}
                onLeave={() => setHoveredIndex(null)}
                onClick={() => handleSegmentClick(action.id, triggerData.filePath)}
              />
            ))}
          </g>
        </svg>

        {/* Center preview circle (absolutely positioned) */}
        <div
          className="absolute"
          style={{
            left: halfSize - INNER_R,
            top: halfSize - INNER_R,
            width: INNER_R * 2,
            height: INNER_R * 2,
            pointerEvents: 'none'
          }}
        >
          <CenterPreview
            thumbnail={triggerData.thumbnail}
            filePath={triggerData.filePath}
            isProcessing={isProcessing}
            hoveredAction={hoveredIndex !== null ? ACTIONS[hoveredIndex] : null}
          />
        </div>
      </motion.div>
    </motion.div>
  )
}
