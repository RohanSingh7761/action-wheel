import React from 'react'
import { motion } from 'framer-motion'
import { CheckIcon, AlertCircleIcon } from '../shared/Icons'

interface ToastProps {
  type: 'success' | 'error'
  message: string
  subMessage?: string
}

export default function Toast({ type, message, subMessage }: ToastProps): React.ReactElement {
  const isSuccess = type === 'success'

  return (
    <motion.div
      className="fixed bottom-6 right-6 flex items-center gap-3 px-4 py-2.5 rounded-xl z-50 select-none shadow-2xl"
      style={{
        background: 'rgba(15, 17, 22, 0.96)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        boxShadow: '0 16px 36px rgba(0, 0, 0, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
        minWidth: 200,
        maxWidth: 340
      }}
      initial={{ opacity: 0, y: 10, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 6, scale: 0.98 }}
      transition={{ duration: 0.15, ease: 'easeOut' }}
    >
      {/* Precision Icon Badge */}
      <div
        className={`w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 ${
          isSuccess
            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
            : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
        }`}
      >
        {isSuccess ? <CheckIcon size={13} strokeWidth={2.2} /> : <AlertCircleIcon size={13} strokeWidth={2.2} />}
      </div>

      {/* Content */}
      <div className="flex flex-col min-w-0 pr-1">
        <span className="font-medium text-xs text-white leading-tight">
          {message}
        </span>
        {subMessage && (
          <span className="text-[11px] text-zinc-400 mt-0.5 truncate leading-tight font-normal">
            {subMessage}
          </span>
        )}
      </div>
    </motion.div>
  )
}
