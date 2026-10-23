import React, { useState } from 'react'
import { Reorder, motion } from 'framer-motion'
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

        {/* Reorderable List */}
        <div className="mb-1 flex items-center justify-between">
          <span className="text-[11px] font-semibold text-zinc-300">
            Page Order (Drag or use arrows)
          </span>
          <span className="text-[10px] text-zinc-500">Top file will appear first</span>
        </div>

        <div className="max-h-[290px] overflow-y-auto pr-1">
          <Reorder.Group axis="y" values={items} onReorder={setItems} className="space-y-2">
            {items.map((item, index) => {
              const name = item.split('\\').pop()?.split('/').pop() || item
              return (
                <Reorder.Item
                  key={item}
                  value={item}
                  className="bg-black/40 hover:bg-black/60 border border-white/[0.08] hover:border-white/[0.2] rounded-xl p-2.5 flex items-center justify-between gap-3 cursor-grab active:cursor-grabbing transition-colors shadow-sm"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="w-5 h-5 rounded-md bg-white/[0.06] flex items-center justify-center text-[10px] font-mono text-zinc-400 shrink-0">
                      {index + 1}
                    </span>
                    <div className="w-7 h-7 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center shrink-0">
                      <PdfIcon size={14} className="text-red-400" />
                    </div>
                    <div className="truncate">
                      <p className="text-xs font-medium text-white truncate">{name}</p>
                      <p className="text-[10px] text-zinc-500 truncate font-mono">{item}</p>
                    </div>
                  </div>

                  {/* Reorder Buttons */}
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      disabled={index === 0}
                      onClick={() => moveItem(index, 'up')}
                      className="w-6 h-6 rounded-lg bg-white/[0.04] hover:bg-white/[0.1] disabled:opacity-20 text-zinc-300 text-xs flex items-center justify-center transition-colors"
                      title="Move Up"
                    >
                      ↑
                    </button>
                    <button
                      disabled={index === items.length - 1}
                      onClick={() => moveItem(index, 'down')}
                      className="w-6 h-6 rounded-lg bg-white/[0.04] hover:bg-white/[0.1] disabled:opacity-20 text-zinc-300 text-xs flex items-center justify-center transition-colors"
                      title="Move Down"
                    >
                      ↓
                    </button>
                  </div>
                </Reorder.Item>
              )
            })}
          </Reorder.Group>
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
          onClick={handleMerge}
          disabled={items.length < 2 || isSubmitting}
          className={`px-5 py-2 rounded-xl text-xs font-semibold shadow-lg transition-all flex items-center gap-2 ${
            items.length >= 2 && !isSubmitting
              ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/30 cursor-pointer'
              : 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
          }`}
        >
          {isSubmitting ? 'Merging PDFs…' : `Merge ${items.length} PDFs`}
        </button>
      </div>
    </div>
  )
}
