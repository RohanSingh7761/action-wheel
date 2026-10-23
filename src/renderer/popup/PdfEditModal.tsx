import React, { useState, useEffect, useRef } from 'react'
import type { PdfEditAnnotation } from '../../shared/ipc-types'
import { loadAndRenderPdf, type RenderedPage as PageDetail } from './pdf-renderer'

interface PdfEditModalProps {
  filePath: string
}

type ToolMode = 'text' | 'whiteout' | 'redact' | 'highlight'

export default function PdfEditModal({ filePath }: PdfEditModalProps): React.ReactElement {
  const [loading, setLoading] = useState(true)
  const [pages, setPages] = useState<PageDetail[]>([])
  const [currentPage, setCurrentPage] = useState(1)

  // Current active tool
  const [tool, setTool] = useState<ToolMode>('highlight')

  // Text options
  const [textInput, setTextInput] = useState('Confidential')
  const [fontSize, setFontSize] = useState<number>(14)
  const [textColor, setTextColor] = useState<string>('#000000')

  // All annotations across all pages
  const [annotations, setAnnotations] = useState<PdfEditAnnotation[]>([])

  // Drawing rectangle state
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null)
  const [dragCurrent, setDragCurrent] = useState<{ x: number; y: number } | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const containerRef = useRef<HTMLDivElement | null>(null)

  // Load PDF pages
  useEffect(() => {
    let isMounted = true
    const loadDetails = async () => {
      try {
        const result = await loadAndRenderPdf(filePath)
        if (result && isMounted && result.pages?.length > 0) {
          setPages(result.pages)
          setCurrentPage(1)
        }
      } catch (err) {
        console.error('Failed to load PDF details for edit:', err)
      } finally {
        if (isMounted) setLoading(false)
      }
    }
    loadDetails()
    return () => {
      isMounted = false
    }
  }, [filePath])

  const activePageDetail = pages[currentPage - 1]

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    const container = containerRef.current
    if (!container || !activePageDetail) return
    const rect = container.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    if (tool === 'text') {
      if (!textInput.trim()) return
      // Calculate scale from container size to actual PDF points
      const scaleX = activePageDetail.width / rect.width
      const scaleY = activePageDetail.height / rect.height

      const newAnnotation: PdfEditAnnotation = {
        type: 'text',
        page: currentPage,
        x: Math.round(x * scaleX),
        y: Math.round(y * scaleY),
        text: textInput.trim(),
        fontSize,
        color: textColor
      }
      setAnnotations((prev) => [...prev, newAnnotation])
    } else {
      setDragStart({ x, y })
      setDragCurrent({ x, y })
    }
  }

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!dragStart || !containerRef.current) return
    const rect = containerRef.current.getBoundingClientRect()
    const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width))
    const y = Math.max(0, Math.min(e.clientY - rect.top, rect.height))
    setDragCurrent({ x, y })
  }

  const handleMouseUp = () => {
    if (!dragStart || !dragCurrent || !containerRef.current || !activePageDetail) {
      setDragStart(null)
      setDragCurrent(null)
      return
    }

    const rect = containerRef.current.getBoundingClientRect()
    const left = Math.min(dragStart.x, dragCurrent.x)
    const top = Math.min(dragStart.y, dragCurrent.y)
    const width = Math.abs(dragCurrent.x - dragStart.x)
    const height = Math.abs(dragCurrent.y - dragStart.y)

    // Ignore tiny accidental clicks
    if (width > 5 && height > 5) {
      const scaleX = activePageDetail.width / rect.width
      const scaleY = activePageDetail.height / rect.height

      const newAnnotation: PdfEditAnnotation = {
        type: tool,
        page: currentPage,
        x: Math.round(left * scaleX),
        y: Math.round(top * scaleY),
        width: Math.round(width * scaleX),
        height: Math.round(height * scaleY)
      }
      setAnnotations((prev) => [...prev, newAnnotation])
    }

    setDragStart(null)
    setDragCurrent(null)
  }

  const undo = () => {
    setAnnotations((prev) => prev.slice(0, -1))
  }

  const clearCurrentPage = () => {
    setAnnotations((prev) => prev.filter((a) => a.page !== currentPage))
  }

  const removeAnnotation = (index: number) => {
    setAnnotations((prev) => prev.filter((_, i) => i !== index))
  }

  const handleSave = async () => {
    if (annotations.length === 0 || isSubmitting) return
    setIsSubmitting(true)
    const api = (window as any).popupAPI
    if (api?.confirm) {
      await api.confirm({
        params: {
          annotations
        }
      })
    }
  }

  const handleCancel = () => {
    ;(window as any).popupAPI?.cancel()
  }

  if (loading || !activePageDetail) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-3">
        <div className="w-7 h-7 rounded-full border-2 border-indigo-500/20 border-t-indigo-500 animate-spin" />
        <span className="text-xs text-zinc-400 font-medium tracking-wide">
          Loading document editor…
        </span>
      </div>
    )
  }

  // Current live drawing preview box in display coordinates
  const drawingBox =
    dragStart && dragCurrent
      ? {
          left: Math.min(dragStart.x, dragCurrent.x),
          top: Math.min(dragStart.y, dragCurrent.y),
          width: Math.abs(dragCurrent.x - dragStart.x),
          height: Math.abs(dragCurrent.y - dragStart.y)
        }
      : null

  const pageAnnotations = annotations
    .map((ann, idx) => ({ ...ann, globalIndex: idx }))
    .filter((a) => a.page === currentPage)

  return (
    <div className="flex-1 flex flex-col justify-between select-none h-full min-h-[460px]">
      <div>
        {/* Toolbar */}
        <div className="flex items-center justify-between gap-3 p-2 bg-black/40 border border-white/[0.06] rounded-xl mb-3">
          {/* Tool Selector */}
          <div className="flex items-center gap-1">
            {[
              { id: 'highlight' as ToolMode, label: 'Highlight', icon: '🟨' },
              { id: 'whiteout' as ToolMode, label: 'Whiteout', icon: '⬜' },
              { id: 'redact' as ToolMode, label: 'Redact', icon: '⬛' },
              { id: 'text' as ToolMode, label: 'Text', icon: '🔤' }
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => setTool(t.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  tool === t.id
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-zinc-400 hover:text-white hover:bg-white/[0.05]'
                }`}
              >
                <span>{t.icon}</span>
                <span>{t.label}</span>
              </button>
            ))}
          </div>

          {/* Action Buttons: Undo & Clear */}
          <div className="flex items-center gap-2">
            <button
              onClick={undo}
              disabled={annotations.length === 0}
              className="px-2.5 py-1 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] disabled:opacity-30 disabled:cursor-not-allowed text-xs text-zinc-300 font-medium transition-colors"
              title="Undo last annotation"
            >
              Undo
            </button>
            <button
              onClick={clearCurrentPage}
              disabled={pageAnnotations.length === 0}
              className="px-2.5 py-1 rounded-lg bg-white/[0.06] hover:bg-red-500/20 hover:text-red-300 disabled:opacity-30 disabled:cursor-not-allowed text-xs text-zinc-400 font-medium transition-colors"
              title="Clear annotations on this page"
            >
              Clear Page
            </button>
          </div>
        </div>

        {/* Text tool secondary controls */}
        {tool === 'text' && (
          <div className="flex items-center gap-3 p-2 bg-white/[0.02] border border-white/[0.06] rounded-xl mb-3">
            <input
              type="text"
              placeholder="Text to stamp"
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              className="flex-1 px-2.5 py-1 rounded-lg bg-black/40 border border-white/[0.08] text-xs text-white focus:outline-none focus:border-indigo-500"
            />
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-zinc-400">Size:</span>
              {[12, 16, 22].map((s) => (
                <button
                  key={s}
                  onClick={() => setFontSize(s)}
                  className={`w-6 h-6 rounded text-[11px] font-mono transition-colors ${
                    fontSize === s
                      ? 'bg-indigo-600 text-white font-bold'
                      : 'bg-white/[0.06] text-zinc-400 hover:text-white'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-1.5">
              {['#000000', '#ef4444', '#2563eb', '#ffffff'].map((c) => (
                <button
                  key={c}
                  onClick={() => setTextColor(c)}
                  style={{ backgroundColor: c }}
                  className={`w-4 h-4 rounded-full border transition-transform ${
                    textColor === c ? 'border-white scale-125' : 'border-white/20'
                  }`}
                />
              ))}
            </div>
          </div>
        )}

        {/* Page Switcher Header */}
        <div className="flex items-center justify-between mb-2 px-1">
          <span className="text-[11px] font-mono text-zinc-400">
            Page {currentPage} of {pages.length} · {pageAnnotations.length} edit(s) on this page
          </span>
          <div className="flex items-center gap-1.5">
            <button
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="w-6 h-6 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] disabled:opacity-30 disabled:cursor-not-allowed text-xs text-white flex items-center justify-center transition-colors"
            >
              ‹
            </button>
            <button
              disabled={currentPage >= pages.length}
              onClick={() => setCurrentPage((p) => Math.min(pages.length, p + 1))}
              className="w-6 h-6 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] disabled:opacity-30 disabled:cursor-not-allowed text-xs text-white flex items-center justify-center transition-colors"
            >
              ›
            </button>
          </div>
        </div>

        {/* Interactive PDF Document Page */}
        <div className="w-full flex justify-center bg-black/50 rounded-xl p-2 border border-white/[0.08]">
          <div
            ref={containerRef}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            className="relative max-h-[310px] aspect-[1/1.4] bg-white rounded shadow-xl overflow-hidden cursor-crosshair select-none"
          >
            <img
              src={activePageDetail.dataUrl}
              alt="Page render"
              className="w-full h-full object-contain pointer-events-none"
            />

            {/* Render Saved Annotations on this page */}
            {containerRef.current &&
              pageAnnotations.map((ann) => {
                const rect = containerRef.current!.getBoundingClientRect()
                const scaleX = rect.width / activePageDetail.width
                const scaleY = rect.height / activePageDetail.height

                const left = ann.x * scaleX
                const top = ann.y * scaleY
                const width = (ann.width || 0) * scaleX
                const height = (ann.height || 0) * scaleY

                if (ann.type === 'text') {
                  return (
                    <div
                      key={ann.globalIndex}
                      style={{
                        left,
                        top,
                        fontSize: (ann.fontSize || 14) * scaleY,
                        color: ann.color || '#000000'
                      }}
                      className="absolute font-bold whitespace-nowrap leading-none group cursor-pointer"
                    >
                      <span>{ann.text}</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          removeAnnotation(ann.globalIndex)
                        }}
                        className="opacity-0 group-hover:opacity-100 ml-1 text-red-500 font-normal text-xs"
                      >
                        ×
                      </button>
                    </div>
                  )
                }

                return (
                  <div
                    key={ann.globalIndex}
                    style={{
                      left,
                      top,
                      width,
                      height,
                      backgroundColor:
                        ann.type === 'whiteout'
                          ? '#ffffff'
                          : ann.type === 'redact'
                          ? '#000000'
                          : 'rgba(250, 204, 21, 0.45)'
                    }}
                    className="absolute group border border-transparent hover:border-red-400"
                  >
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        removeAnnotation(ann.globalIndex)
                      }}
                      className="opacity-0 group-hover:opacity-100 absolute -top-2 -right-2 w-4 h-4 rounded-full bg-red-600 text-white text-[9px] flex items-center justify-center shadow"
                    >
                      ×
                    </button>
                  </div>
                )
              })}

            {/* Realtime Drawing Preview */}
            {drawingBox && (
              <div
                style={{
                  left: drawingBox.left,
                  top: drawingBox.top,
                  width: drawingBox.width,
                  height: drawingBox.height,
                  backgroundColor:
                    tool === 'whiteout'
                      ? '#ffffff'
                      : tool === 'redact'
                      ? '#000000'
                      : 'rgba(250, 204, 21, 0.45)'
                }}
                className="absolute border border-indigo-400 pointer-events-none"
              />
            )}
          </div>
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
          onClick={handleSave}
          disabled={annotations.length === 0 || isSubmitting}
          className={`px-5 py-2 rounded-xl text-xs font-semibold shadow-lg transition-all flex items-center gap-2 ${
            annotations.length > 0 && !isSubmitting
              ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/30 cursor-pointer'
              : 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
          }`}
        >
          {isSubmitting
            ? 'Saving PDF…'
            : `Save Changes (${annotations.length} edit${annotations.length === 1 ? '' : 's'})`}
        </button>
      </div>
    </div>
  )
}
