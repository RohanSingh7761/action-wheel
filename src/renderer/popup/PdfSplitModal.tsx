import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { loadAndRenderPdf, type RenderedPage as PageDetail } from './pdf-renderer'

export default function PdfSplitModal({ filePath }: PdfSplitModalProps): React.ReactElement {
  const [loading, setLoading] = useState(true)
  const [totalPages, setTotalPages] = useState(0)
  const [pages, setPages] = useState<PageDetail[]>([])
  const [selectedPages, setSelectedPages] = useState<Set<number>>(new Set())
  const [rangeInput, setRangeInput] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const fileName = filePath.split('\\').pop()?.split('/').pop() || 'Document'
  const baseName = fileName.replace(/\.[^/.]+$/, '')
  const defaultOutputName = `${baseName} (Extracted)`
  const [outputName, setOutputName] = useState(defaultOutputName)

  useEffect(() => {
    let isMounted = true
    const loadDetails = async () => {
      try {
        const result = await loadAndRenderPdf(filePath)
        if (result && isMounted) {
          setTotalPages(result.pageCount)
          setPages(result.pages || [])
          // Default: select all pages
          const all = new Set<number>()
          for (let i = 1; i <= result.pageCount; i++) all.add(i)
          setSelectedPages(all)
        }
      } catch (err) {
        console.error('Failed to load PDF details:', err)
      } finally {
        if (isMounted) setLoading(false)
      }
    }
    loadDetails()
    return () => {
      isMounted = false
    }
  }, [filePath])

  const togglePage = (pageNumber: number) => {
    setSelectedPages((prev) => {
      const next = new Set(prev)
      if (next.has(pageNumber)) {
        next.delete(pageNumber)
      } else {
        next.add(pageNumber)
      }
      return next
    })
  }

  const selectAll = () => {
    const all = new Set<number>()
    for (let i = 1; i <= totalPages; i++) all.add(i)
    setSelectedPages(all)
  }

  const clearAll = () => {
    setSelectedPages(new Set())
  }

  const handleRangeChange = (text: string) => {
    setRangeInput(text)
    // Parse range e.g. "1-3, 5, 8-10"
    const newSelected = new Set<number>()
    const parts = text.split(',')
    for (const part of parts) {
      const trimmed = part.trim()
      if (!trimmed) continue
      if (trimmed.includes('-')) {
        const [startStr, endStr] = trimmed.split('-')
        const start = parseInt(startStr, 10)
        const end = parseInt(endStr, 10)
        if (!isNaN(start) && !isNaN(end)) {
          const min = Math.max(1, Math.min(start, end))
          const max = Math.min(totalPages, Math.max(start, end))
          for (let p = min; p <= max; p++) newSelected.add(p)
        }
      } else {
        const p = parseInt(trimmed, 10)
        if (!isNaN(p) && p >= 1 && p <= totalPages) {
          newSelected.add(p)
        }
      }
    }
    if (newSelected.size > 0) {
      setSelectedPages(newSelected)
    }
  }

  const handleExtract = async () => {
    if (selectedPages.size === 0 || isSubmitting) return
    setIsSubmitting(true)
    const api = (window as any).popupAPI
    if (api?.confirm) {
      const pagesArray = Array.from(selectedPages).sort((a, b) => a - b)
      const cleanName = outputName.trim() || defaultOutputName
      await api.confirm({
        params: {
          selectedPages: pagesArray,
          outputName: cleanName.endsWith('.pdf') ? cleanName : `${cleanName}.pdf`
        }
      })
    }
  }

  const handleCancel = () => {
    ;(window as any).popupAPI?.cancel()
  }

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-3">
        <div className="w-7 h-7 rounded-full border-2 border-indigo-500/20 border-t-indigo-500 animate-spin" />
        <span className="text-xs text-zinc-400 font-medium tracking-wide">
          Rendering PDF pages…
        </span>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col justify-between select-none h-full min-h-[440px]">
      <div>
        {/* Output File Name */}
        <div className="mb-3">
          <div className="flex items-center justify-between mb-1">
            <label className="text-[11px] font-semibold text-zinc-300">
              Output PDF Name
            </label>
            <span className="text-[10px] text-zinc-400">
              {selectedPages.size} of {totalPages} pages selected
            </span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/[0.04] border border-white/[0.08] focus-within:border-indigo-500/80 transition-all">
            <input
              type="text"
              value={outputName}
              onChange={(e) => setOutputName(e.target.value)}
              placeholder={defaultOutputName}
              className="w-full bg-transparent text-xs text-white focus:outline-none placeholder-zinc-500 font-sans tracking-wide"
            />
            <span className="text-[11px] text-zinc-500 font-mono select-none">.pdf</span>
          </div>
        </div>

        {/* Quick Selection Toolbar */}
        <div className="flex items-center justify-between gap-2 mb-3 bg-white/[0.02] p-2 rounded-xl border border-white/[0.05]">
          <div className="flex items-center gap-2">
            <button
              onClick={selectAll}
              className="px-2.5 py-1 rounded-lg text-[10px] font-semibold bg-white/[0.06] hover:bg-white/[0.12] text-zinc-200 transition-colors"
            >
              Select All
            </button>
            <button
              onClick={clearAll}
              className="px-2.5 py-1 rounded-lg text-[10px] font-semibold bg-white/[0.06] hover:bg-white/[0.12] text-zinc-200 transition-colors"
            >
              Clear
            </button>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[10px] text-zinc-400">Range:</span>
            <input
              type="text"
              placeholder="e.g. 1-3, 5"
              value={rangeInput}
              onChange={(e) => handleRangeChange(e.target.value)}
              className="w-28 px-2 py-0.5 rounded-lg bg-black/40 border border-white/[0.08] text-[10px] text-white focus:outline-none focus:border-indigo-500/80 font-mono"
            />
          </div>
        </div>

        {/* Pages Thumbnail Grid */}
        <div className="max-h-[300px] overflow-y-auto pr-1 grid grid-cols-4 gap-3">
          {pages.map((p) => {
            const isSelected = selectedPages.has(p.pageNumber)
            return (
              <motion.div
                key={p.pageNumber}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => togglePage(p.pageNumber)}
                className={`relative group rounded-xl overflow-hidden cursor-pointer border transition-all flex flex-col items-center bg-black/40 p-1.5 ${
                  isSelected
                    ? 'border-indigo-500 ring-2 ring-indigo-500/30'
                    : 'border-white/[0.08] opacity-60 hover:opacity-100 hover:border-white/[0.2]'
                }`}
              >
                {/* Page Thumbnail */}
                <div className="w-full aspect-[1/1.3] bg-zinc-900 rounded-lg overflow-hidden flex items-center justify-center">
                  <img
                    src={p.dataUrl}
                    alt={`Page ${p.pageNumber}`}
                    className="w-full h-full object-contain"
                  />
                </div>

                {/* Badge Overlay */}
                <div className="w-full flex items-center justify-between mt-1 px-1">
                  <span className="text-[10px] font-mono text-zinc-300 font-medium">
                    Page {p.pageNumber}
                  </span>
                  <div
                    className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] transition-colors ${
                      isSelected
                        ? 'bg-indigo-500 text-white font-bold'
                        : 'border border-white/20 text-transparent'
                    }`}
                  >
                    ✓
                  </div>
                </div>
              </motion.div>
            )
          })}
        </div>
      </div>

      {/* Footer Actions */}
      <div className="pt-3 border-t border-white/[0.06] flex items-center justify-between mt-3">
        <button
          onClick={handleCancel}
          className="px-4 py-2 rounded-xl text-xs font-medium text-zinc-400 hover:text-white hover:bg-white/[0.06] transition-colors"
        >
          Cancel
        </button>

        <button
          onClick={handleExtract}
          disabled={selectedPages.size === 0 || isSubmitting}
          className={`px-5 py-2 rounded-xl text-xs font-semibold shadow-lg transition-all flex items-center gap-2 ${
            selectedPages.size > 0 && !isSubmitting
              ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/30 cursor-pointer'
              : 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
          }`}
        >
          {isSubmitting ? (
            'Extracting…'
          ) : (
            `Extract ${selectedPages.size} Page${selectedPages.size === 1 ? '' : 's'}`
          )}
        </button>
      </div>
    </div>
  )
}
