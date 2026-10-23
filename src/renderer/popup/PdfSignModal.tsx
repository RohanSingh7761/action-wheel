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

interface PlacedSignature {
  pdfX: number
  pdfY: number
  pdfW: number
  pdfH: number
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

  // Placed signature state (stored in PDF page coordinates so zooming never shifts position)
  const [signatureDataUrl, setSignatureDataUrl] = useState<string | null>(null)
  const [placedPos, setPlacedPos] = useState<PlacedSignature | null>(null)
  const [isSelected, setIsSelected] = useState<boolean>(true)
  const [aspectRatio, setAspectRatio] = useState<number>(2.5)
  const [zoom, setZoom] = useState<number>(1.0)

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
  const viewportRef = useRef<HTMLDivElement | null>(null)

  // Reset when filePath changes
  useEffect(() => {
    let isMounted = true
    setSignatureDataUrl(null)
    setPlacedPos(null)
    setIsSelected(true)
    setZoom(1.0)
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

  // Touchpad pinch-to-zoom (wheel events with ctrlKey)
  useEffect(() => {
    const el = viewportRef.current
    if (!el) return

    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey) {
        e.preventDefault()
        const zoomDelta = e.deltaY < 0 ? 0.08 : -0.08
        setZoom((prev) => Math.min(3.0, Math.max(0.5, Number((prev + zoomDelta).toFixed(2)))))
      }
    }

    el.addEventListener('wheel', handleWheel, { passive: false })
    return () => {
      el.removeEventListener('wheel', handleWheel)
    }
  }, [loading])

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

