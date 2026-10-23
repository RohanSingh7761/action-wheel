import React, { useState, useEffect } from 'react'
import { loadAndRenderPdf, type RenderedPage as PageDetail } from './pdf-renderer'

interface PdfSplitModalProps {
  filePath: string
}

export default function PdfSplitModal({ filePath }: PdfSplitModalProps): React.ReactElement {
  const [loading, setLoading] = useState(true)
  const [totalPages, setTotalPages] = useState(0)
  const [pages, setPages] = useState<PageDetail[]>([])
  const [selectedPages, setSelectedPages] = useState<Set<number>>(new Set())

  // Visual Range Picker inputs (string state allows free typing/backspacing without snapback)
  const [rangeFromInput, setRangeFromInput] = useState<string>('1')
  const [rangeToStr, setRangeToStr] = useState<string>('1')

  // Last clicked page for Shift+Click multi-selection
  const [lastClickedPage, setLastClickedPage] = useState<number | null>(null)

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
          setRangeFromInput('1')
          setRangeToStr(String(result.pageCount))
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

  const togglePage = (pageNumber: number, isShiftKey = false) => {
    if (isShiftKey && lastClickedPage !== null) {
      const min = Math.min(lastClickedPage, pageNumber)
      const max = Math.max(lastClickedPage, pageNumber)
      setSelectedPages((prev) => {
        const next = new Set(prev)
        for (let p = min; p <= max; p++) next.add(p)
        return next
      })
    } else {
      setSelectedPages((prev) => {
        const next = new Set(prev)
        if (next.has(pageNumber)) {
          next.delete(pageNumber)
        } else {
          next.add(pageNumber)
        }
        return next
      })
      setLastClickedPage(pageNumber)
    }
  }

  // Live range update reflecting immediately in selected checkboxes
  const updateRangeLive = (fromVal: string, toVal: string) => {
    setRangeFromInput(fromVal)
    setRangeToStr(toVal)

    const fromNum = parseInt(fromVal, 10)
    const toNum = parseInt(toVal, 10)

    if (!isNaN(fromNum) && !isNaN(toNum) && fromNum >= 1 && toNum >= 1) {
      const clampedFrom = Math.min(Math.max(1, fromNum), totalPages)
      const clampedTo = Math.min(Math.max(1, toNum), totalPages)
      const min = Math.min(clampedFrom, clampedTo)
      const max = Math.max(clampedFrom, clampedTo)
      const nextSet = new Set<number>()
      for (let p = min; p <= max; p++) {
        nextSet.add(p)
      }
      setSelectedPages(nextSet)
    }
  }

  const handleBlurFrom = () => {
    const num = parseInt(rangeFromInput, 10)
    if (isNaN(num) || num < 1) {
      updateRangeLive('1', rangeToStr)
    } else if (num > totalPages) {
      updateRangeLive(String(totalPages), rangeToStr)
    }
  }

  const handleBlurTo = () => {
    const num = parseInt(rangeToStr, 10)
    if (isNaN(num) || num < 1) {
      updateRangeLive(rangeFromInput, String(totalPages))
    } else if (num > totalPages) {
      updateRangeLive(rangeFromInput, String(totalPages))
    }
  }

  // Range Presets
  const selectAll = () => {
    const all = new Set<number>()
    for (let i = 1; i <= totalPages; i++) all.add(i)
    setSelectedPages(all)
    setRangeFromInput('1')
    setRangeToStr(String(totalPages))
  }

  const clearAll = () => {
    setSelectedPages(new Set())
    setRangeFromInput('')
    setRangeToStr('')
  }

  const selectFirstHalf = () => {
    const mid = Math.ceil(totalPages / 2)
    const s = new Set<number>()
    for (let i = 1; i <= mid; i++) s.add(i)
    setSelectedPages(s)
    setRangeFromInput('1')
    setRangeToStr(String(mid))
  }

  const selectSecondHalf = () => {
    const mid = Math.ceil(totalPages / 2) + 1
    const s = new Set<number>()
    for (let i = mid; i <= totalPages; i++) s.add(i)
    setSelectedPages(s)
    setRangeFromInput(String(mid))
    setRangeToStr(String(totalPages))
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
      <div className="flex-1 flex flex-col items-center justify-center gap-3 min-h-[400px]">
        <div className="w-8 h-8 rounded-full border-2 border-indigo-500/20 border-t-indigo-500 animate-spin" />
        <span className="text-xs text-zinc-400 font-medium tracking-wide">
          Rendering PDF thumbnails…
        </span>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col justify-between select-none h-full min-h-[500px]">
      <div>
        {/* Output File Name */}
        <div className="mb-3">
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-semibold text-zinc-300">
              Output PDF Name
            </label>
            <span className="text-[11px] text-zinc-400 font-mono">
              {selectedPages.size} of {totalPages} pages selected
            </span>
          </div>
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-black/40 border border-white/[0.08] focus-within:border-indigo-500/80 transition-all">
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

        {/* Visual Range Picker & Preset Bar */}
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3 bg-black/40 p-2.5 rounded-2xl border border-white/[0.06]">
          {/* Range Picker with Live Checkbox Update */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-zinc-400 font-medium">Range:</span>
            <span className="text-[11px] text-zinc-500">From</span>
            <input
              type="text"
              inputMode="numeric"
              value={rangeFromInput}
              onChange={(e) => {
                const clean = e.target.value.replace(/[^0-9]/g, '')
                updateRangeLive(clean, rangeToStr)
              }}
              onBlur={handleBlurFrom}
              placeholder="1"
              className="w-14 px-2 py-1 rounded-lg bg-white/[0.06] border border-white/[0.1] text-xs text-white text-center font-mono focus:outline-none focus:border-indigo-500"
            />
            <span className="text-[11px] text-zinc-500">to</span>
            <input
              type="text"
              inputMode="numeric"
              value={rangeToStr}
              onChange={(e) => {
                const clean = e.target.value.replace(/[^0-9]/g, '')
                updateRangeLive(rangeFromInput, clean)
              }}
              onBlur={handleBlurTo}
              placeholder={String(totalPages)}
              className="w-14 px-2 py-1 rounded-lg bg-white/[0.06] border border-white/[0.1] text-xs text-white text-center font-mono focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* Quick Preset Chips (Odd and Even removed) */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {[
              { label: 'All', fn: selectAll },
              { label: '1st Half', fn: selectFirstHalf },
              { label: '2nd Half', fn: selectSecondHalf },
              { label: 'Clear', fn: clearAll }
            ].map((p) => (
              <button
                key={p.label}
                onClick={p.fn}
                className="px-2.5 py-1 rounded-lg text-[10.5px] font-semibold bg-white/[0.06] hover:bg-white/[0.12] text-zinc-300 hover:text-white transition-colors cursor-pointer active:scale-95"
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Pages Thumbnail Grid - with comfortable padding to prevent boundary clipping */}
        <div className="max-h-[320px] overflow-y-auto p-2 bg-black/30 rounded-2xl border border-white/[0.06] grid grid-cols-4 sm:grid-cols-5 gap-3.5 shadow-inner">
          {pages.map((p) => {
            const isSelected = selectedPages.has(p.pageNumber)
            return (
              <div
                key={p.pageNumber}
                onClick={(e) => togglePage(p.pageNumber, e.shiftKey)}
                className={`relative rounded-xl overflow-hidden cursor-pointer transition-all flex flex-col items-center bg-zinc-950 p-2 border ${
                  isSelected
                    ? 'border-indigo-500 ring-2 ring-indigo-500/50 shadow-lg shadow-indigo-500/20'
                    : 'border-white/[0.08] opacity-65 hover:opacity-100 hover:border-white/30'
                }`}
                title={`Click to toggle page ${p.pageNumber} (Shift+Click for multi-range)`}
              >
                {/* Page Thumbnail */}
                <div className="w-full aspect-[1/1.3] bg-zinc-900 rounded-lg overflow-hidden flex items-center justify-center shadow">
                  <img
                    src={p.dataUrl}
                    alt={`Page ${p.pageNumber}`}
                    className="w-full h-full object-contain pointer-events-none"
                  />
                </div>

                {/* Badge Overlay */}
                <div className="w-full flex items-center justify-between mt-1.5 px-0.5">
                  <span className="text-[10px] font-mono text-zinc-300 font-semibold">
                    Page {p.pageNumber}
                  </span>
                  <div
                    className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] transition-colors ${
                      isSelected
                        ? 'bg-indigo-500 text-white font-bold shadow'
                        : 'border border-white/20 text-transparent'
                    }`}
                  >
                    ✓
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Upgraded Footer */}
      <div className="pt-4 border-t border-white/[0.08] flex items-center justify-between mt-3">
        <button
          onClick={handleCancel}
          className="px-5 py-2.5 rounded-xl text-xs font-semibold text-zinc-300 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] transition-all cursor-pointer active:scale-95 shadow-sm"
        >
          Cancel
        </button>

        <button
          onClick={handleExtract}
          disabled={selectedPages.size === 0 || isSubmitting}
          className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold text-white transition-all shadow-lg active:scale-95 ${
            selectedPages.size > 0 && !isSubmitting
              ? 'bg-gradient-to-r from-indigo-600 via-indigo-500 to-indigo-600 hover:from-indigo-500 hover:to-indigo-500 shadow-indigo-600/30 cursor-pointer'
              : 'bg-zinc-800 text-zinc-500 cursor-not-allowed shadow-none'
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
