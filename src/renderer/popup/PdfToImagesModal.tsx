import React, { useState, useEffect } from 'react'
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs'
import * as pdfjsWorker from 'pdfjs-dist/legacy/build/pdf.worker.mjs'
import { base64ToUint8 } from './pdf-renderer'

;(globalThis as any).pdfjsWorker = pdfjsWorker

interface PdfToImagesModalProps {
  filePath: string
  filePaths?: string[]
}

export default function PdfToImagesModal({ filePath, filePaths }: PdfToImagesModalProps): React.ReactElement {
  const allFiles = filePaths && filePaths.length > 0 ? filePaths : [filePath]
  const isBatch = allFiles.length > 1

  const [currentFileIndex, setCurrentFileIndex] = useState(0)
  const [currentPage, setCurrentPage] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [status, setStatus] = useState<string>('Preparing…')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let isMounted = true

    const runConversion = async () => {
      try {
        const api = (window as any).popupAPI
        if (!api?.loadPdfBytes || !api?.confirm) return

        if (!isBatch) {
          // Single PDF conversion
          const fileName = filePath.split('\\').pop()?.split('/').pop() || 'Document'
          setStatus(`Loading ${fileName}…`)

          const res = await api.loadPdfBytes(filePath)
          if (!res || !res.base64) {
            throw new Error(res?.isEncrypted ? 'Document is password protected' : 'Failed to read PDF file')
          }

          const pdfData = base64ToUint8(res.base64)
          const loadingTask = pdfjsLib.getDocument({ data: pdfData })
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
            setStatus('Saving images to disk…')
            await api.confirm({
              params: {
                images: renderedImages,
                totalImagesCount: renderedImages.length
              }
            })
          }
        } else {
          // Multiple PDFs conversion (batch)
          const batch: Record<string, Array<{ pageNumber: number; dataUrl: string }>> = {}
          let grandTotalImages = 0

          for (let fIdx = 0; fIdx < allFiles.length; fIdx++) {
            if (!isMounted) return
            const targetPath = allFiles[fIdx]
            const fileName = targetPath.split('\\').pop()?.split('/').pop() || `PDF ${fIdx + 1}`
            setCurrentFileIndex(fIdx)
            setStatus(`Processing file ${fIdx + 1} of ${allFiles.length}: ${fileName}`)

            const res = await api.loadPdfBytes(targetPath)
            if (!res || !res.base64) continue

            const pdfData = base64ToUint8(res.base64)
            const loadingTask = pdfjsLib.getDocument({ data: pdfData })
            const pdf = await loadingTask.promise
            const total = pdf.numPages
            setTotalPages(total)

            const imagesForFile: Array<{ pageNumber: number; dataUrl: string }> = []
            for (let pIdx = 1; pIdx <= total; pIdx++) {
              if (!isMounted) return
              setCurrentPage(pIdx)
              setStatus(`File ${fIdx + 1}/${allFiles.length} (${fileName}): page ${pIdx}/${total}`)

              const page = await pdf.getPage(pIdx)
              const originalViewport = page.getViewport({ scale: 1.0 })
              const scale = Math.min(2.0, Math.max(1.0, 1600 / originalViewport.width))
              const viewport = page.getViewport({ scale })

              const canvas = document.createElement('canvas')
              canvas.width = Math.round(viewport.width)
              canvas.height = Math.round(viewport.height)
              const ctx = canvas.getContext('2d')
              if (!ctx) continue

              await page.render({ canvasContext: ctx, viewport }).promise

              imagesForFile.push({
                pageNumber: pIdx,
                dataUrl: canvas.toDataURL('image/png')
              })
            }

            batch[targetPath] = imagesForFile
            grandTotalImages += imagesForFile.length
          }

          if (isMounted) {
            setStatus('Saving all extracted images to disk…')
            await api.confirm({
              params: {
                batch,
                totalImagesCount: grandTotalImages
              }
            })
          }
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
  }, [filePath, filePaths])

  const handleCancel = () => {
    ;(window as any).popupAPI?.cancel()
  }

  const percent = totalPages > 0 ? Math.round((currentPage / totalPages) * 100) : 0

  return (
    <div className="flex-1 flex flex-col justify-between select-none h-full min-h-[340px] p-4">
      <div className="flex-1 flex flex-col items-center justify-center gap-5 text-center">
        {error ? (
          <div className="p-5 bg-red-500/10 border border-red-500/20 rounded-2xl max-w-md">
            <span className="text-red-400 text-sm font-semibold block mb-1">Conversion Failed</span>
            <span className="text-zinc-300 text-xs">{error}</span>
          </div>
        ) : (
          <>
            <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center shadow-lg shadow-indigo-500/10">
              <div className="w-7 h-7 rounded-full border-2 border-indigo-500/20 border-t-indigo-500 animate-spin" />
            </div>

            <div className="space-y-1 max-w-md">
              <h3 className="text-base font-semibold text-white">
                {isBatch
                  ? `Extracting Images from ${allFiles.length} PDFs`
                  : 'Converting PDF to High-Res Images'}
              </h3>
              <p className="text-xs text-zinc-400 font-medium truncate">{status}</p>
            </div>

            {/* Progress Display */}
            {totalPages > 0 && (
              <div className="w-72 max-w-full space-y-2">
                <div className="w-full h-2.5 rounded-full bg-white/[0.08] overflow-hidden p-0.5 border border-white/[0.06]">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-indigo-500 via-indigo-400 to-indigo-300 transition-all duration-200"
                    style={{ width: `${percent}%` }}
                  />
                </div>
                <div className="flex justify-between items-center px-1">
                  <span className="text-[11px] font-mono text-zinc-400 font-medium">
                    {isBatch
                      ? `PDF ${currentFileIndex + 1} of ${allFiles.length} · Page ${currentPage}/${totalPages}`
                      : `Page ${currentPage} of ${totalPages}`}
                  </span>
                  <span className="text-[11px] font-mono text-indigo-400 font-bold">
                    {percent}%
                  </span>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Footer */}
      <div className="pt-4 border-t border-white/[0.06] flex items-center justify-center">
        <button
          onClick={handleCancel}
          className="px-6 py-2.5 rounded-xl text-xs font-semibold text-zinc-300 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] transition-all cursor-pointer active:scale-95 shadow-sm"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}
