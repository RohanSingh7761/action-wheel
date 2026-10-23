import React, { useState, useCallback, useRef, useEffect } from 'react'
import { motion } from 'framer-motion'
import WheelSegment from './WheelSegment'
import CenterPreview from './CenterPreview'
import type { ActionId, TriggerPayload } from '../../shared/ipc-types'
import { ACTIONS, PDF_ACTIONS_SINGLE, PDF_ACTIONS_MULTIPLE } from '../../shared/ipc-types'
import { CloseIcon } from '../shared/Icons'

interface ActionWheelProps {
  triggerData: TriggerPayload
  isProcessing: boolean
  processingAction: string | null
  onDismiss: () => void
}

const INNER_R = 68
const OUTER_R = 156
const TOTAL_SEGMENTS = ACTIONS.length // 5
const GAP_DEG = 3 // Tight, precise 3-degree angular gap

function polarToCart(angleDeg: number, r: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180
  return { x: r * Math.cos(rad), y: r * Math.sin(rad) }
}

function segmentPath(index: number, total: number, innerR: number, outerR: number): string {
  const degPerSeg = 360 / total
  const offset = -degPerSeg / 2 // Centers segment 0 at 12 o'clock (0°)
  const startDeg = index * degPerSeg + offset + GAP_DEG / 2
  const endDeg = (index + 1) * degPerSeg + offset - GAP_DEG / 2
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
  const offset = -degPerSeg / 2
  const midDeg = index * degPerSeg + offset + degPerSeg / 2
  return polarToCart(midDeg, midR)
}

