import React from 'react'
import { motion } from 'framer-motion'
import type { ActionMeta } from '../../shared/ipc-types'

interface CenterPreviewProps {
  thumbnail?: string
  filePath: string
  isProcessing: boolean
  hoveredAction: ActionMeta | null
  onCancel?: () => void
}

const INNER_R = 68

export default function CenterPreview({
  thumbnail,
  filePath,
  isProcessing,
  hoveredAction,
  onCancel
}: CenterPreviewProps): React.ReactElement {
  const fileName = filePath.split('\\').pop()?.split('/').pop() ?? 'image'
  const truncName = fileName.length > 14 ? fileName.slice(0, 12) + '…' : fileName

  return (
    <div
      className="w-full h-full rounded-full flex flex-col items-center justify-center relative overflow-hidden"
      style={{
        background: 'rgba(16, 18, 24, 0.82)',
        border: '1.5px solid rgba(255, 255, 255, 0.18)',
        backdropFilter: 'blur(32px) saturate(190%)',
        WebkitBackdropFilter: 'blur(32px) saturate(190%)',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.15)'
      }}
    >
      {/* Thumbnail */}
      {thumbnail && !isProcessing && !hoveredAction && (
        <img
          src={thumbnail}
          alt="preview"
          className="absolute inset-0 w-full h-full object-cover rounded-full"
          style={{ opacity: 0.35 }}
        />
      )}

      {/* Processing spinner */}
      {isProcessing && (
        <motion.div
          className="w-10 h-10 rounded-full"
          style={{
            border: '3px solid rgba(255,255,255,0.15)',
            borderTopColor: '#ffffff'
          }}
          animate={{ rotate: 360 }}
          transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
        />
      )}

      {/* Hovered action info */}
      {!isProcessing && hoveredAction && (
        <motion.div
          className="flex flex-col items-center gap-1 z-10"
          initial={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.85 }}
          transition={{ type: 'spring', stiffness: 600, damping: 30 }}
        >
          <span style={{ fontSize: 26 }}>{hoveredAction.icon}</span>
          <span
            className="font-semibold text-white text-xs tracking-tight"
          >
            {hoveredAction.label}
          </span>
        </motion.div>
      )}

      {/* File name & Cancel button (when idle) */}
      {!isProcessing && !hoveredAction && (
        <motion.div
          className="flex flex-col items-center gap-1 px-2 text-center z-10"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
        >
          <span
            className="text-zinc-200 font-medium max-w-[100px] truncate"
            style={{ fontSize: 10.5, lineHeight: 1.2 }}
            title={fileName}
          >
            {truncName}
          </span>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onCancel?.()
            }}
            className="pointer-events-auto mt-0.5 px-3 py-0.5 rounded-full text-[10px] font-medium text-zinc-300 hover:text-white bg-white/10 hover:bg-white/20 border border-white/15 hover:border-white/30 backdrop-blur-md transition-all cursor-pointer flex items-center gap-1 active:scale-95 shadow-sm"
          >
            <span>✕</span>
            <span>Cancel</span>
          </button>
        </motion.div>
      )}
    </div>
  )
}
