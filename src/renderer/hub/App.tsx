import React, { useState } from 'react'
import { motion } from 'framer-motion'

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
      // In Electron, File objects have a .path property
      const filePath = (file as any).path
      if (filePath) {
        ;(window as any).hubAPI?.dropFile(filePath)
      }
    }
  }

  return (
    <div className="w-full h-full p-3 flex items-center justify-center select-none font-sans">
      <motion.div
        className="w-full h-full rounded-3xl overflow-hidden flex flex-col relative"
        style={{
          background: 'rgba(15, 23, 42, 0.82)',
          backdropFilter: 'blur(32px) saturate(200%)',
          WebkitBackdropFilter: 'blur(32px) saturate(200%)',
          border: '1px solid rgba(255, 255, 255, 0.14)',
          boxShadow: '0 24px 60px rgba(0, 0, 0, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.12)'
        }}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
      >
        {/* Title Bar (Draggable) */}
        <div
          className="flex items-center justify-between px-5 py-4 cursor-move"
          style={{
            // @ts-ignore
            WebkitAppRegion: 'drag',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)'
          }}
        >
          <div className="flex items-center gap-2.5">
            <span className="text-xl">🌀</span>
            <span className="text-white font-semibold text-sm tracking-wide">
              Action Wheel
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              Live
            </span>
          </div>

          <div
            className="flex items-center gap-1.5"
            style={{
              // @ts-ignore
              WebkitAppRegion: 'no-drag'
            }}
          >
            <button
              onClick={handleMinimize}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 transition-colors"
              title="Minimize to background"
            >
              —
            </button>
            <button
              onClick={handleQuit}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-white/50 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
              title="Quit"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 p-5 flex flex-col gap-4 overflow-y-auto">
          {/* Main Action Demo Button */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleDemo}
            className="w-full py-4 rounded-2xl flex items-center justify-center gap-3 font-semibold text-white text-base shadow-lg transition-all"
            style={{
              background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
              border: '1px solid rgba(255, 255, 255, 0.25)',
              boxShadow: '0 8px 24px rgba(59, 130, 246, 0.35)'
            }}
          >
            <span className="text-xl">✨</span>
            <span>Launch Action Wheel Now</span>
          </motion.button>

          {/* Drag & Drop Zone */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`flex-1 rounded-2xl flex flex-col items-center justify-center p-6 text-center border-2 border-dashed transition-all ${
              isDragOver
                ? 'border-blue-400 bg-blue-500/20 scale-[1.01]'
                : 'border-white/15 bg-white/[0.03] hover:border-white/30 hover:bg-white/[0.05]'
            }`}
          >
            <span className="text-4xl mb-2">🖼️</span>
            <p className="text-white/90 font-medium text-sm">
              Drop an image here
            </p>
            <p className="text-white/40 text-xs mt-1">
              or drag an image anywhere on Windows and press <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-white/80 font-mono text-[11px]">Tab</kbd>
            </p>
          </div>

          {/* Quick Select File Button */}
          <motion.button
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            onClick={handleSelectFile}
            className="w-full py-3 rounded-xl flex items-center justify-center gap-2 text-white/80 hover:text-white text-xs font-medium bg-white/5 hover:bg-white/10 border border-white/10 transition-colors"
          >
            <span>📂</span>
            <span>Choose Image from Disk...</span>
          </motion.button>

          {/* Footer Guide */}
          <div className="flex items-center justify-between px-1 text-[11px] text-white/40">
            <span>Global Hotkey:</span>
            <span className="font-mono bg-white/10 px-2 py-0.5 rounded text-white/70">
              Ctrl + Shift + W
            </span>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
