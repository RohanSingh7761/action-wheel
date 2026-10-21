import React, { useState } from 'react'
import { motion } from 'framer-motion'
import type { ConvertFormatParams } from '../../shared/ipc-types'

const FORMATS = [
  { value: 'webp', label: 'WebP', desc: 'Best web quality' },
  { value: 'png', label: 'PNG', desc: 'Lossless' },
  { value: 'jpg', label: 'JPG', desc: 'Universal' },
  { value: 'avif', label: 'AVIF', desc: 'Next-gen' },
  { value: 'tiff', label: 'TIFF', desc: 'High quality' }
] as const

type Format = (typeof FORMATS)[number]['value']

export default function FormatPicker({ filePath }: { filePath: string }): React.ReactElement {
  const [selectedFormat, setSelectedFormat] = useState<Format>('webp')
  const [quality, setQuality] = useState(85)

  const handleConfirm = () => {
    const params: ConvertFormatParams = { format: selectedFormat, quality }
    ;(window as any).popupAPI?.confirm({ params })
  }

  return (
    <div className="flex flex-col h-full px-4 py-3 gap-3">
      {/* Format grid */}
      <div className="grid grid-cols-3 gap-2">
        {FORMATS.map(fmt => (
          <motion.button
            key={fmt.value}
            whileTap={{ scale: 0.95 }}
            onClick={() => setSelectedFormat(fmt.value)}
            className="flex flex-col items-center py-2 px-1 rounded-xl text-center transition-all"
            style={{
              background:
                selectedFormat === fmt.value
                  ? 'rgba(96,165,250,0.25)'
                  : 'rgba(255,255,255,0.05)',
              border: `1px solid ${
                selectedFormat === fmt.value
                  ? 'rgba(96,165,250,0.6)'
                  : 'rgba(255,255,255,0.08)'
              }`,
              cursor: 'pointer'
            }}
          >
            <span className="font-bold text-sm" style={{ color: selectedFormat === fmt.value ? '#60a5fa' : 'rgba(255,255,255,0.8)' }}>
              {fmt.label}
            </span>
            <span className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.35)' }}>
              {fmt.desc}
            </span>
          </motion.button>
        ))}
      </div>

      {/* Quality slider */}
      {selectedFormat !== 'bmp' && (
        <div className="flex flex-col gap-1.5">
          <div className="flex justify-between items-center">
            <span className="text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>Quality</span>
            <span className="text-xs font-semibold" style={{ color: '#60a5fa' }}>{quality}%</span>
          </div>
          <input
            type="range"
            min={1}
            max={100}
            value={quality}
            onChange={e => setQuality(Number(e.target.value))}
            style={{ accentColor: '#60a5fa' }}
          />
        </div>
      )}

      {/* Action buttons */}
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
            background: 'linear-gradient(135deg, rgba(96,165,250,0.8), rgba(139,92,246,0.8))',
            border: '1px solid rgba(255,255,255,0.15)',
            cursor: 'pointer'
          }}
        >
          Convert →
        </motion.button>
      </div>
    </div>
  )
}
