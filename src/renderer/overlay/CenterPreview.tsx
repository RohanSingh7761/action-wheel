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
        background: 'rgba(0,0,0,0.65)',
        border: '1.5px solid rgba(255,255,255,0.2)',
        backdropFilter: 'blur(24px) saturate(200%)',
        WebkitBackdropFilter: 'blur(24px) saturate(200%)'
      }}
    >
      {/* Thumbnail */}
      {thumbnail && !isProcessing && !hoveredAction && (
        <img
          src={thumbnail}
          alt="preview"
          className="absolute inset-0 w-full h-full object-cover rounded-full"
          style={{ opacity: 0.4 }}
        />
      )}

      {/* Processing spinner */}
      {isProcessing && (
        <motion.div
          className="w-10 h-10 rounded-full"
          style={{
            border: '3px solid rgba(255,255,255,0.15)',
            borderTopColor: hoveredAction?.accentColor ?? '#60a5fa'
          }}
          animate={{ rotate: 360 }}
          transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
        />
      )}

      {/* Hovered action info */}
      {!isProcessing && hoveredAction && (
        <motion.div
          className="flex flex-col items-center gap-1 z-10"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          transition={{ type: 'spring', stiffness: 600, damping: 30 }}
        >
          <span style={{ fontSize: 26 }}>{hoveredAction.icon}</span>
          <span
            className="font-semibold text-white text-xs"
            style={{ color: hoveredAction.accentColor }}
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
            className="text-white font-medium max-w-[100px] truncate"
            style={{ fontSize: 10, opacity: 0.9, lineHeight: 1.2 }}
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
            className="pointer-events-auto mt-0.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold text-rose-300 bg-rose-500/25 hover:bg-rose-500/50 border border-rose-500/40 hover:border-rose-400 transition-all cursor-pointer flex items-center gap-1 active:scale-95 shadow-md"
          >
            <span>✕</span>
            <span>Cancel</span>
          </button>
        </motion.div>
      )}
    </div>
  )
}
