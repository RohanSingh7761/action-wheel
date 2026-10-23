import * as pdfjsLib from 'pdfjs-dist'
import pdfWorker from 'pdfjs-dist/build/pdf.worker.mjs?url'

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker

export interface RenderedPage {
  pageNumber: number
  width: number
  height: number
  dataUrl: string
}

export async function loadAndRenderPdf(
  filePath: string,
  maxPages = 50,
  targetWidth = 700
): Promise<{ isEncrypted: boolean; pageCount: number; pages: RenderedPage[] }> {
  const api = (window as any).popupAPI
  if (!api?.loadPdfBytes) {
    throw new Error('popupAPI.loadPdfBytes unavailable')
  }

  const res = await api.loadPdfBytes(filePath)
  if (!res || !res.bytes) {
    return {
      isEncrypted: Boolean(res?.isEncrypted),
      pageCount: 0,
      pages: []
    }
  }

  const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(res.bytes) })
  const pdf = await loadingTask.promise
  const pageCount = pdf.numPages
  const pagesToLoad = Math.min(pageCount, maxPages)
  const pages: RenderedPage[] = []

  for (let i = 1; i <= pagesToLoad; i++) {
    const page = await pdf.getPage(i)
    const originalViewport = page.getViewport({ scale: 1.0 })
    const scale = targetWidth / originalViewport.width
    const viewport = page.getViewport({ scale })

    const canvas = document.createElement('canvas')
    canvas.width = Math.round(viewport.width)
    canvas.height = Math.round(viewport.height)
    const ctx = canvas.getContext('2d')
    if (!ctx) continue

    await page.render({ canvasContext: ctx, viewport }).promise

    pages.push({
      pageNumber: i,
      width: Math.round(originalViewport.width),
      height: Math.round(originalViewport.height),
      dataUrl: canvas.toDataURL('image/png')
    })
  }

  return { isEncrypted: false, pageCount, pages }
}
