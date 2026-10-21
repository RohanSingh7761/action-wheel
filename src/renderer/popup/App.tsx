import React, { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import type { ActionId, PopupInitPayload } from '../../shared/ipc-types'
import FormatPicker from './FormatPicker'
import CropEditor from './CropEditor'
import CompressSlider from './CompressSlider'

export default function App(): React.ReactElement {
  const [initData, setInitData] = useState<PopupInitPayload | null>(null)

  useEffect(() => {
    const api = (window as any).popupAPI
    if (!api) return
    const cleanup = api.onInit((payload: PopupInitPayload) => {
      setInitData(payload)
    })
    return cleanup
  }, [])

  if (!initData) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <div
          className="w-full h-full rounded-2xl flex items-center justify-center"
          style={{
            background: 'rgba(15,15,20,0.8)',
            backdropFilter: 'blur(24px)',
            border: '1px solid rgba(255,255,255,0.1)'
          }}
        >
          <span className="text-white/40 text-sm">Loading…</span>
        </div>
      </div>
    )
  }

  return (
    <motion.div
      className="w-full h-full p-4"
      initial={{ opacity: 0, scale: 0.92, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
    >
      <div
        className="w-full h-full rounded-2xl overflow-hidden flex flex-col"
        style={{
          background: 'rgba(12,14,20,0.88)',
          backdropFilter: 'blur(28px) saturate(200%)',
          WebkitBackdropFilter: 'blur(28px) saturate(200%)',
          border: '1px solid rgba(255,255,255,0.12)',
          boxShadow: '0 24px 64px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.08)'
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-4 py-3"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}
        >
          <span className="text-white/90 font-semibold text-sm">
            {actionTitle(initData.action)}
          </span>
          <button
            onClick={() => (window as any).popupAPI?.cancel()}
            className="w-6 h-6 rounded-full flex items-center justify-center text-white/40 hover:text-white/80 hover:bg-white/10 transition-colors text-sm"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-hidden">
          {initData.action === 'convert-format' && (
            <FormatPicker filePath={initData.filePath} />
          )}
          {initData.action === 'crop' && (
            <CropEditor filePath={initData.filePath} />
          )}
          {initData.action === 'compress' && (
            <CompressSlider filePath={initData.filePath} />
          )}
        </div>
      </div>
    </motion.div>
  )
}

function actionTitle(action: ActionId): string {
  switch (action) {
    case 'convert-format': return '🔄 Convert Format'
    case 'crop': return '✂️ Crop Image'
    case 'compress': return '🗜️ Compress Image'
    default: return 'Options'
  }
}
