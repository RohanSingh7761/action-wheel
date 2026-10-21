import React, { useState } from 'react'
import { motion } from 'framer-motion'
import type { CropParams } from '../../shared/ipc-types'

export default function CropEditor({ filePath }: { filePath: string }): React.ReactElement {
  const [left, setLeft] = useState(0)
  const [top, setTop] = useState(0)
  const [width, setWidth] = useState(800)
  const [height, setHeight] = useState(600)
  const fileName = filePath.split('\\').pop()?.split('/').pop() ?? 'image'

  const handleConfirm = () => {
    const params: CropParams = { left, top, width, height }
    ;(window as any).popupAPI?.confirm({ params })
  }

  const field = (label: string, value: number, set: (v: number) => void) => (
    <div className="flex flex-col gap-1.5">
      <label className="text-[11px] font-medium text-zinc-400">{label} (px)</label>
      <input
        type="number"
        value={value}
        min={0}
        onChange={(e) => set(Math.max(0, Number(e.target.value)))}
        className="w-full px-3.5 py-2.5 rounded-xl text-sm font-mono text-white bg-white/[0.06] border border-white/10 focus:border-white/30 focus:bg-white/[0.09] outline-none transition-all"
      />
    </div>
  )

  return (
    <div className="flex flex-col h-full justify-between gap-5">
      {/* File badge */}
      <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/[0.04] border border-white/[0.08]">
        <span className="text-sm">✂️</span>
        <span className="text-xs text-zinc-300 font-medium truncate flex-1" title={fileName}>
          {fileName}
        </span>
      </div>

      {/* Inputs grid */}
      <div className="flex flex-col gap-2">
        <span className="text-[11px] font-medium text-zinc-400 uppercase tracking-wider">Crop Boundaries</span>
        <div className="grid grid-cols-2 gap-3.5">
          {field('X Offset (Left)', left, setLeft)}
          {field('Y Offset (Top)', top, setTop)}
          {field('Crop Width', width, setWidth)}
          {field('Crop Height', height, setHeight)}
        </div>
      </div>

      {/* Helper text */}
      <div className="rounded-xl px-4 py-2.5 text-center text-xs bg-white/[0.04] border border-white/[0.08] text-zinc-400">
        Specify offset from top-left corner and target crop dimensions in pixels.
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
          <span>Crop Image</span>
          <span>→</span>
        </motion.button>
      </div>
    </div>
  )
}
