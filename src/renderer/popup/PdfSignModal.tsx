import React, { useState, useEffect, useRef } from 'react'
import { loadAndRenderPdf, type RenderedPage as PageDetail } from './pdf-renderer'

interface PdfSignModalProps {
  filePath: string
}

const SIGNATURE_FONTS = [
  { name: 'Brush Script', style: "'Brush Script MT', cursive" },
  { name: 'Cursive Elegant', style: "'Lucida Handwriting', cursive" },
  { name: 'Formal Script', style: "cursive" },
  { name: 'Signature Hand', style: "'Segoe Script', cursive" }
]

// Auto-crops an HTML5 canvas to the tight bounding box of visible pixels
function cropCanvasToContent(canvas: HTMLCanvasElement): string {
  const ctx = canvas.getContext('2d')
  if (!ctx) return canvas.toDataURL('image/png')
  const { width, height } = canvas
  const imgData = ctx.getImageData(0, 0, width, height)
  const data = imgData.data

  let minX = width, minY = height, maxX = 0, maxY = 0
  let found = false

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const alpha = data[(y * width + x) * 4 + 3]
      if (alpha > 10) {
        if (x < minX) minX = x
        if (x > maxX) maxX = x
        if (y < minY) minY = y
        if (y > maxY) maxY = y
        found = true
      }
    }
  }

  if (!found) return canvas.toDataURL('image/png')

  const pad = 6
  const cropX = Math.max(0, minX - pad)
  const cropY = Math.max(0, minY - pad)
  const cropW = Math.min(width - cropX, maxX - minX + pad * 2)
  const cropH = Math.min(height - cropY, maxY - minY + pad * 2)

  const croppedCanvas = document.createElement('canvas')
  croppedCanvas.width = cropW
  croppedCanvas.height = cropH
  const croppedCtx = croppedCanvas.getContext('2d')
  if (!croppedCtx) return canvas.toDataURL('image/png')

  croppedCtx.drawImage(canvas, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH)
  return croppedCanvas.toDataURL('image/png')
}

