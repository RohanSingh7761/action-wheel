import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs'
import * as pdfjsWorker from 'pdfjs-dist/legacy/build/pdf.worker.mjs'

// Bind worker directly to global scope so PDF.js executes synchronously without external worker file or CORS blocks
;(globalThis as any).pdfjsWorker = pdfjsWorker

export interface RenderedPage {
  pageNumber: number
  width: number
  height: number
  dataUrl: string
}

export function base64ToUint8(base64: string): Uint8Array {
  const binary = atob(base64)
  const len = binary.length
  const bytes = new Uint8Array(len)
  for (let i = 0; i < len; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes
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
  if (!res || !res.base64) {
    return {
      isEncrypted: Boolean(res?.isEncrypted),
      pageCount: 0,
      pages: []
    }
  }

  const pdfData = base64ToUint8(res.base64)
  const loadingTask = pdfjsLib.getDocument({ data: pdfData })
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
