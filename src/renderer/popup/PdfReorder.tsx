import React, { useState, useEffect } from 'react'
import { Reorder } from 'framer-motion'
import { PdfIcon } from '../shared/Icons'

interface PdfReorderProps {
  filePath: string
  filePaths?: string[]
}

export default function PdfReorder({ filePath, filePaths }: PdfReorderProps): React.ReactElement {
  const initialList = filePaths && filePaths.length > 0 ? filePaths : [filePath]
  const [items, setItems] = useState<string[]>(initialList)
  const [previews, setPreviews] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Calculate default filename based on the first image
  const firstFileName = filePath.split('\\').pop()?.split('/').pop() || 'Document'
  const baseNameWithoutExt = firstFileName.replace(/\.[^/.]+$/, '')
  const defaultDocName = `${baseNameWithoutExt} (Combined)`
  const [pdfName, setPdfName] = useState<string>(defaultDocName)

  // Load image thumbnails
  useEffect(() => {
    let isMounted = true
    const loadPreviews = async () => {
      const api = (window as any).popupAPI
      if (!api?.loadImage) return

      for (const p of initialList) {
        try {
          const res = await api.loadImage(p)
          if (res?.dataUrl && isMounted) {
            setPreviews((prev) => ({ ...prev, [p]: res.dataUrl }))
          }
        } catch (err) {
          console.warn('Failed to load preview for', p, err)
        }
      }
    }
    loadPreviews()
    return () => {
      isMounted = false
    }
  }, [])

  const moveItem = (fromIndex: number, direction: 'up' | 'down') => {
    const toIndex = direction === 'up' ? fromIndex - 1 : fromIndex + 1
    if (toIndex < 0 || toIndex >= items.length) return
    const newItems = [...items]
    const [moved] = newItems.splice(fromIndex, 1)
    newItems.splice(toIndex, 0, moved)
    setItems(newItems)
  }

  const handleConvert = async () => {
    if (isSubmitting) return
    setIsSubmitting(true)
    const api = (window as any).popupAPI
    if (api?.confirm) {
      const trimmed = pdfName.trim() || defaultDocName
      const outputName = trimmed.toLowerCase().endsWith('.pdf') ? trimmed : `${trimmed}.pdf`
      await api.confirm({
        params: {
          orderedPaths: items,
          outputName
        }
      })
    }
  }

  const handleCancel = () => {
    const api = (window as any).popupAPI
    if (api?.cancel) {
      api.cancel()
    }
  }

  return (
    <div className="flex-1 flex flex-col justify-between select-none h-full min-h-[390px]">
      <div>
        {/* Custom PDF File Naming Section */}
        <div className="mb-3">
          <div className="flex items-center justify-between mb-1">
            <label className="text-[11px] font-semibold text-zinc-300">
              PDF Name
            </label>
            <span className="text-[10px] text-zinc-500">
              {items.length} images will be merged
            </span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/[0.04] border border-white/[0.08] focus-within:border-indigo-500/80 transition-all shadow-inner">
            <input
              type="text"
              value={pdfName}
              onChange={(e) => setPdfName(e.target.value)}
              placeholder={defaultDocName}
              className="w-full bg-transparent text-xs text-white focus:outline-none placeholder-zinc-500 font-sans tracking-wide"
            />
            <span className="text-[11px] text-zinc-500 font-mono select-none flex-shrink-0">
              .pdf
            </span>
          </div>
        </div>

        {/* Section Header */}
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[11px] font-semibold text-zinc-300">
            Page Order
          </span>
          <span className="text-[10px] text-zinc-500">
            Drag items up/down to reorder
          </span>
        </div>

        {/* Framer Motion Fluid Pointer Reorderable List */}
        <Reorder.Group
          axis="y"
          values={items}
          onReorder={setItems}
          className="space-y-1.5 overflow-y-auto max-h-[250px] pr-1"
        >
          {items.map((path, idx) => {
            const fileName = path.split('\\').pop()?.split('/').pop() || 'Image'
            const thumb = previews[path]

            return (
              <Reorder.Item
                key={path}
                value={path}
                whileDrag={{
                  scale: 1.02,
                  boxShadow: '0 12px 28px rgba(0, 0, 0, 0.75)',
                  borderColor: 'rgba(99, 102, 241, 0.6)'
                }}
                className="flex items-center gap-2.5 p-2 rounded-xl border border-white/[0.06] bg-[#16181f]/90 hover:bg-[#1c1f28] hover:border-white/20 transition-colors cursor-grab active:cursor-grabbing select-none"
              >
                {/* Drag Handle & Page Number */}
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <span className="text-zinc-500 text-xs font-mono font-bold select-none px-0.5">
                    ⋮⋮
                  </span>
                  <span className="w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-semibold bg-white/[0.08] text-zinc-300 border border-white/[0.06]">
                    {idx + 1}
                  </span>
                </div>

                {/* Thumbnail */}
                <div className="w-9 h-9 rounded-lg overflow-hidden bg-black/50 border border-white/10 flex-shrink-0 flex items-center justify-center">
                  {thumb ? (
                    <img src={thumb} alt="" className="w-full h-full object-cover pointer-events-none" />
                  ) : (
                    <span className="text-[8px] text-zinc-500 font-mono">IMG</span>
                  )}
                </div>

                {/* File Info */}
                <div className="flex-1 min-w-0 pointer-events-none">
                  <p className="text-xs font-medium text-zinc-200 truncate" title={fileName}>
                    {fileName}
                  </p>
                  <p className="text-[9.5px] text-zinc-500 truncate" title={path}>
                    {path}
                  </p>
                </div>

                {/* Move Up / Down Quick Buttons */}
                <div className="flex items-center gap-0.5 flex-shrink-0">
                  <button
                    type="button"
                    disabled={idx === 0}
                    onClick={(e) => {
                      e.stopPropagation()
                      moveItem(idx, 'up')
                    }}
                    className="w-5 h-5 rounded flex items-center justify-center text-[10px] text-zinc-400 hover:text-white hover:bg-white/10 disabled:opacity-20 disabled:pointer-events-none transition-colors"
                    title="Move up"
                  >
                    ▲
                  </button>
                  <button
                    type="button"
                    disabled={idx === items.length - 1}
                    onClick={(e) => {
                      e.stopPropagation()
                      moveItem(idx, 'down')
                    }}
                    className="w-5 h-5 rounded flex items-center justify-center text-[10px] text-zinc-400 hover:text-white hover:bg-white/10 disabled:opacity-20 disabled:pointer-events-none transition-colors"
                    title="Move down"
                  >
                    ▼
                  </button>
                </div>
              </Reorder.Item>
            )
          })}
        </Reorder.Group>
      </div>

      {/* Bottom Action Footer */}
      <div className="mt-3 pt-3 flex items-center justify-between border-t border-white/[0.06]">
        <button
          type="button"
          onClick={handleCancel}
          className="px-4 py-2 rounded-xl text-xs font-medium text-zinc-400 hover:text-white hover:bg-white/[0.06] border border-white/[0.08] transition-all cursor-pointer active:scale-95"
        >
          Cancel
        </button>

        <button
          type="button"
          onClick={handleConvert}
          disabled={isSubmitting || items.length === 0}
          className="flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 active:scale-95 disabled:opacity-50 transition-all shadow-lg shadow-indigo-600/30 cursor-pointer"
        >
          <PdfIcon size={14} strokeWidth={2} />
          <span>{isSubmitting ? 'Converting…' : 'Convert to PDF'}</span>
        </button>
      </div>
    </div>
  )
}
