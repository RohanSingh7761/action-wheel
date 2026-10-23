import React, { useState, useEffect } from 'react'
import * as pdfjsLib from 'pdfjs-dist'
import pdfWorker from 'pdfjs-dist/build/pdf.worker.mjs?url'

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker

interface PdfToImagesModalProps {
  filePath: string
}

export default function PdfToImagesModal({ filePath }: PdfToImagesModalProps): React.ReactElement {
  const [currentPage, setCurrentPage] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [status, setStatus] = useState<string>('Reading document…')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let isMounted = true

    const runConversion = async () => {
      try {
        const api = (window as any).popupAPI
        if (!api?.loadPdfBytes || !api?.confirm) return

        setStatus('Loading PDF document…')
        const res = await api.loadPdfBytes(filePath)
        if (!res || !res.bytes) {
          throw new Error(res?.isEncrypted ? 'Document is password protected' : 'Failed to read PDF bytes')
        }

        const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(res.bytes) })
        const pdf = await loadingTask.promise
        const total = pdf.numPages
        if (isMounted) setTotalPages(total)

        const renderedImages: Array<{ pageNumber: number; dataUrl: string }> = []

        for (let i = 1; i <= total; i++) {
          if (!isMounted) return
          setCurrentPage(i)
          setStatus(`Rendering page ${i} of ${total}…`)

          const page = await pdf.getPage(i)
          const originalViewport = page.getViewport({ scale: 1.0 })
          // Target 1600px wide for crisp export
          const scale = Math.min(2.0, Math.max(1.0, 1600 / originalViewport.width))
          const viewport = page.getViewport({ scale })

          const canvas = document.createElement('canvas')
          canvas.width = Math.round(viewport.width)
          canvas.height = Math.round(viewport.height)
          const ctx = canvas.getContext('2d')
          if (!ctx) continue

          await page.render({ canvasContext: ctx, viewport }).promise

          renderedImages.push({
            pageNumber: i,
            dataUrl: canvas.toDataURL('image/png')
          })
        }

        if (isMounted) {
          setStatus('Saving image files to disk…')
          await api.confirm({
            params: {
              images: renderedImages
            }
          })
        }
      } catch (err: any) {
        if (isMounted) {
          setError(err?.message || 'Conversion failed')
        }
      }
    }

    runConversion()
    return () => {
      isMounted = false
    }
  }, [filePath])

  const handleCancel = () => {
    ;(window as any).popupAPI?.cancel()
  }

  const percent = totalPages > 0 ? Math.round((currentPage / totalPages) * 100) : 0

  return (
    <div className="flex-1 flex flex-col justify-between select-none h-full min-h-[300px] p-2">
      <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center">
        {error ? (
          <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl max-w-sm">
            <span className="text-red-400 text-xs font-semibold block mb-1">Conversion Failed</span>
            <span className="text-zinc-400 text-[11px]">{error}</span>
          </div>
        ) : (
          <>
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
              <div className="w-6 h-6 rounded-full border-2 border-indigo-500/20 border-t-indigo-500 animate-spin" />
            </div>

            <div>
              <h3 className="text-sm font-semibold text-white mb-1">
                Exporting PDF to Images
              </h3>
              <p className="text-xs text-zinc-400 font-medium">{status}</p>
            </div>

            {/* Progress Bar */}
            {totalPages > 0 && (
              <div className="w-64 max-w-full">
                <div className="w-full h-2 rounded-full bg-white/[0.08] overflow-hidden p-0.5 border border-white/[0.06]">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-indigo-400 transition-all duration-200"
                    style={{ width: `${percent}%` }}
                  />
                </div>
                <div className="flex justify-between items-center mt-1.5 px-0.5">
                  <span className="text-[10px] font-mono text-zinc-500">
                    Page {currentPage} / {totalPages}
                  </span>
                  <span className="text-[10px] font-mono text-indigo-400 font-semibold">
                    {percent}%
                  </span>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Footer */}
      <div className="pt-3 border-t border-white/[0.06] flex items-center justify-center">
        <button
          onClick={handleCancel}
          className="px-4 py-2 rounded-xl text-xs font-medium text-zinc-400 hover:text-white hover:bg-white/[0.06] transition-colors cursor-pointer"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}
