import React, { useState } from 'react'
import { motion } from 'framer-motion'
import type { ConvertFormatParams } from '../../shared/ipc-types'
import { ImageIcon, ArrowRightIcon } from '../shared/Icons'

const FORMATS = [
  { value: 'webp', label: 'WebP', desc: 'Modern & Light' },
  { value: 'png', label: 'PNG', desc: 'Lossless' },
  { value: 'jpg', label: 'JPG', desc: 'Universal' },
  { value: 'avif', label: 'AVIF', desc: 'High Efficiency' },
  { value: 'tiff', label: 'TIFF', desc: 'Max Fidelity' }
] as const

type Format = (typeof FORMATS)[number]['value']

export default function FormatPicker({ filePath }: { filePath: string }): React.ReactElement {
  const [selectedFormat, setSelectedFormat] = useState<Format>('webp')
  const [quality, setQuality] = useState(85)

  const fileName = filePath.split('\\').pop()?.split('/').pop() ?? 'image'
  const lastDot = fileName.lastIndexOf('.')
  const baseName = lastDot > 0 ? fileName.substring(0, lastDot) : fileName
  const origExt = lastDot > 0 ? fileName.substring(lastDot + 1) : 'IMG'

  const handleConfirm = () => {
    const params: ConvertFormatParams = { format: selectedFormat, quality }
    ;(window as any).popupAPI?.confirm({ params })
  }

  const isLossless = selectedFormat === 'png'

  return (
    <div className="flex flex-col h-full justify-between gap-4">
      {/* Source File Summary */}
      <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-white/[0.03] border border-white/[0.06]">
        <ImageIcon size={14} className="text-zinc-400 flex-shrink-0" />
        <span className="text-xs text-zinc-200 font-medium truncate flex-1" title={fileName}>
          {fileName}
        </span>
        <span className="text-[10px] font-mono text-zinc-500 uppercase px-1.5 py-0.5 rounded bg-white/[0.04]">
          {origExt}
        </span>
      </div>

      {/* Format Selector Grid */}
      <div className="flex flex-col gap-2">
        <span className="text-[10.5px] font-medium text-zinc-400 uppercase tracking-wider">
          Target Format
        </span>
        <div className="grid grid-cols-3 gap-2">
          {FORMATS.map((fmt) => {
            const isSelected = selectedFormat === fmt.value
            return (
              <button
                key={fmt.value}
                type="button"
                onClick={() => setSelectedFormat(fmt.value)}
                className={`flex flex-col items-center py-2 px-1 rounded-xl text-center transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-white/15 border border-white/30 text-white shadow-sm'
                    : 'bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.07] hover:border-white/15 text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <span className={`font-semibold text-xs ${isSelected ? 'text-white' : 'text-zinc-300'}`}>
                  {fmt.label}
                </span>
                <span className={`text-[10px] mt-0.5 ${isSelected ? 'text-zinc-300' : 'text-zinc-500'}`}>
                  {fmt.desc}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Quality Settings (or Lossless Notice) */}
      {!isLossless ? (
        <div className="flex flex-col gap-2 bg-white/[0.02] p-3 rounded-xl border border-white/[0.05]">
          <div className="flex justify-between items-center">
            <span className="text-xs font-medium text-zinc-300">Encoding Quality</span>
            <span className="text-xs font-semibold text-white px-2 py-0.5 rounded bg-white/10 font-mono">
              {quality}%
            </span>
          </div>
          <input
            type="range"
            min={10}
            max={100}
            value={quality}
            onChange={(e) => setQuality(Number(e.target.value))}
            className="w-full h-1.5"
          />
          <div className="flex justify-between text-[10.5px] text-zinc-500">
            <span>Smaller file</span>
            <span>Higher visual fidelity</span>
          </div>
        </div>
      ) : (
        <div className="rounded-xl px-3.5 py-3 text-center text-xs bg-white/[0.02] border border-white/[0.05] text-zinc-400">
          PNG uses lossless compression. Visual quality remains 100% unaltered.
        </div>
      )}

      {/* Output Destination Info */}
      <div className="flex items-center justify-between text-[11px] text-zinc-400 px-1">
        <span>Output filename:</span>
        <span className="font-mono text-zinc-300 truncate max-w-[220px]">
          {baseName}.{selectedFormat}
        </span>
      </div>

      {/* Action Footer */}
      <div className="flex gap-2.5 pt-1">
        <button
          type="button"
          onClick={() => (window as any).popupAPI?.cancel()}
          className="px-4 py-2.5 rounded-xl font-medium text-xs text-zinc-400 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] transition-all cursor-pointer"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleConfirm}
          className="flex-1 py-2.5 rounded-xl font-semibold text-xs text-zinc-950 bg-white hover:bg-zinc-200 active:scale-[0.99] shadow-md transition-all cursor-pointer flex items-center justify-center gap-1.5"
        >
          <span>Convert and Save</span>
          <ArrowRightIcon size={12} strokeWidth={2.2} />
        </button>
      </div>
    </div>
  )
}
