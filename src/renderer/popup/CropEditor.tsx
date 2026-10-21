import React, { useState } from 'react'
import { motion } from 'framer-motion'
import type { CropParams } from '../../shared/ipc-types'

export default function CropEditor({ filePath }: { filePath: string }): React.ReactElement {
  // Simple numeric crop input (full crop editor with canvas would require a larger popup)
  const [left, setLeft] = useState(0)
  const [top, setTop] = useState(0)
  const [width, setWidth] = useState(400)
  const [height, setHeight] = useState(400)

  const handleConfirm = () => {
    const params: CropParams = { left, top, width, height }
    ;(window as any).popupAPI?.confirm({ params })
  }

  const field = (label: string, value: number, set: (v: number) => void) => (
    <div className="flex flex-col gap-1">
      <label className="text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>{label} (px)</label>
      <input
        type="number"
        value={value}
        min={0}
        onChange={e => set(Number(e.target.value))}
        className="px-3 py-2 rounded-lg text-sm text-white outline-none"
        style={{
          background: 'rgba(255,255,255,0.07)',
          border: '1px solid rgba(255,255,255,0.12)',
          colorScheme: 'dark'
        }}
      />
    </div>
  )

  return (
    <div className="flex flex-col h-full px-4 py-3 gap-3">
      <div className="grid grid-cols-2 gap-3">
        {field('Left', left, setLeft)}
        {field('Top', top, setTop)}
        {field('Width', width, setWidth)}
        {field('Height', height, setHeight)}
      </div>

      <p className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>
        Crop from top-left corner of the image.
      </p>

      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.97 }}
        onClick={handleConfirm}
        className="mt-auto w-full py-2.5 rounded-xl font-semibold text-sm text-white"
        style={{
          background: 'linear-gradient(135deg, rgba(52,211,153,0.8), rgba(16,185,129,0.8))',
          border: '1px solid rgba(255,255,255,0.15)',
          cursor: 'pointer'
        }}
      >
        Crop →
      </motion.button>
    </div>
  )
}