  // Click on PDF Page to place signature or deselect if already placed
  const handlePageClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!signatureDataUrl || isSubmitting || !activePage) return

    // If signature is already placed, clicking anywhere else on page deselects it!
    if (placedPos) {
      setIsSelected(false)
      return
    }

    const container = pageContainerRef.current
    if (!container) return
    const rect = container.getBoundingClientRect()

    const clickX = e.clientX - rect.left
    const clickY = e.clientY - rect.top

    // Snug bounding box in screen pixels
    const sigScreenW = Math.round(Math.min(180, Math.max(90, rect.width * 0.35)))
    const sigScreenH = Math.round(sigScreenW / (aspectRatio || 2.5))

    const screenX = Math.max(0, Math.min(clickX - sigScreenW / 2, rect.width - sigScreenW))
    const screenY = Math.max(0, Math.min(clickY - sigScreenH / 2, rect.height - sigScreenH))

    const scaleX = activePage.width / rect.width
    const scaleY = activePage.height / rect.height

    // Stored in absolute PDF points so it stays locked to document across any zoom level
    setPlacedPos({
      pdfX: Math.round(screenX * scaleX),
      pdfY: Math.round(screenY * scaleY),
      pdfW: Math.round(sigScreenW * scaleX),
      pdfH: Math.round(sigScreenH * scaleY)
    })
    setIsSelected(true)
  }

  // Start moving placed signature
  const handleMoveStart = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!placedPos || !pageContainerRef.current || !activePage) return
    setIsSelected(true)
    setInteraction('move')
    const rect = pageContainerRef.current.getBoundingClientRect()
    const scaleX = activePage.width / rect.width
    const scaleY = activePage.height / rect.height
    const mousePdfX = (e.clientX - rect.left) * scaleX
    const mousePdfY = (e.clientY - rect.top) * scaleY

    setDragOffset({
      x: mousePdfX - placedPos.pdfX,
      y: mousePdfY - placedPos.pdfY
    })
  }

  // Start resizing placed signature
  const handleResizeStart = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!placedPos) return
    setIsSelected(true)
    setInteraction('resize')
    setResizeStart({
      startX: e.clientX,
      origW: placedPos.pdfW,
      origH: placedPos.pdfH
    })
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (interaction === 'move' && placedPos && pageContainerRef.current && activePage) {
      const rect = pageContainerRef.current.getBoundingClientRect()
      const scaleX = activePage.width / rect.width
      const scaleY = activePage.height / rect.height
      const currentPdfX = (e.clientX - rect.left) * scaleX
      const currentPdfY = (e.clientY - rect.top) * scaleY

      const newPdfX = Math.max(0, Math.min(currentPdfX - dragOffset.x, activePage.width - placedPos.pdfW))
      const newPdfY = Math.max(0, Math.min(currentPdfY - dragOffset.y, activePage.height - placedPos.pdfH))
      setPlacedPos((prev) => (prev ? { ...prev, pdfX: newPdfX, pdfY: newPdfY } : null))
    } else if (interaction === 'resize' && placedPos && resizeStart && pageContainerRef.current && activePage) {
      const rect = pageContainerRef.current.getBoundingClientRect()
      const scaleX = activePage.width / rect.width
      const dxPdf = (e.clientX - resizeStart.startX) * scaleX
      const minPdfW = activePage.width * 0.1
      const maxPdfW = activePage.width * 0.8
      const newPdfW = Math.max(minPdfW, Math.min(maxPdfW, resizeStart.origW + dxPdf))
      const newPdfH = Math.round(newPdfW / (aspectRatio || 2.5))
      setPlacedPos((prev) => (prev ? { ...prev, pdfW: newPdfW, pdfH: newPdfH } : null))
    }
  }

  const handleMouseUp = () => {
    setInteraction('none')
    setResizeStart(null)
  }

  const handleApply = async () => {
    if (!signatureDataUrl || !placedPos || isSubmitting) return
    setIsSubmitting(true)

    const api = (window as any).popupAPI
    if (api?.confirm) {
      await api.confirm({
        params: {
          signatureDataUrl,
          page: currentPage,
          x: placedPos.pdfX,
          y: placedPos.pdfY,
          width: placedPos.pdfW,
          height: placedPos.pdfH
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
      <div className="flex gap-5 flex-1 min-h-0 overflow-hidden">
        {/* Left: Document Page Preview (rigidly locked width so zooming never squishes right-side controls) */}
        <div className="w-[52%] max-w-[52%] min-w-0 shrink-0 flex flex-col items-center justify-between bg-black/50 rounded-2xl p-4 border border-white/[0.08] shadow-inner overflow-hidden">
          {/* Page Switcher Header & Zoom Controls */}
          <div className="w-full flex items-center justify-between pb-3 mb-2 border-b border-white/[0.06]">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-zinc-300 font-medium">
                Page {currentPage} of {pages.length}
              </span>
              <div className="flex items-center gap-1">
                <button
                  disabled={currentPage <= 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className="w-6 h-6 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] disabled:opacity-20 text-xs text-white flex items-center justify-center transition-colors"
                >
                  ‹
                </button>
                <button
                  disabled={currentPage >= pages.length}
                  onClick={() => setCurrentPage((p) => Math.min(pages.length, p + 1))}
                  className="w-6 h-6 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] disabled:opacity-20 text-xs text-white flex items-center justify-center transition-colors"
                >
                  ›
                </button>
              </div>
            </div>

            {/* Zoom Controls */}
            <div className="flex items-center gap-1 bg-white/[0.04] p-1 rounded-xl border border-white/[0.06]">
              <button
                onClick={() => setZoom((z) => Math.max(0.5, Math.round((z - 0.25) * 100) / 100))}
                className="w-5 h-5 rounded-md hover:bg-white/10 text-xs text-zinc-300 font-bold flex items-center justify-center transition-colors"
                title="Zoom Out"
              >
                -
              </button>
              <button
                onClick={() => setZoom(1.0)}
                className="px-1.5 py-0.5 text-[10px] font-mono text-zinc-300 hover:text-white transition-colors"
                title="Reset Zoom"
              >
                {Math.round(zoom * 100)}%
              </button>
              <button
                onClick={() => setZoom((z) => Math.min(2.5, Math.round((z + 0.25) * 100) / 100))}
                className="w-5 h-5 rounded-md hover:bg-white/10 text-xs text-zinc-300 font-bold flex items-center justify-center transition-colors"
                title="Zoom In"
              >
                +
              </button>
            </div>
          </div>

          {/* Rendered Page Viewport with Zoom and Touchpad Pinch */}
          <div
            ref={viewportRef}
            className="w-full flex-1 flex justify-center items-start overflow-auto max-h-[380px] rounded-xl"
          >
            {(() => {
              const baseHeight = 350
              const pageAspect = (activePage.width || 1) / (activePage.height || 1.414)
              const baseWidth = Math.round(baseHeight * pageAspect)
              const displayWidth = Math.round(baseWidth * zoom)
              const displayHeight = Math.round(baseHeight * zoom)

              const scaleX = displayWidth / activePage.width
              const scaleY = displayHeight / activePage.height

              return (
                <div
                  ref={pageContainerRef}
                  onClick={handlePageClick}
                  style={{
                    width: `${displayWidth}px`,
                    height: `${displayHeight}px`
                  }}
                  className={`relative bg-white rounded-md shadow-2xl overflow-hidden select-none flex-shrink-0 ${
                    signatureDataUrl && !placedPos ? 'cursor-crosshair ring-2 ring-indigo-500/50' : 'cursor-default'
                  }`}
                >
                  <img
                    src={activePage.dataUrl}
                    alt="PDF Page"
                    className="w-full h-full block pointer-events-none select-none"
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
                      onClick={(e) => {
                        e.stopPropagation()
                        setIsSelected(true)
                      }}
                      onMouseDown={handleMoveStart}
                      style={{
                        left: placedPos.pdfX * scaleX,
                        top: placedPos.pdfY * scaleY,
                        width: placedPos.pdfW * scaleX,
                        height: placedPos.pdfH * scaleY
                      }}
                      className={`absolute rounded cursor-move group select-none transition-all ${
                        isSelected
                          ? 'border-2 border-indigo-500 bg-indigo-500/10 shadow-xl'
                          : 'border border-transparent hover:border-indigo-400/40'
                      }`}
                    >
                      <img
                        src={signatureDataUrl}
                        alt="Signature Stamp"
                        className="w-full h-full object-contain pointer-events-none select-none"
                      />

                      {/* Remove button (only when selected) */}
                      {isSelected && (
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
                      )}

                      {/* Corner Resize Handle (only when selected) */}
                      {isSelected && (
                        <div
                          onMouseDown={handleResizeStart}
                          className="absolute -bottom-1.5 -right-1.5 w-3.5 h-3.5 rounded-full bg-indigo-500 border border-white cursor-se-resize shadow-md"
                          title="Drag to resize"
                        />
                      )}
                    </div>
                  )}
                </div>
              )
            })()}
          </div>
        </div>

        {/* Right: Signature Creation Controls */}
        <div className="flex-1 min-w-0 flex flex-col justify-between bg-white/[0.02] border border-white/[0.08] rounded-2xl p-4 shadow-sm overflow-hidden">
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