export default function ActionWheel({
  triggerData,
  isProcessing,
  processingAction,
  onDismiss
}: ActionWheelProps): React.ReactElement {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)
  const isSubmittingRef = useRef(false)

  // Dynamically select action set based on file type and selection size
  const isPdf = triggerData.fileType === 'pdf' || triggerData.filePath.toLowerCase().endsWith('.pdf')
  const activeActions = isPdf
    ? triggerData.isMultiple
      ? PDF_ACTIONS_MULTIPLE
      : PDF_ACTIONS_SINGLE
    : triggerData.isMultiple
    ? ACTIONS.filter((a) => a.id !== 'crop')
    : ACTIONS
  const totalSegments = activeActions.length

  const wheelSize = (OUTER_R + 16) * 2
  const halfSize = wheelSize / 2

  // Position the wheel centered at trigger coordinates with screen boundary safety
  const cx = Math.max(halfSize, Math.min(triggerData.cursorX, window.innerWidth - halfSize))
  const cy = Math.max(halfSize, Math.min(triggerData.cursorY, window.innerHeight - halfSize))

  const handleSegmentClick = useCallback(
    async (action: ActionId, filePath: string) => {
      if (isProcessing || isSubmittingRef.current) return
      isSubmittingRef.current = true
      const api = (window as any).overlayAPI
      if (!api) return
      try {
        await api.selectAction({
          action,
          filePath,
          filePaths: triggerData.filePaths,
          fileType: triggerData.fileType
        })
      } catch (err) {
        console.error('selectAction error:', err)
      } finally {
        setTimeout(() => {
          isSubmittingRef.current = false
        }, 500)
      }
    },
    [isProcessing, triggerData.filePaths, triggerData.fileType]
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

  // Global pointer tracking for both MouseMove and OS DragOver
  useEffect(() => {
    const checkAngle = (clientX: number, clientY: number): number | null => {
      const dx = clientX - cx
      const dy = clientY - cy
      const dist = Math.sqrt(dx * dx + dy * dy)

      if (dist >= INNER_R * 0.75 && dist <= OUTER_R + 50) {
        const rad = Math.atan2(dy, dx)
        const segAngle = 360 / totalSegments
        // Offset by +segAngle/2 to align with centered segment 0 at 12 o'clock
        const deg = ((rad * 180) / Math.PI + 90 + segAngle / 2 + 360) % 360
        return Math.floor(deg / segAngle) % totalSegments
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
        const action = activeActions[idx]
        if (action) {
          handleSegmentClick(action.id, triggerData.filePath)
        }
      } else {
        onDismiss()
      }
    }

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
      className="fixed inset-0 flex items-center justify-center select-none"
      style={{ background: 'transparent', cursor: 'default' }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.12 }}
      onClick={handleBackdropClick}
    >
      {/* Subtle radial depth gradient behind wheel for crisp separation */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          background: `radial-gradient(circle ${OUTER_R + 90}px at ${cx}px ${cy}px, rgba(0,0,0,0.18) 0%, transparent 80%)`
        }}
      />

      {/* The Radial Action Wheel */}
      <motion.div
        className="absolute"
        style={{
          left: cx - halfSize,
          top: cy - halfSize,
          width: wheelSize,
          height: wheelSize,
          pointerEvents: 'none'
        }}
        initial={{ scale: 0.94, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.96, opacity: 0 }}
        transition={{ duration: 0.14, ease: [0.16, 1, 0.3, 1] }}
      >
        <svg
          width={wheelSize}
          height={wheelSize}
          viewBox={`${-halfSize} ${-halfSize} ${wheelSize} ${wheelSize}`}
          style={{ overflow: 'visible', pointerEvents: 'all' }}
        >
          <defs>
            {/* Multi-layered soft realistic desktop shadow */}
            <filter id="fluent-shadow" x="-30%" y="-30%" width="160%" height="160%">
              <feDropShadow dx="0" dy="16" stdDeviation="28" floodColor="rgba(0, 0, 0, 0.72)" />
              <feDropShadow dx="0" dy="4" stdDeviation="8" floodColor="rgba(0, 0, 0, 0.45)" />
            </filter>
          </defs>

          {/* Precision outer rim ring */}
          <circle
            cx="0"
            cy="0"
            r={OUTER_R + 1}
            fill="none"
            stroke="rgba(255, 255, 255, 0.05)"
            strokeWidth="1"
            style={{ pointerEvents: 'none' }}
          />

          {/* Dial Segments */}
          <g filter="url(#fluent-shadow)">
            {activeActions.map((action, i) => (
              <WheelSegment
                key={action.id}
                index={i}
                total={totalSegments}
                action={action}
                path={segmentPath(i, totalSegments, INNER_R, OUTER_R)}
                labelPos={labelPosition(i, totalSegments)}
                isHovered={hoveredIndex === i}
                isProcessing={isProcessing && processingAction === action.id}
                isMultiple={triggerData.isMultiple}
                onHover={() => setHoveredIndex(i)}
                onLeave={() => setHoveredIndex(null)}
              />
            ))}
          </g>
        </svg>

        {/* Center Preview & Brand Core */}
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
            filePaths={triggerData.filePaths}
            isMultiple={triggerData.isMultiple}
            isProcessing={isProcessing}
            hoveredAction={hoveredIndex !== null ? activeActions[hoveredIndex] : null}
            onCancel={onDismiss}
          />
        </div>

        {/* Floating Understated Cancel Pill */}
        <div
          className="absolute flex items-center justify-center"
          style={{
            left: 0,
            right: 0,
            top: wheelSize + 14,
            pointerEvents: 'none'
          }}
        >
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onDismiss()
            }}
            className="pointer-events-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-zinc-400 hover:text-white bg-[#0e1013]/90 hover:bg-[#15171d] border border-white/[0.08] hover:border-white/20 backdrop-blur-xl transition-all cursor-pointer shadow-lg active:scale-95"
          >
            <CloseIcon size={11} strokeWidth={2} className="text-zinc-500" />
            <span>Cancel</span>
            <span className="text-[10px] text-zinc-500 font-mono ml-1 px-1.5 py-0.5 rounded bg-white/[0.04] border border-white/[0.06]">
              Esc / Tab
            </span>
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}
