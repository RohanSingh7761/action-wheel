import React, { useState, useCallback, useRef, useEffect } from 'react'
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
  const hoveredIndexRef = useRef<number | null>(null)
  hoveredIndexRef.current = hoveredIndex

  const wheelSize = (OUTER_R + 16) * 2
  const halfSize = wheelSize / 2

  // ── Lock the wheel position permanently at initial trigger coordinates ──
  const centerPos = useRef({
    cx: Math.max(halfSize, Math.min(triggerData.cursorX, window.innerWidth - halfSize)),
    cy: Math.max(halfSize, Math.min(triggerData.cursorY, window.innerHeight - halfSize))
  })
  const { cx, cy } = centerPos.current

  const handleSegmentClick = useCallback(
    async (action: ActionId, filePath: string) => {
      if (isProcessing) return
      const api = (window as any).overlayAPI
      if (!api) return
      try {
        const res = await api.selectAction({ action, filePath })
        if (res?.needsParams) {
          onDismiss()
        }
      } catch (err) {
        console.error('selectAction error:', err)
      }
    },
    [isProcessing, onDismiss]
  )

  // Escape or Tab key dismisses
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'Tab') {
        e.preventDefault()
        onDismiss()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onDismiss])

  // ── Global pointer tracking for both MouseMove and DragOver ──
  useEffect(() => {
    const checkAngle = (clientX: number, clientY: number): number | null => {
      const dx = clientX - cx
      const dy = clientY - cy
      const dist = Math.sqrt(dx * dx + dy * dy)

      if (dist >= INNER_R * 0.6 && dist <= OUTER_R + 60) {
        const rad = Math.atan2(dy, dx)
        const deg = ((rad * 180) / Math.PI + 90 + 360) % 360
        const segAngle = 360 / TOTAL_SEGMENTS
        return Math.floor(deg / segAngle) % TOTAL_SEGMENTS
      }
      return null
    }

    const onPointerMove = (e: MouseEvent | DragEvent) => {
      e.preventDefault()
      const idx = checkAngle(e.clientX, e.clientY)
      setHoveredIndex(idx)
    }

    const onPointerRelease = (e: MouseEvent | DragEvent) => {
      e.preventDefault()
      const idx = checkAngle(e.clientX, e.clientY)
      if (idx !== null) {
        const action = ACTIONS[idx]
        if (action) {
          handleSegmentClick(action.id, triggerData.filePath)
        }
      } else {
        onDismiss()
      }
    }

    // Window events handle both standard mouse and OS file drag
    window.addEventListener('mousemove', onPointerMove)
    window.addEventListener('dragover', onPointerMove)
    window.addEventListener('mouseup', onPointerRelease)
    window.addEventListener('drop', onPointerRelease)

    return () => {
      window.removeEventListener('mousemove', onPointerMove)
      window.removeEventListener('dragover', onPointerMove)
      window.removeEventListener('mouseup', onPointerRelease)
      window.removeEventListener('drop', onPointerRelease)
    }
  }, [cx, cy, handleSegmentClick, onDismiss, triggerData.filePath])

  // Click outside wheel = dismiss
  const handleBackdropClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const target = e.target as HTMLElement
      if (target.id === 'wheel-backdrop') {
        onDismiss()
      }
    },
    [onDismiss]
  )

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

      {/* The Wheel — Fixed at (cx, cy) */}
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

        {/* Center preview circle */}
        <div
          className="absolute"
          style={{
            left: halfSize - INNER_R,
            top: halfSize - INNER_R,
            width: INNER_R * 2,
            height: INNER_R * 2,
            pointerEvents: 'auto'
          }}
        >
          <CenterPreview
            thumbnail={triggerData.thumbnail}
            filePath={triggerData.filePath}
            isProcessing={isProcessing}
            hoveredAction={hoveredIndex !== null ? ACTIONS[hoveredIndex] : null}
            onCancel={onDismiss}
          />
        </div>

        {/* Floating Cancel Pill Button below the wheel */}
        <div
          className="absolute flex items-center justify-center"
          style={{
            left: 0,
            right: 0,
            top: wheelSize + 10,
            pointerEvents: 'none'
          }}
        >
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onDismiss()
            }}
            className="pointer-events-auto flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs font-medium text-white/80 hover:text-white bg-black/50 hover:bg-rose-950/70 border border-white/20 hover:border-rose-500/60 backdrop-blur-xl transition-all cursor-pointer shadow-lg active:scale-95"
          >
            <span className="text-rose-400 font-bold">✕</span>
            <span>Cancel</span>
            <span className="text-[10px] text-white/40 font-mono ml-1">Esc / Tab</span>
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}
