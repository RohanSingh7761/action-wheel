import React from 'react'
import { motion } from 'framer-motion'
import type { ActionMeta } from '../../shared/ipc-types'

interface CenterPreviewProps {
  thumbnail?: string
  filePath: string
  isProcessing: boolean
  hoveredAction: ActionMeta | null
}

const INNER_R = 68

export default function CenterPreview({
  thumbnail,
  filePath,
  isProcessing,
  hoveredAction
}: CenterPreviewProps): React.ReactElement {
  const fileName = filePath.split('\\').pop()?.split('/').pop() ?? 'image'
  const truncName = fileName.length > 16 ? fileName.slice(0, 14) + '…' : fileName

  return (
    <div
      className="w-full h-full rounded-full flex flex-col items-center justify-center relative overflow-hidden"
      style={{
        background: 'rgba(0,0,0,0.55)',
        border: '1.5px solid rgba(255,255,255,0.18)',
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
          style={{ opacity: 0.6 }}
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
          className="flex flex-col items-center gap-1"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          transition={{ type: 'spring', stiffness: 600, damping: 30 }}
        >
          <span style={{ fontSize: 28 }}>{hoveredAction.icon}</span>
          <span
            className="font-semibold text-white text-xs"
            style={{ color: hoveredAction.accentColor }}
          >
            {hoveredAction.label}
          </span>
        </motion.div>
      )}

      {/* File name (when idle) */}
      {!isProcessing && !hoveredAction && (
        <motion.div
          className="flex flex-col items-center gap-1 px-2 text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.15 }}
        >
          <span style={{ fontSize: 20 }}>🖼️</span>
          <span
            className="text-white font-medium"
            style={{ fontSize: 10, opacity: 0.8, lineHeight: 1.3 }}
          >
            {truncName}
          </span>
        </motion.div>
      )}
    </div>
  )
}
