import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { ActionMeta } from '../../shared/ipc-types'
import { ApertureIcon, CloseIcon, PdfIcon } from '../shared/Icons'

interface CenterPreviewProps {
  thumbnail?: string
  filePath: string
  filePaths?: string[]
  isMultiple?: boolean
  isProcessing: boolean
  hoveredAction: ActionMeta | null
  onCancel?: () => void
}

export default function CenterPreview({
  thumbnail,
  filePath,
  filePaths,
  isMultiple,
  isProcessing,
  hoveredAction,
  onCancel
}: CenterPreviewProps): React.ReactElement {
  const isPdf = filePath.toLowerCase().endsWith('.pdf')
  const count = filePaths?.length || 1
  const fileName = filePath.split('\\').pop()?.split('/').pop() ?? (isPdf ? 'Document.pdf' : 'Image')
  const truncName = isMultiple
    ? `${count} ${isPdf ? 'PDFs' : 'Images'}`
    : fileName.length > 14
    ? fileName.slice(0, 12) + '…'
    : fileName
  const subLabel = isMultiple ? 'All Selected' : 'Release to execute'

  return (
    <div
      className="w-full h-full rounded-full flex flex-col items-center justify-center relative overflow-hidden select-none"
      style={{
        background: 'rgba(15, 17, 22, 0.95)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.12), 0 8px 24px rgba(0, 0, 0, 0.55)'
      }}
    >
      {/* Subtle Thumbnail Texture (when idle) */}
      {thumbnail && !isProcessing && !hoveredAction && (
        <img
          src={thumbnail}
          alt=""
          className="absolute inset-0 w-full h-full object-cover rounded-full pointer-events-none"
          style={{ opacity: 0.18, filter: 'grayscale(40%)' }}
        />
      )}

      {/* State: Processing Spinner */}
      {isProcessing && (
        <div className="flex flex-col items-center gap-1.5 z-10">
          <div
            className="w-6 h-6 rounded-full animate-spin"
            style={{
              border: '2px solid rgba(255, 255, 255, 0.12)',
              borderTopColor: '#ffffff'
            }}
          />
          <span className="text-[10px] font-medium text-zinc-400 tracking-wide">
            Processing
          </span>
        </div>
      )}

      {/* State: Hovered Action Armed */}
      {!isProcessing && hoveredAction && (
        <motion.div
          key="hovered"
          className="flex flex-col items-center text-center px-2 z-10"
          initial={{ opacity: 0, y: 3 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -3 }}
          transition={{ duration: 0.12, ease: 'easeOut' }}
        >
          <div className="w-1.5 h-1.5 rounded-full bg-white mb-1.5 shadow-[0_0_8px_rgba(255,255,255,0.8)]" />
          <span className="font-semibold text-white text-xs tracking-tight leading-none">
            {isMultiple && hoveredAction.multipleLabel ? hoveredAction.multipleLabel : hoveredAction.label}
          </span>
          <span className="text-[9.5px] text-zinc-400 mt-1 tracking-normal font-normal">
            {subLabel}
          </span>
        </motion.div>
      )}

      {/* State: Idle / Center Emblem & Name */}
      {!isProcessing && !hoveredAction && (
        <motion.div
          key="idle"
          className="flex flex-col items-center text-center px-2 z-10 gap-0.5"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.15 }}
        >
          {isPdf ? (
            <PdfIcon size={18} strokeWidth={1.5} className="text-rose-400 mb-0.5" />
          ) : (
            <ApertureIcon size={18} strokeWidth={1.5} className="text-zinc-500 mb-0.5" />
          )}
          <span
            className="text-zinc-300 font-medium max-w-[96px] truncate text-[11px] leading-tight"
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
            className="mt-1 px-2 py-0.5 rounded-md text-[9.5px] font-medium text-zinc-400 hover:text-white bg-white/[0.04] hover:bg-white/[0.1] border border-white/[0.08] transition-all cursor-pointer flex items-center gap-1 active:scale-95"
            title="Dismiss wheel (Esc / Tab)"
          >
            <CloseIcon size={10} strokeWidth={2} />
            <span>Cancel</span>
          </button>
        </motion.div>
      )}
    </div>
  )
}
