import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'
import { join, dirname, basename, extname } from 'path'
import { createCanvas } from '@napi-rs/canvas'
import type { PdfToImagesParams } from '../../shared/ipc-types'
import { getStandardFontsUrl } from './pdf-preview'
import { getPdfjs } from './pdfjs-loader'

function getUniqueDir(baseDir: string, folderName: string): string {
  let target = join(baseDir, folderName)
  let counter = 1
  while (existsSync(target)) {
    target = join(baseDir, `${folderName} (${counter})`)
    counter++
  }
  mkdirSync(target, { recursive: true })
  return target
}

function getUniquePath(dir: string, base: string, ext = '.png'): string {
  let target = join(dir, `${base}${ext}`)
  let counter = 1
  while (existsSync(target)) {
    target = join(dir, `${base} (${counter})${ext}`)
    counter++
  }
  return target
}

export async function pdfToImages(
  filePath: string,
  _params?: PdfToImagesParams
): Promise<{ outputPath: string; sizeInfo?: string }> {
  const fileBytes = readFileSync(filePath)
  const dir = dirname(filePath)
  const base = basename(filePath, extname(filePath))

  const pdfjs = await getPdfjs()

  const loadingTask = pdfjs.getDocument({
    data: new Uint8Array(fileBytes),
    standardFontDataUrl: getStandardFontsUrl()
  })

  const pdf = await loadingTask.promise
  const pageCount = pdf.numPages

  if (pageCount === 0) {
    throw new Error('PDF has 0 pages')
  }

  const exportToFolder = pageCount > 10
  const outDir = exportToFolder ? getUniqueDir(dir, `${base} (Images)`) : dir
  const savedFiles: string[] = []

  const padDigits = pageCount >= 100 ? 3 : 2

  for (let i = 1; i <= pageCount; i++) {
    const page = await pdf.getPage(i)
    const originalViewport = page.getViewport({ scale: 1.0 })
    
    // Scale up for crisp high-resolution images (up to 1600px wide)
    const scale = Math.min(2.0, Math.max(1.0, 1600 / originalViewport.width))
    const viewport = page.getViewport({ scale })

    const canvas = createCanvas(Math.round(viewport.width), Math.round(viewport.height))
    const context = canvas.getContext('2d')

    await page.render({
      canvasContext: context,
      viewport
    }).promise

    const pngBuffer = canvas.toBuffer('image/png')
    const paddedNum = String(i).padStart(padDigits, '0')
    const fileBase = exportToFolder ? `page-${paddedNum}` : `${base}_page_${i}`
    const pageFilePath = exportToFolder
      ? join(outDir, `${fileBase}.png`)
      : getUniquePath(outDir, fileBase, '.png')

    writeFileSync(pageFilePath, pngBuffer)
    savedFiles.push(pageFilePath)
  }

  console.log(`[pdf-to-images] Successfully converted ${pageCount} pages from ${filePath}`)
  return {
    outputPath: exportToFolder ? outDir : savedFiles[0],
    sizeInfo: exportToFolder ? `${pageCount} images saved in folder` : `${pageCount} images exported`
  }
}