export default function PdfSignModal({ filePath }: PdfSignModalProps): React.ReactElement {
  const [loading, setLoading] = useState(true)
  const [pages, setPages] = useState<PageDetail[]>([])
  const [currentPage, setCurrentPage] = useState(1)

  // Creation mode: 'draw' | 'type'
  const [tab, setTab] = useState<'draw' | 'type'>('draw')
  const [typedName, setTypedName] = useState('')
  const [selectedFont, setSelectedFont] = useState(SIGNATURE_FONTS[0].style)
  const [sigColor, setSigColor] = useState('#0f172a') // Dark ink

  // Placed signature state
  const [signatureDataUrl, setSignatureDataUrl] = useState<string | null>(null)
  const [placedPos, setPlacedPos] = useState<{ x: number; y: number; width: number; height: number } | null>(null)
  const [aspectRatio, setAspectRatio] = useState<number>(2.5)

  // Dragging / Resizing placed signature
  const [interaction, setInteraction] = useState<'none' | 'move' | 'resize'>('none')
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 })
  const [resizeStart, setResizeStart] = useState<{ startX: number; origW: number; origH: number } | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Drawing canvas ref
  const drawCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [hasDrawn, setHasDrawn] = useState(false)

  const pageContainerRef = useRef<HTMLDivElement | null>(null)

  // Reset when filePath changes
  useEffect(() => {
    let isMounted = true
    setSignatureDataUrl(null)
    setPlacedPos(null)
    setHasDrawn(false)
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

  // Exact coordinates matching pointer center
  const getCanvasPos = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = drawCanvasRef.current
    if (!canvas) return { x: 0, y: 0 }
    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY
    }
  }

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = drawCanvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const pos = getCanvasPos(e)
    ctx.beginPath()
    ctx.moveTo(pos.x, pos.y)
    setIsDrawing(true)
  }

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return
    const canvas = drawCanvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const pos = getCanvasPos(e)
    ctx.lineTo(pos.x, pos.y)
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

  // Generate tight cropped signature data URL
  const generateSignatureImage = () => {
    if (tab === 'draw') {
      const canvas = drawCanvasRef.current
      if (!canvas || !hasDrawn) return
      const croppedUrl = cropCanvasToContent(canvas)
      setSignatureDataUrl(croppedUrl)

      // Calculate natural aspect ratio
      const img = new Image()
      img.onload = () => {
        setAspectRatio(img.width / img.height)
      }
      img.src = croppedUrl
    } else {
      if (!typedName.trim()) return
      const canvas = document.createElement('canvas')
      canvas.width = 600
      canvas.height = 160
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      ctx.fillStyle = sigColor
      ctx.font = `54px ${selectedFont}`
      ctx.textBaseline = 'middle'
      ctx.fillText(typedName.trim(), 20, 80)

      const croppedUrl = cropCanvasToContent(canvas)
      setSignatureDataUrl(croppedUrl)

      const img = new Image()
      img.onload = () => {
        setAspectRatio(img.width / img.height)
      }
      img.src = croppedUrl
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

    // Snug bounding box based on natural aspect ratio
    const sigW = 130
    const sigH = Math.round(sigW / (aspectRatio || 2.5))

    setPlacedPos({
      x: Math.max(0, Math.min(clickX - sigW / 2, rect.width - sigW)),
      y: Math.max(0, Math.min(clickY - sigH / 2, rect.height - sigH)),
      width: sigW,
      height: Math.max(30, sigH)
    })
  }

  // Start moving placed signature
  const handleMoveStart = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!placedPos) return
    setInteraction('move')
    setDragOffset({
      x: e.clientX - placedPos.x,
      y: e.clientY - placedPos.y
    })
  }

  // Start resizing placed signature
  const handleResizeStart = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!placedPos) return
    setInteraction('resize')
    setResizeStart({
      startX: e.clientX,
      origW: placedPos.width,
      origH: placedPos.height
    })
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (interaction === 'move' && placedPos && pageContainerRef.current) {
      const rect = pageContainerRef.current.getBoundingClientRect()
      const newX = Math.max(0, Math.min(e.clientX - dragOffset.x, rect.width - placedPos.width))
      const newY = Math.max(0, Math.min(e.clientY - dragOffset.y, rect.height - placedPos.height))
      setPlacedPos((prev) => (prev ? { ...prev, x: newX, y: newY } : null))
    } else if (interaction === 'resize' && placedPos && resizeStart) {
      const dx = e.clientX - resizeStart.startX
      const newW = Math.max(50, Math.min(320, resizeStart.origW + dx))
      const newH = Math.round(newW / (aspectRatio || 2.5))
      setPlacedPos((prev) => (prev ? { ...prev, width: newW, height: newH } : null))
    }
  }

  const handleMouseUp = () => {
    setInteraction('none')
    setResizeStart(null)
  }

  const handleApply = async () => {
    if (!signatureDataUrl || !placedPos || isSubmitting) return
    const activePageDetail = pages[currentPage - 1]
    const container = pageContainerRef.current
    if (!activePageDetail || !container) return

    setIsSubmitting(true)
    const containerRect = container.getBoundingClientRect()

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
    setPlacedPos(null)
    setSignatureDataUrl(null)
    ;(window as any).popupAPI?.cancel()
  }

  const activePage = pages[currentPage - 1]

  if (loading || !activePage) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-3 min-h-[400px]">
        <div className="w-8 h-8 rounded-full border-2 border-indigo-500/20 border-t-indigo-500 animate-spin" />
        <span className="text-xs text-zinc-400 font-medium tracking-wide">
          Loading document pages…
        </span>
      </div>
    )
  }

  return (
    <div
      className="flex-1 flex flex-col justify-between select-none h-full min-h-[500px]"
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
    >
      <div className="flex gap-5 flex-1">
        {/* Left: Document Page Preview */}
        <div className="flex-[1.25] flex flex-col items-center justify-between bg-black/50 rounded-2xl p-4 border border-white/[0.08] shadow-inner">
          {/* Page Switcher Header */}
          <div className="w-full flex items-center justify-between pb-3 mb-2 border-b border-white/[0.06]">
            <span className="text-xs font-mono text-zinc-300 font-medium">
              Page {currentPage} of {pages.length}
            </span>
            <div className="flex items-center gap-1.5">
              <button
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="w-7 h-7 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] disabled:opacity-20 text-xs text-white flex items-center justify-center transition-colors"
              >
                ‹
              </button>
              <button
                disabled={currentPage >= pages.length}
                onClick={() => setCurrentPage((p) => Math.min(pages.length, p + 1))}
                className="w-7 h-7 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] disabled:opacity-20 text-xs text-white flex items-center justify-center transition-colors"
              >
                ›
              </button>
            </div>
          </div>

          {/* Rendered Page Viewport */}
          <div
            ref={pageContainerRef}
            onClick={handlePageClick}
            className={`relative max-h-[360px] aspect-[1/1.4] bg-white rounded-md shadow-2xl overflow-hidden ${
              signatureDataUrl && !placedPos ? 'cursor-crosshair ring-2 ring-indigo-500/50' : 'cursor-default'
            }`}
          >
            <img
              src={activePage.dataUrl}
              alt="PDF Page"
              className="w-full h-full object-contain pointer-events-none"
            />

            {/* Prompt tooltip banner */}
            {signatureDataUrl && !placedPos && (
              <div className="absolute inset-x-0 bottom-3 flex justify-center pointer-events-none">
                <span className="px-4 py-1.5 rounded-full bg-indigo-600/90 text-white text-[11px] font-semibold shadow-xl backdrop-blur-md animate-pulse">
                  Click on page to stamp signature
                </span>
              </div>
            )}

            {/* Placed signature box with move & resize */}
            {placedPos && signatureDataUrl && (
              <div
                onMouseDown={handleMoveStart}
                style={{
                  left: placedPos.x,
                  top: placedPos.y,
                  width: placedPos.width,
                  height: placedPos.height
                }}
                className="absolute border-2 border-indigo-500 rounded bg-indigo-500/10 cursor-move group select-none shadow-xl"
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
                  className="absolute -top-3 -right-3 w-5 h-5 rounded-full bg-red-600 text-white text-xs flex items-center justify-center shadow-lg hover:bg-red-500 transition-colors cursor-pointer"
                  title="Remove"
                >
                  ×
                </button>

                {/* Corner Resize Handle */}
                <div
                  onMouseDown={handleResizeStart}
                  className="absolute -bottom-1.5 -right-1.5 w-3.5 h-3.5 rounded-full bg-indigo-500 border border-white cursor-se-resize shadow-md"
                  title="Drag to resize"
                />
              </div>
            )}
          </div>
        </div>

        {/* Right: Signature Creation Controls */}
        <div className="flex-1 flex flex-col justify-between bg-white/[0.02] border border-white/[0.08] rounded-2xl p-4 shadow-sm">
          <div>
            {/* Draw / Type Tabs */}
            <div className="flex items-center gap-1.5 p-1 bg-black/40 rounded-xl mb-4 border border-white/[0.06]">
              <button
                onClick={() => setTab('draw')}
                className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  tab === 'draw'
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                Draw Signature
              </button>
              <button
                onClick={() => setTab('type')}
                className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  tab === 'type'
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                Type Name
              </button>
            </div>

            {/* Ink Color Picker */}
            <div className="flex items-center justify-between mb-4 px-1">
              <span className="text-xs text-zinc-400 font-semibold">Ink Color</span>
              <div className="flex items-center gap-2">
                {[
                  { color: '#0f172a', label: 'Dark Navy' },
                  { color: '#1e3a8a', label: 'Royal Blue' },
                  { color: '#000000', label: 'Black' }
                ].map((c) => (
                  <button
                    key={c.color}
                    onClick={() => setSigColor(c.color)}
                    style={{ backgroundColor: c.color }}
                    className={`w-5 h-5 rounded-full border-2 transition-transform cursor-pointer ${
                      sigColor === c.color
                        ? 'border-white scale-125 shadow-md'
                        : 'border-transparent opacity-60 hover:opacity-100'
                    }`}
                  />
                ))}
              </div>
            </div>

            {tab === 'draw' ? (
              <div>
                <div className="flex items-center justify-between mb-1.5 px-1">
                  <span className="text-xs text-zinc-400 font-medium">Draw inside the box</span>
                  <button
                    onClick={clearCanvas}
                    className="text-xs text-zinc-400 hover:text-red-400 transition-colors cursor-pointer"
                  >
                    Clear
                  </button>
                </div>

                <div className="w-full h-32 bg-white rounded-xl overflow-hidden border border-white/[0.1] shadow-inner relative">
                  <canvas
                    ref={drawCanvasRef}
                    width={360}
                    height={128}
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
                <div className="mb-3">
                  <label className="text-xs text-zinc-400 font-medium block mb-1.5">
                    Your Full Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. John Doe"
                    value={typedName}
                    onChange={(e) => setTypedName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/[0.1] text-xs text-white focus:outline-none focus:border-indigo-500 font-sans"
                  />
                </div>

                <div className="space-y-2">
                  <span className="text-[11px] text-zinc-400 font-semibold block">
                    Choose Script Style
                  </span>
                  {SIGNATURE_FONTS.map((f) => (
                    <div
                      key={f.name}
                      onClick={() => setSelectedFont(f.style)}
                      className={`p-2.5 rounded-xl cursor-pointer border transition-all flex items-center justify-between ${
                        selectedFont === f.style
                          ? 'border-indigo-500 bg-indigo-500/10'
                          : 'border-white/[0.06] bg-black/20 hover:border-white/[0.15]'
                      }`}
                    >
                      <span
                        style={{ fontFamily: f.style }}
                        className="text-xl text-white tracking-wide"
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
              <span className="text-xs text-emerald-400 font-semibold flex items-center justify-center gap-1.5">
                ✓ Signature placed on page {currentPage} (Drag center to move, drag corner to resize)
              </span>
            ) : signatureDataUrl ? (
              <span className="text-xs text-indigo-400 font-semibold animate-pulse">
                Click on the document page to place your signature
              </span>
            ) : (
              <span className="text-xs text-zinc-500">
                {tab === 'draw' ? 'Draw your signature above' : 'Type name above to preview'}
              </span>
            )}
          </div>
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
          onClick={handleApply}
          disabled={!placedPos || isSubmitting}
          className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold text-white transition-all shadow-lg active:scale-95 ${
            placedPos && !isSubmitting
              ? 'bg-gradient-to-r from-indigo-600 via-indigo-500 to-indigo-600 hover:from-indigo-500 hover:to-indigo-500 shadow-indigo-600/30 cursor-pointer'
              : 'bg-zinc-800 text-zinc-500 cursor-not-allowed shadow-none'
          }`}
        >
          {isSubmitting ? 'Signing PDF…' : 'Apply Signature'}
        </button>
      </div>
    </div>
  )
}
