import React, { useState } from 'react'
import type { CropParams } from '../../shared/ipc-types'
import { ImageIcon, ArrowRightIcon } from '../shared/Icons'

const RATIO_PRESETS = [
  { label: 'Freeform', ratio: null },
  { label: '1:1 Square', ratio: 1 / 1 },
  { label: '16:9 Wide', ratio: 16 / 9 },
  { label: '4:3 Standard', ratio: 4 / 3 }
]

export default function CropEditor({ filePath }: { filePath: string }): React.ReactElement {
  const [left, setLeft] = useState(0)
  const [top, setTop] = useState(0)
  const [width, setWidth] = useState(800)
  const [height, setHeight] = useState(600)
  const [activePreset, setActivePreset] = useState<string>('Freeform')

  const fileName = filePath.split('\\').pop()?.split('/').pop() ?? 'image'

  const handlePreset = (label: string, ratio: number | null) => {
    setActivePreset(label)
    if (ratio !== null) {
      setHeight(Math.max(10, Math.round(width / ratio)))
    }
  }

  const handleWidthChange = (val: number) => {
    const w = Math.max(1, val)
    setWidth(w)
    const preset = RATIO_PRESETS.find((p) => p.label === activePreset)
    if (preset?.ratio) {
      setHeight(Math.max(1, Math.round(w / preset.ratio)))
    }
  }

  const handleHeightChange = (val: number) => {
    const h = Math.max(1, val)
    setHeight(h)
    const preset = RATIO_PRESETS.find((p) => p.label === activePreset)
    if (preset?.ratio) {
      setWidth(Math.max(1, Math.round(h * preset.ratio)))
    }
  }

  const handleConfirm = () => {
    const params: CropParams = {
      left: Math.max(0, left),
      top: Math.max(0, top),
      width: Math.max(10, width),
      height: Math.max(10, height)
    }
    ;(window as any).popupAPI?.confirm({ params })
  }

  const field = (label: string, value: number, onChange: (v: number) => void) => (
    <div className="flex flex-col gap-1">
      <div className="flex justify-between items-center">
        <label className="text-[10.5px] font-medium text-zinc-400">{label}</label>
        <span className="text-[10px] text-zinc-500 font-mono">px</span>
      </div>
      <input
        type="number"
        value={value}
        min={0}
        onChange={(e) => onChange(Math.max(0, Number(e.target.value)))}
        className="w-full px-3 py-2 rounded-xl text-xs font-mono text-white bg-white/[0.04] border border-white/[0.08] focus:border-white/30 focus:bg-white/[0.07] outline-none transition-all"
      />
    </div>
  )

  return (
    <div className="flex flex-col h-full justify-between gap-3.5">
      {/* File summary */}
      <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-white/[0.03] border border-white/[0.06]">
        <ImageIcon size={14} className="text-zinc-400 flex-shrink-0" />
        <span className="text-xs text-zinc-200 font-medium truncate flex-1" title={fileName}>
          {fileName}
        </span>
      </div>

      {/* Aspect Ratio Presets */}
      <div className="flex flex-col gap-1.5">
        <span className="text-[10.5px] font-medium text-zinc-400 uppercase tracking-wider">
          Aspect Ratio
        </span>
        <div className="grid grid-cols-4 gap-1.5">
          {RATIO_PRESETS.map((p) => {
            const isSelected = activePreset === p.label
            return (
              <button
                key={p.label}
                type="button"
                onClick={() => handlePreset(p.label, p.ratio)}
                className={`py-1.5 px-1 rounded-lg text-xs font-medium transition-all cursor-pointer truncate text-center ${
                  isSelected
                    ? 'bg-white/15 border border-white/30 text-white shadow-sm'
                    : 'bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.06] text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {p.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Crop Boundary Inputs */}
      <div className="flex flex-col gap-2 bg-white/[0.02] p-3 rounded-xl border border-white/[0.05]">
        <div className="grid grid-cols-2 gap-2.5">
          {field('X Offset (Left)', left, setLeft)}
          {field('Y Offset (Top)', top, setTop)}
          {field('Crop Width', width, handleWidthChange)}
          {field('Crop Height', height, handleHeightChange)}
        </div>
      </div>

      {/* Helper Guidance */}
      <div className="text-[11px] text-zinc-400 px-1">
        Selected dimensions: <span className="font-mono text-zinc-300">{width} × {height} px</span> at offset <span className="font-mono text-zinc-300">({left}, {top})</span>
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
          <span>Crop and Save</span>
          <ArrowRightIcon size={12} strokeWidth={2.2} />
        </button>
      </div>
    </div>
  )
}
