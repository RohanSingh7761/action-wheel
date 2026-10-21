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
  const fileName = filePath.split('\\').pop()?.split('/').pop() ?? 'image'

  const handleConfirm = () => {
    const params: CompressParams = { quality }
    ;(window as any).popupAPI?.confirm({ params })
  }

  // Quality → estimated savings
  const savings = quality < 30 ? '~75%' : quality < 55 ? '~55%' : quality < 75 ? '~35%' : '~15%'

  return (
    <div className="flex flex-col h-full justify-between gap-5">
      {/* File badge */}
      <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/[0.04] border border-white/[0.08]">
        <span className="text-sm">🗜️</span>
        <span className="text-xs text-zinc-300 font-medium truncate flex-1" title={fileName}>
          {fileName}
        </span>
      </div>

      {/* Presets */}
      <div className="flex flex-col gap-2">
        <span className="text-[11px] font-medium text-zinc-400 uppercase tracking-wider">Presets</span>
        <div className="grid grid-cols-4 gap-2">
          {PRESETS.map((p) => {
            const isSelected = quality === p.quality
            return (
              <motion.button
                key={p.label}
                whileTap={{ scale: 0.95 }}
                onClick={() => setQuality(p.quality)}
                className={`py-2 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-white/20 text-white border border-white/35 shadow-md'
                    : 'bg-white/[0.05] text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.08] border border-white/[0.08]'
                }`}
              >
                {p.label}
              </motion.button>
            )
          })}
        </div>
      </div>

      {/* Slider */}
      <div className="flex flex-col gap-2.5">
        <div className="flex justify-between items-center">
          <span className="text-xs font-medium text-zinc-400">Quality Compression</span>
          <span className="text-sm font-semibold text-white px-2 py-0.5 rounded-md bg-white/10 font-mono">
            {quality}%
          </span>
        </div>
        <input
          type="range"
          min={10}
          max={100}
          value={quality}
          onChange={(e) => setQuality(Number(e.target.value))}
          className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-white"
        />
        <div className="flex justify-between text-[11px] text-zinc-500">
          <span>Smaller file size</span>
          <span>Higher visual fidelity</span>
        </div>
      </div>

      {/* Savings estimate */}
      <div className="rounded-xl px-4 py-2.5 text-center text-xs bg-white/[0.04] border border-white/[0.08] text-zinc-300 flex items-center justify-center gap-2">
        <span>Estimated reduction:</span>
        <span className="font-semibold text-white bg-white/10 px-2 py-0.5 rounded-md">{savings}</span>
      </div>

      {/* Bottom Action Bar */}
      <div className="flex gap-3 pt-2">
        <motion.button
          type="button"
          whileTap={{ scale: 0.96 }}
          onClick={() => (window as any).popupAPI?.cancel()}
          className="px-5 py-2.5 rounded-xl font-medium text-sm text-zinc-400 hover:text-white bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 transition-all cursor-pointer"
        >
          Cancel
        </motion.button>
        <motion.button
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.97 }}
          onClick={handleConfirm}
          className="flex-1 py-2.5 rounded-xl font-semibold text-sm text-zinc-950 bg-white hover:bg-zinc-200 shadow-xl transition-all cursor-pointer flex items-center justify-center gap-1.5"
        >
          <span>Compress Image</span>
          <span>→</span>
        </motion.button>
      </div>
    </div>
  )
}
