import { readFileSync, existsSync } from 'fs'
import { join } from 'path'
import { createCanvas } from '@napi-rs/canvas'
import { isEncrypted } from '@pdfsmaller/pdf-decrypt'
import { getPdfjs } from './pdfjs-loader'

export interface PdfPageDetail {
  pageNumber: number
  width: number
  height: number
  dataUrl: string
}

export interface PdfDetailsResult {
  isEncrypted: boolean
  pageCount: number
  pages: PdfPageDetail[]
}

export function getStandardFontsUrl(): string {
  const candidates = [
    join(process.resourcesPath || '', 'node_modules/pdfjs-dist/standard_fonts/'),
    join(process.resourcesPath || '', 'resources/standard_fonts/'),
    join(process.cwd(), 'node_modules/pdfjs-dist/standard_fonts/'),
    join(__dirname, '../../../node_modules/pdfjs-dist/standard_fonts/'),
    join(__dirname, '../../node_modules/pdfjs-dist/standard_fonts/')
  ]
  for (const c of candidates) {
    if (c && existsSync(c)) {
      return c.replace(/\\/g, '/').replace(/\/?$/, '/')
    }
  }
  return join(process.cwd(), 'node_modules/pdfjs-dist/standard_fonts/').replace(/\\/g, '/').replace(/\/?$/, '/')
}

export async function loadPdfDetails(filePath: string, maxPages = 50): Promise<PdfDetailsResult> {
  const fileBytes = readFileSync(filePath)

  const encInfo = await isEncrypted(fileBytes)
  if (encInfo.encrypted) {
    return {
      isEncrypted: true,
      pageCount: 0,
      pages: []
    }
  }

  const pdfjs = await getPdfjs()

  // Load document with standard fonts
  const loadingTask = pdfjs.getDocument({
    data: new Uint8Array(fileBytes),
    standardFontDataUrl: getStandardFontsUrl()
  })

  const pdf = await loadingTask.promise
  const pageCount = pdf.numPages
  const pagesToLoad = Math.min(pageCount, maxPages)
  const pages: PdfPageDetail[] = []

  for (let i = 1; i <= pagesToLoad; i++) {
    try {
      const page = await pdf.getPage(i)
      const originalViewport = page.getViewport({ scale: 1.0 })
      
      // Target thumbnail width around 600px for sharp rendering inside modal
      const targetWidth = 600
      const scale = targetWidth / originalViewport.width
      const viewport = page.getViewport({ scale })

      const canvas = createCanvas(Math.round(viewport.width), Math.round(viewport.height))
      const context = canvas.getContext('2d')

      await page.render({
        canvasContext: context,
        viewport
      }).promise

      const pngBuf = canvas.toBuffer('image/png')
      pages.push({
        pageNumber: i,
        width: Math.round(originalViewport.width),
        height: Math.round(originalViewport.height),
        dataUrl: `data:image/png;base64,${pngBuf.toString('base64')}`
      })
    } catch (err) {
      console.warn(`[pdf-preview] Failed to render page ${i}:`, err)
    }
  }

  return {
    isEncrypted: false,
    pageCount,
    pages
  }
}
