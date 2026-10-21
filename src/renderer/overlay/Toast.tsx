import React from 'react'
import { motion } from 'framer-motion'

interface ToastProps {
  type: 'success' | 'error'
  message: string
  subMessage?: string
}

export default function Toast({ type, message, subMessage }: ToastProps): React.ReactElement {
  const isSuccess = type === 'success'

  return (
    <motion.div
      className="fixed bottom-8 right-8 flex items-center gap-3 px-5 py-3.5 rounded-2xl"
      style={{
        background: isSuccess ? 'rgba(30,41,30,0.85)' : 'rgba(41,20,20,0.85)',
        border: `1px solid ${isSuccess ? 'rgba(52,211,153,0.4)' : 'rgba(251,113,133,0.4)'}`,
        backdropFilter: 'blur(20px) saturate(180%)',
        WebkitBackdropFilter: 'blur(20px) saturate(180%)',
        boxShadow: `0 8px 32px ${isSuccess ? 'rgba(52,211,153,0.15)' : 'rgba(251,113,133,0.15)'}`,
        minWidth: 220,
        maxWidth: 360,
        zIndex: 9999
      }}
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 10, scale: 0.95 }}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
    >
      {/* Icon */}
      <div
        className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
        style={{
          background: isSuccess ? 'rgba(52,211,153,0.2)' : 'rgba(251,113,133,0.2)'
        }}
      >
        <span style={{ fontSize: 16 }}>{isSuccess ? '✓' : '✕'}</span>
      </div>

      {/* Text */}
      <div className="flex flex-col min-w-0">
        <span
          className="font-semibold text-sm"
          style={{ color: isSuccess ? '#34d399' : '#fb7185' }}
        >
          {message}
        </span>
        {subMessage && (
          <span className="text-xs mt-0.5 truncate" style={{ color: 'rgba(255,255,255,0.6)' }}>
            {subMessage}
          </span>
        )}
      </div>
    </motion.div>
  )
}
