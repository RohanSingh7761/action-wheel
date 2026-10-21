import React, { useState, useEffect, useRef } from 'react'
import ReactCrop, { type Crop, type PixelCrop } from 'react-image-crop'
import 'react-image-crop/dist/ReactCrop.css'
import type { CropParams } from '../../shared/ipc-types'
import { ImageIcon, ArrowRightIcon } from '../shared/Icons'

const RATIO_PRESETS = [
  { label: 'Freeform', aspect: undefined },
  { label: '1:1 Square', aspect: 1 / 1 },
  { label: '16:9 Wide', aspect: 16 / 9 },
  { label: '4:3 Standard', aspect: 4 / 3 }
]

export default function CropEditor({ filePath }: { filePath: string }): React.ReactElement {
  const [previewData, setPreviewData] = useState<{ dataUrl: string; width: number; height: number } | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [activePreset, setActivePreset] = useState<string>('Freeform')
  const [aspect, setAspect] = useState<number | undefined>(undefined)

  const [crop, setCrop] = useState<Crop>()
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>()

  const imgRef = useRef<HTMLImageElement>(null)
  const fileName = filePath.split('\\').pop()?.split('/').pop() ?? 'image'

  // Load preview data from main process
  useEffect(() => {
    let isMounted = true
    const api = (window as any).popupAPI
    if (api?.loadImage) {
      setIsLoading(true)
      api.loadImage(filePath).then((data: { dataUrl: string; width: number; height: number } | null) => {
        if (!isMounted) return
        setPreviewData(data)
        setIsLoading(false)
      }).catch((err: any) => {
        console.error('Failed to load crop preview:', err)
        if (isMounted) setIsLoading(false)
      })
    }
    return () => {
      isMounted = false
    }
  }, [filePath])

  const onImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const { width, height } = e.currentTarget
    // Initial default crop: centered 80% box
    const initialWidth = Math.round(width * 0.8)
    const initialHeight = Math.round(height * 0.8)
    const initialX = Math.round((width - initialWidth) / 2)
    const initialY = Math.round((height - initialHeight) / 2)

    const initialCrop: PixelCrop = {
      unit: 'px',
      x: initialX,
      y: initialY,
      width: initialWidth,
      height: initialHeight
    }
    setCrop(initialCrop)
    setCompletedCrop(initialCrop)
  }

  const handlePreset = (label: string, newAspect: number | undefined) => {
    setActivePreset(label)
    setAspect(newAspect)

    if (imgRef.current && newAspect) {
      const { width, height } = imgRef.current
      let newW = width * 0.8
      let newH = newW / newAspect
      if (newH > height) {
        newH = height * 0.8
        newW = newH * newAspect
      }
      const newX = Math.round((width - newW) / 2)
      const newY = Math.round((height - newH) / 2)

      const updatedCrop: PixelCrop = {
        unit: 'px',
        x: newX,
        y: newY,
        width: Math.round(newW),
        height: Math.round(newH)
      }
      setCrop(updatedCrop)
      setCompletedCrop(updatedCrop)
    }
  }

  // Calculate coordinates in the original image's coordinate space
  const getScaledCoords = () => {
    if (!imgRef.current || !completedCrop || completedCrop.width <= 0) {
      return {
        left: 0,
        top: 0,
        width: previewData?.width ?? 800,
        height: previewData?.height ?? 600
      }
    }
    const image = imgRef.current
    const scaleX = (previewData?.width || image.naturalWidth) / image.width
    const scaleY = (previewData?.height || image.naturalHeight) / image.height

    return {
      left: Math.max(0, Math.round(completedCrop.x * scaleX)),
      top: Math.max(0, Math.round(completedCrop.y * scaleY)),
      width: Math.max(10, Math.round(completedCrop.width * scaleX)),
      height: Math.max(10, Math.round(completedCrop.height * scaleY))
    }
  }

  const scaled = getScaledCoords()

  const handleConfirm = () => {
    const params: CropParams = {
      left: scaled.left,
      top: scaled.top,
      width: scaled.width,
      height: scaled.height
    }
    ;(window as any).popupAPI?.confirm({ params })
  }

  return (
    <div className="flex flex-col h-full justify-between gap-3">
      {/* File summary bar */}
      <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-white/[0.03] border border-white/[0.06]">
        <ImageIcon size={14} className="text-zinc-400 flex-shrink-0" />
        <span className="text-xs text-zinc-200 font-medium truncate flex-1" title={filePath}>
          {fileName}
        </span>
        {previewData && (
          <span className="text-[10px] font-mono text-zinc-400 px-1.5 py-0.5 rounded bg-white/[0.04]">
            {previewData.width} × {previewData.height} px
          </span>
        )}
      </div>

      {/* Aspect Ratio Preset Selector */}
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10.5px] font-medium text-zinc-400 uppercase tracking-wider">
          Aspect Ratio
        </span>
        <div className="flex gap-1.5">
          {RATIO_PRESETS.map((p) => {
            const isSelected = activePreset === p.label
            return (
              <button
                key={p.label}
                type="button"
                onClick={() => handlePreset(p.label, p.aspect)}
                className={`py-1 px-2 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-white/15 border border-white/30 text-white shadow-sm'
                    : 'bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.06] text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {p.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Interactive Photo Canvas with Draggable Boundaries */}
      <div className="relative w-full flex-1 min-h-[220px] max-h-[260px] flex items-center justify-center bg-black/45 rounded-xl overflow-hidden border border-white/[0.08] p-2">
        {isLoading ? (
          <div className="flex flex-col items-center gap-2 text-zinc-500">
            <div className="w-5 h-5 rounded-full border-2 border-white/10 border-t-white animate-spin" />
            <span className="text-xs">Loading image preview…</span>
          </div>
        ) : previewData?.dataUrl ? (
          <ReactCrop
            crop={crop}
            onChange={(c) => setCrop(c)}
            onComplete={(c) => setCompletedCrop(c)}
            aspect={aspect}
            ruleOfThirds
            className="max-h-[240px] max-w-full"
          >
            <img
              ref={imgRef}
              src={previewData.dataUrl}
              alt="Crop target"
              onLoad={onImageLoad}
              className="max-h-[235px] max-w-full object-contain block mx-auto select-none pointer-events-none"
            />
          </ReactCrop>
        ) : (
          <span className="text-xs text-zinc-500">Unable to preview image</span>
        )}
      </div>

      {/* Live Coordinate & Dimensions Readout */}
      <div className="flex items-center justify-between px-3 py-1.5 rounded-lg bg-white/[0.02] border border-white/[0.05] text-[11px] text-zinc-400">
        <span>
          Crop size: <strong className="text-zinc-200 font-mono font-medium">{scaled.width} × {scaled.height} px</strong>
        </span>
        <span>
          Offset: <span className="text-zinc-300 font-mono">({scaled.left}, {scaled.top})</span>
        </span>
      </div>

      {/* Action Footer */}
      <div className="flex gap-2.5 pt-0.5">
        <button
          type="button"
          onClick={() => (window as any).popupAPI?.cancel()}
          className="px-4 py-2.5 rounded-xl font-medium text-xs text-zinc-400 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] transition-all cursor-pointer"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleConfirm}
          className="flex-1 py-2.5 rounded-xl font-semibold text-xs text-zinc-950 bg-white hover:bg-zinc-200 active:scale-[0.99] shadow-md transition-all cursor-pointer flex items-center justify-center gap-1.5"
        >
          <span>Crop and Save</span>
          <ArrowRightIcon size={12} strokeWidth={2.2} />
        </button>
      </div>
    </div>
  )
}
