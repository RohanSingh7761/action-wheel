import React, { useState } from 'react'
import { motion } from 'framer-motion'
import type { CompressParams } from '../../shared/ipc-types'

const PRESETS = [
  { label: 'High', quality: 90 },
  { label: 'Balanced', quality: 75 },
  { label: 'Small', quality: 50 },
  { label: 'Tiny', quality: 30 }
]

export default function CompressSlider({ filePath }: { filePath: string }): React.ReactElement {
  const [quality, setQuality] = useState(75)

  const handleConfirm = () => {
    const params: CompressParams = { quality }
    ;(window as any).popupAPI?.confirm({ params })
  }

  // Quality → estimated savings (rough heuristic)
  const savings = quality < 30 ? '~75%' : quality < 55 ? '~55%' : quality < 75 ? '~35%' : '~15%'

  return (
    <div className="flex flex-col h-full px-4 py-3 gap-4">
      {/* Presets */}
      <div className="flex gap-2">
        {PRESETS.map(p => (
          <motion.button
            key={p.label}
            whileTap={{ scale: 0.93 }}
            onClick={() => setQuality(p.quality)}
            className="flex-1 py-1.5 rounded-lg text-xs font-medium transition-all"
            style={{
              background:
                quality === p.quality
                  ? 'rgba(167,139,250,0.3)'
                  : 'rgba(255,255,255,0.06)',
              border: `1px solid ${
                quality === p.quality
                  ? 'rgba(167,139,250,0.6)'
                  : 'rgba(255,255,255,0.08)'
              }`,
              color: quality === p.quality ? '#a78bfa' : 'rgba(255,255,255,0.6)',
              cursor: 'pointer'
            }}
          >
            {p.label}
          </motion.button>
        ))}
      </div>

      {/* Slider */}
      <div className="flex flex-col gap-2">
        <div className="flex justify-between">
          <span className="text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>Quality</span>
          <span className="text-xs font-bold" style={{ color: '#a78bfa' }}>{quality}%</span>
        </div>
        <input
          type="range"
          min={10}
          max={100}
          value={quality}
          onChange={e => setQuality(Number(e.target.value))}
          style={{ accentColor: '#a78bfa' }}
        />
        <div className="flex justify-between text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>
          <span>Smaller file</span>
          <span>Better quality</span>
        </div>
      </div>

      {/* Savings estimate */}
      <div
        className="rounded-xl px-3 py-2 text-center text-xs"
        style={{
          background: 'rgba(167,139,250,0.1)',
          border: '1px solid rgba(167,139,250,0.2)',
          color: 'rgba(255,255,255,0.6)'
        }}
      >
        Estimated size reduction: <span style={{ color: '#a78bfa', fontWeight: 600 }}>{savings}</span>
      </div>

      <div className="mt-auto flex gap-2">
        <motion.button
          type="button"
          whileTap={{ scale: 0.95 }}
          onClick={() => (window as any).popupAPI?.cancel()}
          className="py-2.5 px-4 rounded-xl font-medium text-xs text-white/60 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 transition-all cursor-pointer"
        >
          Cancel
        </motion.button>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
          onClick={handleConfirm}
          className="flex-1 py-2.5 rounded-xl font-semibold text-sm text-white"
          style={{
            background: 'linear-gradient(135deg, rgba(167,139,250,0.8), rgba(124,58,237,0.8))',
            border: '1px solid rgba(255,255,255,0.15)',
            cursor: 'pointer'
          }}
        >
          Compress →
        </motion.button>
      </div>
    </div>
  )
}
