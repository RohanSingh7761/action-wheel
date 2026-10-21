import React, { useState } from 'react'
import { motion } from 'framer-motion'
import type { ConvertFormatParams } from '../../shared/ipc-types'

const FORMATS = [
  { value: 'webp', label: 'WebP', desc: 'Modern & Light' },
  { value: 'png', label: 'PNG', desc: 'Lossless' },
  { value: 'jpg', label: 'JPG', desc: 'Universal' },
  { value: 'avif', label: 'AVIF', desc: 'Next-Gen' },
  { value: 'tiff', label: 'TIFF', desc: 'Raw Fidelity' }
] as const

type Format = (typeof FORMATS)[number]['value']

export default function FormatPicker({ filePath }: { filePath: string }): React.ReactElement {
  const [selectedFormat, setSelectedFormat] = useState<Format>('webp')
  const [quality, setQuality] = useState(85)
  const fileName = filePath.split('\\').pop()?.split('/').pop() ?? 'image'

  const handleConfirm = () => {
    const params: ConvertFormatParams = { format: selectedFormat, quality }
    ;(window as any).popupAPI?.confirm({ params })
  }

  const isLossless = selectedFormat === 'png'

  return (
    <div className="flex flex-col h-full justify-between gap-4">
      {/* File badge */}
      <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/[0.04] border border-white/[0.08]">
        <span className="text-sm">🔄</span>
        <span className="text-xs text-zinc-300 font-medium truncate flex-1" title={fileName}>
          {fileName}
        </span>
      </div>

      {/* Format grid */}
      <div className="flex flex-col gap-2">
        <span className="text-[11px] font-medium text-zinc-400 uppercase tracking-wider">Target Format</span>
        <div className="grid grid-cols-3 gap-2">
          {FORMATS.map((fmt) => {
            const isSelected = selectedFormat === fmt.value
            return (
              <motion.button
                key={fmt.value}
                whileTap={{ scale: 0.96 }}
                onClick={() => setSelectedFormat(fmt.value)}
                className={`flex flex-col items-center py-2 px-1.5 rounded-xl text-center transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-white/20 border border-white/35 shadow-md'
                    : 'bg-white/[0.05] border border-white/[0.08] hover:bg-white/[0.08] hover:border-white/15'
                }`}
              >
                <span className={`font-semibold text-xs ${isSelected ? 'text-white' : 'text-zinc-300'}`}>
                  {fmt.label}
                </span>
                <span className={`text-[10px] mt-0.5 ${isSelected ? 'text-zinc-200' : 'text-zinc-500'}`}>
                  {fmt.desc}
                </span>
              </motion.button>
            )
          })}
        </div>
      </div>

      {/* Quality slider (hidden for lossless PNG) */}
      {!isLossless ? (
        <div className="flex flex-col gap-2">
          <div className="flex justify-between items-center">
            <span className="text-xs font-medium text-zinc-400">Encoding Quality</span>
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
        </div>
      ) : (
        <div className="rounded-xl px-4 py-2.5 text-center text-xs bg-white/[0.04] border border-white/[0.08] text-zinc-400">
          PNG output is lossless. Quality settings do not apply.
        </div>
      )}

      {/* Action buttons */}
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
          <span>Convert Format</span>
          <span>→</span>
        </motion.button>
      </div>
    </div>
  )
}
