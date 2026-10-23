import React, { useState, useEffect } from 'react'
import { Reorder } from 'framer-motion'
import { PdfIcon } from '../shared/Icons'

interface PdfMergeModalProps {
  filePath: string
  filePaths?: string[]
}

export default function PdfMergeModal({ filePath, filePaths }: PdfMergeModalProps): React.ReactElement {
  const initialList = filePaths && filePaths.length > 0 ? filePaths : [filePath]
  const [items, setItems] = useState<string[]>(initialList)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const firstFileName = filePath.split('\\').pop()?.split('/').pop() || 'Document'
  const baseNameWithoutExt = firstFileName.replace(/\.[^/.]+$/, '')
  const defaultDocName = `${baseNameWithoutExt} (Merged)`
  const [pdfName, setPdfName] = useState<string>(defaultDocName)

  // Reset if filePaths change
  useEffect(() => {
    const list = filePaths && filePaths.length > 0 ? filePaths : [filePath]
    setItems(list)
    setIsSubmitting(false)
  }, [filePath, filePaths])

  const moveItem = (fromIndex: number, direction: 'up' | 'down') => {
    const toIndex = direction === 'up' ? fromIndex - 1 : fromIndex + 1
    if (toIndex < 0 || toIndex >= items.length) return
    const newItems = [...items]
    const [moved] = newItems.splice(fromIndex, 1)
    newItems.splice(toIndex, 0, moved)
    setItems(newItems)
  }

  const handleMerge = async () => {
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
    ;(window as any).popupAPI?.cancel()
  }

  return (
    <div className="flex-1 flex flex-col justify-between select-none h-full min-h-[400px]">
      <div>
        {/* PDF Name Input */}
        <div className="mb-3">
          <div className="flex items-center justify-between mb-1">
            <label className="text-[11px] font-semibold text-zinc-300">
              Merged PDF Name
            </label>
            <span className="text-[10px] text-zinc-400">
              {items.length} PDF files will be combined
            </span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/[0.04] border border-white/[0.08] focus-within:border-indigo-500/80 transition-all">
            <input
              type="text"
              value={pdfName}
              onChange={(e) => setPdfName(e.target.value)}
              placeholder={defaultDocName}
              className="w-full bg-transparent text-xs text-white focus:outline-none placeholder-zinc-500 font-sans tracking-wide"
            />
            <span className="text-[11px] text-zinc-500 font-mono select-none">.pdf</span>
          </div>
        </div>

        {/* Reorderable List Section Header */}
        <div className="mb-1.5 flex items-center justify-between">
          <span className="text-[11px] font-semibold text-zinc-300">
            Page Order
          </span>
          <span className="text-[10px] text-zinc-500">Drag items or use buttons to reorder</span>
        </div>

        <Reorder.Group
          axis="y"
          values={items}
          onReorder={setItems}
          className="space-y-1.5 overflow-y-auto max-h-[250px] pr-1"
        >
          {items.map((item, index) => {
            const name = item.split('\\').pop()?.split('/').pop() || item
            return (
              <Reorder.Item
                key={item}
                value={item}
                whileDrag={{
                  scale: 1.02,
                  boxShadow: '0 12px 28px rgba(0, 0, 0, 0.75)',
                  borderColor: 'rgba(99, 102, 241, 0.6)'
                }}
                className="flex items-center gap-2.5 p-2 rounded-xl border border-white/[0.06] bg-[#16181f]/90 hover:bg-[#1c1f28] hover:border-white/20 transition-colors cursor-grab active:cursor-grabbing select-none"
              >
                {/* Drag Handle & Order Number */}
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <span className="text-zinc-500 text-xs font-mono font-bold select-none px-0.5">
                    ⋮⋮
                  </span>
                  <span className="w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-semibold bg-white/[0.08] text-zinc-300 border border-white/[0.06]">
                    {index + 1}
                  </span>
                </div>

                {/* PDF Icon Badge */}
                <div className="w-8 h-8 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center flex-shrink-0 pointer-events-none">
                  <PdfIcon size={14} className="text-red-400" />
                </div>

                {/* File Info */}
                <div className="flex-1 min-w-0 pointer-events-none">
                  <p className="text-xs font-medium text-zinc-200 truncate" title={name}>
                    {name}
                  </p>
                  <p className="text-[9.5px] text-zinc-500 truncate font-mono" title={item}>
                    {item}
                  </p>
                </div>

                {/* Reorder Buttons */}
                <div className="flex items-center gap-0.5 flex-shrink-0">
                  <button
                    type="button"
                    disabled={index === 0}
                    onClick={(e) => {
                      e.stopPropagation()
                      moveItem(index, 'up')
                    }}
                    className="w-5 h-5 rounded flex items-center justify-center text-[10px] text-zinc-400 hover:text-white hover:bg-white/10 disabled:opacity-20 disabled:pointer-events-none transition-colors"
                    title="Move up"
                  >
                    ▲
                  </button>
                  <button
                    type="button"
                    disabled={index === items.length - 1}
                    onClick={(e) => {
                      e.stopPropagation()
                      moveItem(index, 'down')
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

      {/* Footer Actions */}
      <div className="pt-3 border-t border-white/[0.06] flex items-center justify-between mt-3">
        <button
          type="button"
          onClick={handleCancel}
          className="px-4 py-2 rounded-xl text-xs font-medium text-zinc-400 hover:text-white hover:bg-white/[0.06] border border-white/[0.08] transition-all cursor-pointer active:scale-95"
        >
          Cancel
        </button>

        <button
          type="button"
          onClick={handleMerge}
          disabled={items.length < 2 || isSubmitting}
          className={`px-5 py-2 rounded-xl text-xs font-semibold shadow-lg transition-all flex items-center gap-2 ${
            items.length >= 2 && !isSubmitting
              ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/30 cursor-pointer active:scale-95'
              : 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
          }`}
        >
          {isSubmitting ? 'Merging PDFs…' : `Merge ${items.length} PDFs`}
        </button>
      </div>
    </div>
  )
}
