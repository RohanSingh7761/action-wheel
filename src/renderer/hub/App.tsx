import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { ApertureIcon, SparklesIcon, ImageIcon, CloseIcon } from '../shared/Icons'

export default function App(): React.ReactElement {
  const [isDragOver, setIsDragOver] = useState(false)

  const handleDemo = () => {
    ;(window as any).hubAPI?.triggerDemo()
  }

  const handleSelectFile = () => {
    ;(window as any).hubAPI?.selectFile()
  }

  const handleMinimize = () => {
    ;(window as any).hubAPI?.minimize()
  }

  const handleQuit = () => {
    ;(window as any).hubAPI?.quit()
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(false)

    const files = e.dataTransfer.files
    if (files.length > 0) {
      const file = files[0]
      const filePath = (file as any).path
      if (filePath) {
        ;(window as any).hubAPI?.dropFile(filePath)
      }
    }
  }

  return (
    <div className="w-full h-full p-2.5 flex items-center justify-center select-none font-sans">
      <motion.div
        className="w-full h-full rounded-2xl overflow-hidden flex flex-col relative"
        style={{
          background: 'rgba(14, 16, 21, 0.96)',
          backdropFilter: 'blur(28px)',
          WebkitBackdropFilter: 'blur(28px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          boxShadow: '0 24px 64px rgba(0, 0, 0, 0.7), inset 0 1px 0 rgba(255, 255, 255, 0.1)'
        }}
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.15 }}
      >
        {/* Title Bar (Draggable) */}
        <div
          className="flex items-center justify-between px-4 py-3 cursor-move"
          style={{
            // @ts-ignore
            WebkitAppRegion: 'drag',
            borderBottom: '1px solid rgba(255, 255, 255, 0.06)'
          }}
        >
          <div className="flex items-center gap-2">
            <ApertureIcon size={16} strokeWidth={1.8} className="text-zinc-400" />
            <span className="text-white font-semibold text-xs tracking-tight">
              Action Wheel
            </span>
            <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              Active
            </span>
          </div>

          <div
            className="flex items-center gap-1"
            style={{
              // @ts-ignore
              WebkitAppRegion: 'no-drag'
            }}
          >
            <button
              onClick={handleMinimize}
              className="w-6 h-6 rounded-lg flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/[0.08] transition-colors text-xs"
              title="Minimize to system tray"
            >
              —
            </button>
            <button
              onClick={handleQuit}
              className="w-6 h-6 rounded-lg flex items-center justify-center text-zinc-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
              title="Quit"
            >
              <CloseIcon size={12} strokeWidth={2} />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 p-4 flex flex-col gap-3.5 overflow-y-auto">
          {/* Main Action Demo Button */}
          <button
            type="button"
            onClick={handleDemo}
            className="w-full py-3 px-4 rounded-xl flex items-center justify-center gap-2 font-semibold text-xs text-zinc-950 bg-white hover:bg-zinc-200 shadow-md active:scale-[0.99] transition-all cursor-pointer"
          >
            <SparklesIcon size={14} strokeWidth={2} />
            <span>Simulate Wheel Preview</span>
          </button>

          {/* Drag & Drop Zone */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`flex-1 rounded-xl flex flex-col items-center justify-center p-5 text-center border border-dashed transition-all ${
              isDragOver
                ? 'border-white/40 bg-white/[0.06] scale-[1.01]'
                : 'border-white/10 bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.04]'
            }`}
          >
            <ImageIcon size={26} strokeWidth={1.5} className="text-zinc-500 mb-2" />
            <p className="text-zinc-200 font-medium text-xs">
              Drop an image here
            </p>
            <p className="text-zinc-500 text-[11px] mt-1">
              or drag any image in Windows and press <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-zinc-300 font-mono text-[10px]">Tab</kbd>
            </p>
          </div>

          {/* Quick Select File Button */}
          <button
            type="button"
            onClick={handleSelectFile}
            className="w-full py-2.5 rounded-xl flex items-center justify-center gap-2 text-zinc-300 hover:text-white text-xs font-medium bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] transition-all cursor-pointer"
          >
            <span>Choose Image from Disk...</span>
          </button>

          {/* Footer Guide */}
          <div className="flex items-center justify-between px-1 text-[11px] text-zinc-500">
            <span>Trigger Gesture:</span>
            <span className="font-mono bg-white/[0.05] border border-white/[0.08] px-2 py-0.5 rounded text-zinc-400">
              Drag Image + Tab
            </span>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
