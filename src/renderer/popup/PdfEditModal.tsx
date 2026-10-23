import React, { useState, useEffect, useRef } from 'react'
import type { PdfEditAnnotation } from '../../shared/ipc-types'
import { loadAndRenderPdf, type RenderedPage as PageDetail } from './pdf-renderer'

interface PdfEditModalProps {
  filePath: string
}

type ToolMode = 'select' | 'text' | 'whiteout' | 'redact' | 'highlight'

interface EditorAnnotation extends PdfEditAnnotation {
  id: string
}

const PRESET_COLORS = [
  '#000000',
  '#dc2626',
  '#2563eb',
  '#16a34a',
  '#d97706',
  '#7c3aed',
  '#ffffff'
]

export default function PdfEditModal({ filePath }: PdfEditModalProps): React.ReactElement {
  const [loading, setLoading] = useState(true)
  const [pages, setPages] = useState<PageDetail[]>([])
  const [currentPage, setCurrentPage] = useState(1)

  // Zoom control
  const [zoom, setZoom] = useState<number>(1.0)

  // Current active tool: 'select' allows clicking/moving/resizing; others allow drawing
  const [tool, setTool] = useState<ToolMode>('highlight')

  // Selected annotation
  const [selectedId, setSelectedId] = useState<string | null>(null)

  // Text options
  const [textInput, setTextInput] = useState('Confidential')
  const [fontSize, setFontSize] = useState<number>(16)
  const [textColor, setTextColor] = useState<string>('#000000')

  // All annotations across all pages
  const [annotations, setAnnotations] = useState<EditorAnnotation[]>([])

  // Interaction states: drawing, moving, resizing
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null)
  const [dragCurrent, setDragCurrent] = useState<{ x: number; y: number } | null>(null)
  const [interactionMode, setInteractionMode] = useState<'none' | 'draw' | 'move' | 'resize'>('none')
  const [moveStartPos, setMoveStartPos] = useState<{ startX: number; startY: number; origX: number; origY: number; origW: number; origH: number } | null>(null)

  const [isSubmitting, setIsSubmitting] = useState(false)
  const containerRef = useRef<HTMLDivElement | null>(null)

  // Reset all progress when filePath changes or on fresh mount
  useEffect(() => {
    let isMounted = true
    setAnnotations([])
    setSelectedId(null)
    setZoom(1.0)
    setTool('highlight')
    setIsSubmitting(false)
    setLoading(true)

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

  // Keyboard shortcut to delete selected annotation
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedId) {
        // If typing in input, don't delete annotation
        if (document.activeElement?.tagName === 'INPUT') return
        e.preventDefault()
        setAnnotations((prev) => prev.filter((a) => a.id !== selectedId))
        setSelectedId(null)
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [selectedId])

  const activePageDetail = pages[currentPage - 1]

  // When selected annotation changes and it's text, sync toolbar
  useEffect(() => {
    if (!selectedId) return
    const ann = annotations.find((a) => a.id === selectedId)
    if (ann && ann.type === 'text') {
      if (ann.text) setTextInput(ann.text)
      if (ann.fontSize) setFontSize(ann.fontSize)
      if (ann.color) setTextColor(ann.color)
    }
  }, [selectedId])

  // Live update text annotation on PDF when user types in the input
  const handleTextInputChange = (val: string) => {
    setTextInput(val)
    if (selectedId) {
      setAnnotations((prev) =>
        prev.map((a) => (a.id === selectedId && a.type === 'text' ? { ...a, text: val } : a))
      )
    }
  }

  // Live update color
  const handleColorChange = (newColor: string) => {
    setTextColor(newColor)
    if (selectedId) {
      setAnnotations((prev) =>
        prev.map((a) => (a.id === selectedId ? { ...a, color: newColor } : a))
      )
    }
  }

  // Live update font size
  const handleFontSizeChange = (size: number) => {
    setFontSize(size)
    if (selectedId) {
      setAnnotations((prev) =>
        prev.map((a) => (a.id === selectedId && a.type === 'text' ? { ...a, fontSize: size } : a))
      )
    }
  }

  // Mouse Down on Page
  const handlePageMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    const container = containerRef.current
    if (!container || !activePageDetail) return
    const rect = container.getBoundingClientRect()
    const x = (e.clientX - rect.left) / zoom
    const y = (e.clientY - rect.top) / zoom

    if (tool === 'select') {
      setSelectedId(null)
      return
    }

    if (tool === 'text') {
      const scaleX = activePageDetail.width / (rect.width / zoom)
      const scaleY = activePageDetail.height / (rect.height / zoom)

      const newId = Math.random().toString(36).substring(2, 9)
      const newAnnotation: EditorAnnotation = {
        id: newId,
        type: 'text',
        page: currentPage,
        x: Math.round(x * scaleX),
        y: Math.round(y * scaleY),
        text: textInput.trim() || 'Custom Text',
        fontSize,
        color: textColor
      }
      setAnnotations((prev) => [...prev, newAnnotation])
      setSelectedId(newId)
    } else {
      setSelectedId(null)
      setDragStart({ x, y })
      setDragCurrent({ x, y })
      setInteractionMode('draw')
    }
  }

  // Mouse Move on Page
  const handlePageMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const container = containerRef.current
    if (!container || !activePageDetail) return
    const rect = container.getBoundingClientRect()
    const x = (e.clientX - rect.left) / zoom
    const y = (e.clientY - rect.top) / zoom

    if (interactionMode === 'draw' && dragStart) {
      setDragCurrent({ x, y })
    } else if (interactionMode === 'move' && moveStartPos && selectedId) {
      const scaleX = activePageDetail.width / (rect.width / zoom)
      const scaleY = activePageDetail.height / (rect.height / zoom)
      const dx = (x - moveStartPos.startX) * scaleX
      const dy = (y - moveStartPos.startY) * scaleY

      setAnnotations((prev) =>
        prev.map((a) =>
          a.id === selectedId
            ? {
                ...a,
                x: Math.round(Math.max(0, moveStartPos.origX + dx)),
                y: Math.round(Math.max(0, moveStartPos.origY + dy))
              }
            : a
        )
      )
    } else if (interactionMode === 'resize' && moveStartPos && selectedId) {
      const scaleX = activePageDetail.width / (rect.width / zoom)
      const scaleY = activePageDetail.height / (rect.height / zoom)
      const dx = (x - moveStartPos.startX) * scaleX
      const dy = (y - moveStartPos.startY) * scaleY

      setAnnotations((prev) =>
        prev.map((a) =>
          a.id === selectedId
            ? {
                ...a,
                width: Math.round(Math.max(15, moveStartPos.origW + dx)),
                height: Math.round(Math.max(10, moveStartPos.origH + dy))
              }
            : a
        )
      )
    }
  }

  // Mouse Up
  const handlePageMouseUp = () => {
    if (interactionMode === 'draw' && dragStart && dragCurrent && activePageDetail && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect()
      const left = Math.min(dragStart.x, dragCurrent.x)
      const top = Math.min(dragStart.y, dragCurrent.y)
      const width = Math.abs(dragCurrent.x - dragStart.x)
      const height = Math.abs(dragCurrent.y - dragStart.y)

      if (width > 5 && height > 5) {
        const scaleX = activePageDetail.width / (rect.width / zoom)
        const scaleY = activePageDetail.height / (rect.height / zoom)

        const newId = Math.random().toString(36).substring(2, 9)
        const newAnnotation: EditorAnnotation = {
          id: newId,
          type: tool as 'whiteout' | 'redact' | 'highlight',
          page: currentPage,
          x: Math.round(left * scaleX),
          y: Math.round(top * scaleY),
          width: Math.round(width * scaleX),
          height: Math.round(height * scaleY)
        }
        setAnnotations((prev) => [...prev, newAnnotation])
        setSelectedId(newId)
      }
    }

    setDragStart(null)
    setDragCurrent(null)
    setInteractionMode('none')
    setMoveStartPos(null)
  }

  // Start moving an existing annotation
  const startMove = (e: React.MouseEvent, ann: EditorAnnotation) => {
    e.stopPropagation()
    setSelectedId(ann.id)
    if (!containerRef.current) return
    const rect = containerRef.current.getBoundingClientRect()
    const x = (e.clientX - rect.left) / zoom
    const y = (e.clientY - rect.top) / zoom

    setMoveStartPos({
      startX: x,
      startY: y,
      origX: ann.x,
      origY: ann.y,
      origW: ann.width || 0,
      origH: ann.height || 0
    })
    setInteractionMode('move')
  }

  // Start resizing an existing annotation
  const startResize = (e: React.MouseEvent, ann: EditorAnnotation) => {
    e.stopPropagation()
    setSelectedId(ann.id)
    if (!containerRef.current) return
    const rect = containerRef.current.getBoundingClientRect()
    const x = (e.clientX - rect.left) / zoom
    const y = (e.clientY - rect.top) / zoom

    setMoveStartPos({
      startX: x,
      startY: y,
      origX: ann.x,
      origY: ann.y,
      origW: ann.width || 0,
      origH: ann.height || 0
    })
    setInteractionMode('resize')
  }

  const handleSave = async () => {
    if (annotations.length === 0 || isSubmitting) return
    setIsSubmitting(true)
    const api = (window as any).popupAPI
    if (api?.confirm) {
      // Strip internal IDs before sending to main process
      const cleaned = annotations.map(({ id, ...rest }) => rest)
      await api.confirm({
        params: {
          annotations: cleaned
        }
      })
    }
  }

  const handleCancel = () => {
    // Progress is completely discarded on cancel
    setAnnotations([])
    ;(window as any).popupAPI?.cancel()
  }

  if (loading || !activePageDetail) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-3 min-h-[400px]">
        <div className="w-8 h-8 rounded-full border-2 border-indigo-500/20 border-t-indigo-500 animate-spin" />
        <span className="text-xs text-zinc-400 font-medium tracking-wide">
          Loading document editor…
        </span>
      </div>
    )
  }

  const pageAnnotations = annotations.filter((a) => a.page === currentPage)

  const drawingBox =
    dragStart && dragCurrent
      ? {
          left: Math.min(dragStart.x, dragCurrent.x),
          top: Math.min(dragStart.y, dragCurrent.y),
          width: Math.abs(dragCurrent.x - dragStart.x),
          height: Math.abs(dragCurrent.y - dragStart.y)
        }
      : null

  return (
    <div className="flex-1 flex flex-col justify-between select-none h-full min-h-[520px]">
      <div>
        {/* Top Primary Toolbar */}
        <div className="flex items-center justify-between gap-3 p-2.5 bg-black/50 border border-white/[0.08] rounded-2xl mb-3 shadow-inner">
          {/* Tool Selector */}
          <div className="flex items-center gap-1.5">
            {[
              { id: 'select' as ToolMode, label: 'Select / Move', icon: '↖' },
              { id: 'highlight' as ToolMode, label: 'Highlight', icon: '🟨' },
              { id: 'whiteout' as ToolMode, label: 'Whiteout', icon: '⬜' },
              { id: 'redact' as ToolMode, label: 'Redact', icon: '⬛' },
              { id: 'text' as ToolMode, label: 'Text', icon: '🔤' }
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => {
                  setTool(t.id)
                  if (t.id !== 'select') setSelectedId(null)
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  tool === t.id
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                    : 'text-zinc-400 hover:text-white hover:bg-white/[0.06]'
                }`}
              >
                <span>{t.icon}</span>
                <span>{t.label}</span>
              </button>
            ))}
          </div>

          {/* Zoom Controls & Page Navigation */}
          <div className="flex items-center gap-3">
            {/* Zoom Widget */}
            <div className="flex items-center gap-1 bg-white/[0.04] p-1 rounded-xl border border-white/[0.06]">
              <button
                onClick={() => setZoom((z) => Math.max(0.5, Math.round((z - 0.25) * 100) / 100))}
                className="w-6 h-6 rounded-lg hover:bg-white/10 text-xs text-zinc-300 font-bold flex items-center justify-center transition-colors"
                title="Zoom Out"
              >
                -
              </button>
              <button
                onClick={() => setZoom(1.0)}
                className="px-2 py-0.5 text-[11px] font-mono text-zinc-300 hover:text-white transition-colors"
                title="Reset Zoom"
              >
                {Math.round(zoom * 100)}%
              </button>
              <button
                onClick={() => setZoom((z) => Math.min(2.5, Math.round((z + 0.25) * 100) / 100))}
                className="w-6 h-6 rounded-lg hover:bg-white/10 text-xs text-zinc-300 font-bold flex items-center justify-center transition-colors"
                title="Zoom In"
              >
                +
              </button>
            </div>

            {/* Page Navigation */}
            <div className="flex items-center gap-1.5 bg-white/[0.04] p-1 rounded-xl border border-white/[0.06]">
              <button
                disabled={currentPage <= 1}
                onClick={() => {
                  setSelectedId(null)
                  setCurrentPage((p) => Math.max(1, p - 1))
                }}
                className="w-6 h-6 rounded-lg hover:bg-white/10 disabled:opacity-20 text-xs text-zinc-300 flex items-center justify-center transition-colors"
              >
                ‹
              </button>
              <span className="text-[11px] font-mono text-zinc-400 px-1">
                {currentPage} / {pages.length}
              </span>
              <button
                disabled={currentPage >= pages.length}
                onClick={() => {
                  setSelectedId(null)
                  setCurrentPage((p) => Math.min(pages.length, p + 1))
                }}
                className="w-6 h-6 rounded-lg hover:bg-white/10 disabled:opacity-20 text-xs text-zinc-300 flex items-center justify-center transition-colors"
              >
                ›
              </button>
            </div>
          </div>
        </div>

        {/* Secondary Toolbar: Text & Color Controls (shown when tool === 'text' or text is selected) */}
        {(tool === 'text' || (selectedId && annotations.find((a) => a.id === selectedId)?.type === 'text')) && (
          <div className="flex items-center gap-3 p-2.5 bg-white/[0.03] border border-white/[0.08] rounded-2xl mb-3 shadow-sm">
            <span className="text-[11px] font-semibold text-zinc-400">Text:</span>
            <input
              type="text"
              placeholder="Type custom text…"
              value={textInput}
              onChange={(e) => handleTextInputChange(e.target.value)}
              className="flex-1 px-3 py-1.5 rounded-xl bg-black/40 border border-white/[0.1] text-xs text-white focus:outline-none focus:border-indigo-500 tracking-wide font-sans"
            />

            {/* Font Size Pills */}
            <div className="flex items-center gap-1">
              <span className="text-[11px] text-zinc-400">Size:</span>
              {[12, 16, 20, 26, 34].map((s) => (
                <button
                  key={s}
                  onClick={() => handleFontSizeChange(s)}
                  className={`w-6 h-6 rounded-lg text-[10px] font-mono transition-all ${
                    fontSize === s
                      ? 'bg-indigo-600 text-white font-bold shadow'
                      : 'bg-white/[0.06] text-zinc-400 hover:text-white'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>

            {/* Interactive Color Palette + Native Color Picker */}
            <div className="flex items-center gap-1.5 pl-2 border-l border-white/[0.08]">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => handleColorChange(c)}
                  style={{ backgroundColor: c }}
                  className={`w-5 h-5 rounded-full border transition-transform ${
                    textColor.toLowerCase() === c.toLowerCase()
                      ? 'border-white scale-125 shadow-md'
                      : 'border-white/20 hover:scale-110'
                  }`}
                />
              ))}
              {/* Native color picker */}
              <label className="relative w-6 h-6 rounded-full overflow-hidden border border-white/40 cursor-pointer shadow-sm hover:scale-110 transition-transform">
                <input
                  type="color"
                  value={textColor}
                  onChange={(e) => handleColorChange(e.target.value)}
                  className="opacity-0 absolute inset-0 cursor-pointer w-full h-full"
                />
                <span
                  style={{ backgroundColor: textColor }}
                  className="block w-full h-full"
                  title="Choose custom color"
                />
              </label>
            </div>
          </div>
        )}

        {/* Scrollable Viewport with Zoom */}
        <div className="w-full flex justify-center bg-black/60 rounded-2xl p-4 border border-white/[0.08] overflow-auto max-h-[380px] shadow-inner">
          <div
            ref={containerRef}
            onMouseDown={handlePageMouseDown}
            onMouseMove={handlePageMouseMove}
            onMouseUp={handlePageMouseUp}
            style={{
              transform: `scale(${zoom})`,
              transformOrigin: 'top center',
              transition: interactionMode === 'none' ? 'transform 0.15s ease-out' : 'none'
            }}
            className={`relative max-h-[340px] aspect-[1/1.4] bg-white rounded-md shadow-2xl overflow-hidden select-none ${
              tool === 'select' ? 'cursor-default' : 'cursor-crosshair'
            }`}
          >
            <img
              src={activePageDetail.dataUrl}
              alt="Page render"
              className="w-full h-full object-contain pointer-events-none"
            />

            {/* Saved Annotations */}
            {containerRef.current &&
              pageAnnotations.map((ann) => {
                const rect = containerRef.current!.getBoundingClientRect()
                const containerW = rect.width / zoom
                const containerH = rect.height / zoom
                const scaleX = containerW / activePageDetail.width
                const scaleY = containerH / activePageDetail.height

                const left = ann.x * scaleX
                const top = ann.y * scaleY
                const width = (ann.width || 0) * scaleX
                const height = (ann.height || 0) * scaleY
                const isSelected = selectedId === ann.id

                if (ann.type === 'text') {
                  return (
                    <div
                      key={ann.id}
                      onClick={(e) => {
                        e.stopPropagation()
                        setSelectedId(ann.id)
                      }}
                      onMouseDown={(e) => startMove(e, ann)}
                      style={{
                        left,
                        top,
                        fontSize: (ann.fontSize || 16) * scaleY,
                        color: ann.color || '#000000'
                      }}
                      className={`absolute font-bold whitespace-nowrap leading-none cursor-move p-0.5 rounded transition-all select-none ${
                        isSelected
                          ? 'ring-2 ring-indigo-500 bg-indigo-500/10 shadow-lg'
                          : 'hover:ring-1 hover:ring-indigo-400/50'
                      }`}
                    >
                      <span>{ann.text}</span>
                      {isSelected && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            setAnnotations((prev) => prev.filter((a) => a.id !== ann.id))
                            setSelectedId(null)
                          }}
                          className="absolute -top-3 -right-3 w-4 h-4 rounded-full bg-red-600 text-white text-[9px] flex items-center justify-center shadow hover:bg-red-500 transition-colors cursor-pointer"
                        >
                          ×
                        </button>
                      )}
                    </div>
                  )
                }

                // Rectangle annotations: whiteout, redact, highlight
                return (
                  <div
                    key={ann.id}
                    onClick={(e) => {
                      e.stopPropagation()
                      setSelectedId(ann.id)
                    }}
                    onMouseDown={(e) => startMove(e, ann)}
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
                    className={`absolute cursor-move transition-all ${
                      isSelected
                        ? 'ring-2 ring-indigo-500 shadow-xl'
                        : 'border border-transparent hover:border-indigo-400/50'
                    }`}
                  >
                    {/* Delete badge */}
                    {isSelected && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setAnnotations((prev) => prev.filter((a) => a.id !== ann.id))
                          setSelectedId(null)
                        }}
                        className="absolute -top-2.5 -right-2.5 w-5 h-5 rounded-full bg-red-600 text-white text-[10px] flex items-center justify-center shadow-lg hover:bg-red-500 transition-colors cursor-pointer"
                      >
                        ×
                      </button>
                    )}

                    {/* Corner Resize Handle */}
                    {isSelected && (
                      <div
                        onMouseDown={(e) => startResize(e, ann)}
                        className="absolute -bottom-1.5 -right-1.5 w-3.5 h-3.5 rounded-full bg-indigo-500 border border-white cursor-se-resize shadow-md"
                      />
                    )}
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
                className="absolute border-2 border-indigo-500 pointer-events-none"
              />
            )}
          </div>
        </div>
      </div>

      {/* Upgraded Modern Footer Action Bar */}
      <div className="pt-4 border-t border-white/[0.08] flex items-center justify-between mt-3">
        <button
          onClick={handleCancel}
          className="px-5 py-2.5 rounded-xl text-xs font-semibold text-zinc-300 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] transition-all cursor-pointer active:scale-95 shadow-sm"
        >
          Cancel
        </button>

        <button
          onClick={handleSave}
          disabled={annotations.length === 0 || isSubmitting}
          className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold text-white transition-all shadow-lg active:scale-95 ${
            annotations.length > 0 && !isSubmitting
              ? 'bg-gradient-to-r from-indigo-600 via-indigo-500 to-indigo-600 hover:from-indigo-500 hover:to-indigo-500 shadow-indigo-600/30 cursor-pointer'
              : 'bg-zinc-800 text-zinc-500 cursor-not-allowed shadow-none'
          }`}
        >
          {isSubmitting ? (
            'Saving PDF…'
          ) : (
            `Apply & Save (${annotations.length} edit${annotations.length === 1 ? '' : 's'})`
          )}
        </button>
      </div>
    </div>
  )
}
