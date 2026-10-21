import React, { useState } from 'react'
import type { CompressParams } from '../../shared/ipc-types'
import { ImageIcon, ArrowRightIcon } from '../shared/Icons'

const PRESETS = [
  { label: 'High', quality: 90, desc: 'Best quality' },
  { label: 'Balanced', quality: 75, desc: 'Recommended' },
  { label: 'Small', quality: 50, desc: 'Web ready' },
  { label: 'Tiny', quality: 30, desc: 'Max savings' }
]

export default function CompressSlider({ filePath }: { filePath: string }): React.ReactElement {
  const [quality, setQuality] = useState(75)
  const fileName = filePath.split('\\').pop()?.split('/').pop() ?? 'image'

  const handleConfirm = () => {
    const params: CompressParams = { quality }
    ;(window as any).popupAPI?.confirm({ params })
  }

  // Estimated savings
  const savings = quality < 30 ? '~75%' : quality < 55 ? '~55%' : quality < 75 ? '~35%' : '~15%'

  return (
    <div className="flex flex-col h-full justify-between gap-4">
      {/* File summary */}
      <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-white/[0.03] border border-white/[0.06]">
        <ImageIcon size={14} className="text-zinc-400 flex-shrink-0" />
        <span className="text-xs text-zinc-200 font-medium truncate flex-1" title={fileName}>
          {fileName}
        </span>
      </div>

      {/* Presets */}
      <div className="flex flex-col gap-1.5">
        <span className="text-[10.5px] font-medium text-zinc-400 uppercase tracking-wider">
          Presets
        </span>
        <div className="grid grid-cols-4 gap-1.5">
          {PRESETS.map((p) => {
            const isSelected = quality === p.quality
            return (
              <button
                key={p.label}
                type="button"
                onClick={() => setQuality(p.quality)}
                className={`py-2 px-1 rounded-xl text-center transition-all cursor-pointer flex flex-col items-center ${
                  isSelected
                    ? 'bg-white/15 border border-white/30 text-white shadow-sm'
                    : 'bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.06] text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <span className="text-xs font-semibold leading-tight">{p.label}</span>
                <span className={`text-[10px] mt-0.5 ${isSelected ? 'text-zinc-300' : 'text-zinc-500'}`}>
                  {p.quality}%
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Slider Area */}
      <div className="flex flex-col gap-2 bg-white/[0.02] p-3 rounded-xl border border-white/[0.05]">
        <div className="flex justify-between items-center">
          <span className="text-xs font-medium text-zinc-300">Quality Level</span>
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
          <span>Smaller file size</span>
          <span>Higher visual fidelity</span>
        </div>
      </div>

      {/* Savings Metric Bar */}
      <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-white/[0.03] border border-white/[0.06] text-xs">
        <span className="text-zinc-400">Estimated file reduction:</span>
        <span className="font-semibold text-white font-mono bg-white/10 px-2 py-0.5 rounded">
          {savings}
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
          <span>Compress and Save</span>
          <ArrowRightIcon size={12} strokeWidth={2.2} />
        </button>
      </div>
    </div>
  )
}
