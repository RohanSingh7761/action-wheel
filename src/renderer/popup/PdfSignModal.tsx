import React, { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'

interface PdfSignModalProps {
  filePath: string
}

interface PageDetail {
  pageNumber: number
  width: number
  height: number
  dataUrl: string
}

const SIGNATURE_FONTS = [
  { name: 'Brush Script', style: "'Brush Script MT', cursive" },
  { name: 'Cursive Elegant', style: "'Lucida Handwriting', cursive" },
  { name: 'Formal Script', style: "cursive" },
  { name: 'Signature Hand', style: "'Segoe Script', cursive" }
]

export default function PdfSignModal({ filePath }: PdfSignModalProps): React.ReactElement {
  const [loading, setLoading] = useState(true)
  const [pages, setPages] = useState<PageDetail[]>([])
  const [currentPage, setCurrentPage] = useState(1)

  // Creation mode: 'draw' | 'type'
  const [tab, setTab] = useState<'draw' | 'type'>('draw')
  const [typedName, setTypedName] = useState('')
  const [selectedFont, setSelectedFont] = useState(SIGNATURE_FONTS[0].style)
  const [sigColor, setSigColor] = useState('#1e293b') // Elegant dark navy/black ink

  // Placed signature state
  const [signatureDataUrl, setSignatureDataUrl] = useState<string | null>(null)
  const [placedPos, setPlacedPos] = useState<{ x: number; y: number; width: number; height: number } | null>(null)
  const [isDraggingPlaced, setIsDraggingPlaced] = useState(false)
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 })
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Drawing canvas ref
  const drawCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [hasDrawn, setHasDrawn] = useState(false)

  // Document page container ref
  const pageContainerRef = useRef<HTMLDivElement | null>(null)

  // Load PDF pages
  useEffect(() => {
    let isMounted = true
    const loadDetails = async () => {
      try {
        const api = (window as any).popupAPI
        if (!api?.loadPdfDetails) return
        const result = await api.loadPdfDetails(filePath)
        if (result && isMounted && result.pages?.length > 0) {
          setPages(result.pages)
          setCurrentPage(1)
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

  // Setup drawing canvas
  useEffect(() => {
    if (tab !== 'draw') return
    const canvas = drawCanvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.lineWidth = 2.5
    ctx.strokeStyle = sigColor
  }, [tab, sigColor])

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = drawCanvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const rect = canvas.getBoundingClientRect()
    ctx.beginPath()
    ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top)
    setIsDrawing(true)
  }

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return
    const canvas = drawCanvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const rect = canvas.getBoundingClientRect()
    ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top)
    ctx.stroke()
    setHasDrawn(true)
  }

  const stopDrawing = () => {
    if (isDrawing) {
      setIsDrawing(false)
      generateSignatureImage()
    }
  }

  const clearCanvas = () => {
    const canvas = drawCanvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    setHasDrawn(false)
    setSignatureDataUrl(null)
    setPlacedPos(null)
  }

  // Generate data URL for signature
  const generateSignatureImage = () => {
    if (tab === 'draw') {
      const canvas = drawCanvasRef.current
      if (!canvas || !hasDrawn) return
      setSignatureDataUrl(canvas.toDataURL('image/png'))
    } else {
      if (!typedName.trim()) return
      const canvas = document.createElement('canvas')
      canvas.width = 400
      canvas.height = 120
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.fillStyle = sigColor
      ctx.font = `44px ${selectedFont}`
      ctx.textBaseline = 'middle'
      ctx.fillText(typedName.trim(), 20, 60)
      setSignatureDataUrl(canvas.toDataURL('image/png'))
    }
  }

  useEffect(() => {
    if (tab === 'type') {
      generateSignatureImage()
    }
  }, [tab, typedName, selectedFont, sigColor])

  // Click on PDF Page to place signature
  const handlePageClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!signatureDataUrl || placedPos) return
    const container = pageContainerRef.current
    if (!container) return
    const rect = container.getBoundingClientRect()

    const clickX = e.clientX - rect.left
    const clickY = e.clientY - rect.top

    // Signature default box size
    const sigW = 140
    const sigH = 50

    setPlacedPos({
      x: Math.max(0, Math.min(clickX - sigW / 2, rect.width - sigW)),
      y: Math.max(0, Math.min(clickY - sigH / 2, rect.height - sigH)),
      width: sigW,
      height: sigH
    })
  }

  // Dragging placed signature
  const handlePlacedMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!placedPos) return
    setIsDraggingPlaced(true)
    setDragOffset({
      x: e.clientX - placedPos.x,
      y: e.clientY - placedPos.y
    })
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDraggingPlaced || !placedPos || !pageContainerRef.current) return
    const rect = pageContainerRef.current.getBoundingClientRect()
    const newX = Math.max(0, Math.min(e.clientX - dragOffset.x, rect.width - placedPos.width))
    const newY = Math.max(0, Math.min(e.clientY - dragOffset.y, rect.height - placedPos.height))
    setPlacedPos((prev) => (prev ? { ...prev, x: newX, y: newY } : null))
  }

  const handleMouseUp = () => {
    setIsDraggingPlaced(false)
  }

  const handleApply = async () => {
    if (!signatureDataUrl || !placedPos || isSubmitting) return
    const activePageDetail = pages[currentPage - 1]
    const container = pageContainerRef.current
    if (!activePageDetail || !container) return

    setIsSubmitting(true)
    const containerRect = container.getBoundingClientRect()

    // Scale from displayed container dimensions to real PDF points
    const scaleX = activePageDetail.width / containerRect.width
    const scaleY = activePageDetail.height / containerRect.height

    const realX = placedPos.x * scaleX
    const realY = placedPos.y * scaleY
    const realW = placedPos.width * scaleX
    const realH = placedPos.height * scaleY

    const api = (window as any).popupAPI
    if (api?.confirm) {
      await api.confirm({
        params: {
          signatureDataUrl,
          page: currentPage,
          x: realX,
          y: realY,
          width: realW,
          height: realH
        }
      })
    }
  }

  const handleCancel = () => {
    ;(window as any).popupAPI?.cancel()
  }

  const activePage = pages[currentPage - 1]

  if (loading || !activePage) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-3">
        <div className="w-7 h-7 rounded-full border-2 border-indigo-500/20 border-t-indigo-500 animate-spin" />
        <span className="text-xs text-zinc-400 font-medium tracking-wide">
          Loading document pages…
        </span>
      </div>
    )
  }

  return (
    <div
      className="flex-1 flex flex-col justify-between select-none h-full min-h-[460px]"
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
    >
      <div className="flex gap-4 flex-1">
        {/* Left: Interactive Page Preview */}
        <div className="flex-[1.2] flex flex-col items-center justify-between bg-black/40 rounded-xl p-3 border border-white/[0.08]">
          {/* Page Switcher */}
          <div className="w-full flex items-center justify-between pb-2 mb-2 border-b border-white/[0.06]">
            <span className="text-[11px] font-mono text-zinc-300">
              Page {currentPage} of {pages.length}
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

          {/* Rendered Document Page Container */}
          <div
            ref={pageContainerRef}
            onClick={handlePageClick}
            className={`relative max-h-[340px] aspect-[1/1.4] bg-white rounded-md shadow-2xl overflow-hidden ${
              signatureDataUrl && !placedPos ? 'cursor-crosshair ring-2 ring-indigo-500/50' : 'cursor-default'
            }`}
          >
            <img
              src={activePage.dataUrl}
              alt="PDF Page"
              className="w-full h-full object-contain pointer-events-none"
            />

            {/* Click-to-place prompt banner */}
            {signatureDataUrl && !placedPos && (
              <div className="absolute inset-x-0 bottom-2 flex justify-center pointer-events-none">
                <span className="px-3 py-1 rounded-full bg-indigo-600/90 text-white text-[10px] font-medium shadow-lg backdrop-blur-sm animate-pulse">
                  Click on page to place signature
                </span>
              </div>
            )}

            {/* Placed signature box */}
            {placedPos && signatureDataUrl && (
              <div
                onMouseDown={handlePlacedMouseDown}
                style={{
                  left: placedPos.x,
                  top: placedPos.y,
                  width: placedPos.width,
                  height: placedPos.height
                }}
                className="absolute border-2 border-indigo-500 rounded bg-indigo-500/10 cursor-move group select-none shadow-md"
              >
                <img
                  src={signatureDataUrl}
                  alt="Signature Stamp"
                  className="w-full h-full object-contain pointer-events-none"
                />

                {/* Remove button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setPlacedPos(null)
                  }}
                  className="absolute -top-2.5 -right-2.5 w-5 h-5 rounded-full bg-red-600 text-white text-[10px] flex items-center justify-center shadow hover:bg-red-500 transition-colors cursor-pointer"
                >
                  ×
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right: Signature Creation Controls */}
        <div className="flex-1 flex flex-col justify-between bg-white/[0.02] border border-white/[0.06] rounded-xl p-3">
          <div>
            {/* Tabs */}
            <div className="flex items-center gap-1.5 p-1 bg-black/40 rounded-xl mb-3 border border-white/[0.05]">
              <button
                onClick={() => setTab('draw')}
                className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  tab === 'draw'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                Draw
              </button>
              <button
                onClick={() => setTab('type')}
                className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  tab === 'type'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                Type
              </button>
            </div>

            {/* Ink Color Picker */}
            <div className="flex items-center justify-between mb-3 px-1">
              <span className="text-[11px] text-zinc-400 font-medium">Ink Color</span>
              <div className="flex items-center gap-2">
                {[
                  { color: '#0f172a', label: 'Dark' },
                  { color: '#1e3a8a', label: 'Blue' },
                  { color: '#000000', label: 'Black' }
                ].map((c) => (
                  <button
                    key={c.color}
                    onClick={() => setSigColor(c.color)}
                    style={{ backgroundColor: c.color }}
                    className={`w-5 h-5 rounded-full border-2 transition-transform ${
                      sigColor === c.color
                        ? 'border-white scale-110 shadow-sm'
                        : 'border-transparent opacity-70 hover:opacity-100'
                    }`}
                  />
                ))}
              </div>
            </div>

            {tab === 'draw' ? (
              <div>
                <div className="flex items-center justify-between mb-1 px-1">
                  <span className="text-[11px] text-zinc-400 font-medium">
                    Draw with mouse / pen
                  </span>
                  <button
                    onClick={clearCanvas}
                    className="text-[10px] text-zinc-400 hover:text-red-400 transition-colors cursor-pointer"
                  >
                    Clear
                  </button>
                </div>

                <div className="w-full h-28 bg-white rounded-xl overflow-hidden border border-white/[0.1] shadow-inner">
                  <canvas
                    ref={drawCanvasRef}
                    width={320}
                    height={112}
                    className="w-full h-full cursor-crosshair"
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                  />
                </div>
              </div>
            ) : (
              <div>
                <div className="mb-2">
                  <label className="text-[11px] text-zinc-400 font-medium block mb-1">
                    Your Full Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. John Doe"
                    value={typedName}
                    onChange={(e) => setTypedName(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-xl bg-black/40 border border-white/[0.08] text-xs text-white focus:outline-none focus:border-indigo-500/80 font-sans"
                  />
                </div>

                <div className="space-y-1.5">
                  <span className="text-[11px] text-zinc-400 font-medium block">
                    Choose Script Style
                  </span>
                  {SIGNATURE_FONTS.map((f) => (
                    <div
                      key={f.name}
                      onClick={() => setSelectedFont(f.style)}
                      className={`p-2 rounded-xl cursor-pointer border transition-all flex items-center justify-between ${
                        selectedFont === f.style
                          ? 'border-indigo-500 bg-indigo-500/10'
                          : 'border-white/[0.06] bg-black/20 hover:border-white/[0.15]'
                      }`}
                    >
                      <span
                        style={{ fontFamily: f.style }}
                        className="text-lg text-white tracking-wide"
                      >
                        {typedName.trim() || 'Your Name'}
                      </span>
                      <span className="text-[10px] text-zinc-500">{f.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Stamp Helper Status */}
          <div className="mt-4 pt-3 border-t border-white/[0.06] text-center">
            {placedPos ? (
              <span className="text-[11px] text-emerald-400 font-medium flex items-center justify-center gap-1">
                ✓ Signature placed on page {currentPage}
              </span>
            ) : signatureDataUrl ? (
              <span className="text-[11px] text-indigo-400 font-medium animate-pulse">
                Click on the document page to place it
              </span>
            ) : (
              <span className="text-[11px] text-zinc-500">
                {tab === 'draw' ? 'Draw above to create signature' : 'Type name to preview'}
              </span>
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
          onClick={handleApply}
          disabled={!placedPos || isSubmitting}
          className={`px-5 py-2 rounded-xl text-xs font-semibold shadow-lg transition-all flex items-center gap-2 ${
            placedPos && !isSubmitting
              ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/30 cursor-pointer'
              : 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
          }`}
        >
          {isSubmitting ? 'Signing PDF…' : 'Apply Signature'}
        </button>
      </div>
    </div>
  )
}
