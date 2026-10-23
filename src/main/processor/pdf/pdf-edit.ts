import { readFileSync, writeFileSync, existsSync, openSync, closeSync } from 'fs'
import { join, dirname, basename, extname } from 'path'
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib'
import type { PdfEditParams } from '../../shared/ipc-types'

function getUniquePath(dir: string, base: string, ext = '.pdf'): string {
  let outputPath = join(dir, `${base}${ext}`)
  let counter = 1
  while (existsSync(outputPath)) {
    try {
      const fd = openSync(outputPath, 'r+')
      closeSync(fd)
      break
    } catch {
      outputPath = join(dir, `${base} (${counter})${ext}`)
      counter++
    }
  }
  return outputPath
}

function hexToRgb(hex?: string) {
  if (!hex || !hex.startsWith('#')) return rgb(0, 0, 0)
  const clean = hex.replace('#', '')
  const num = parseInt(clean, 16)
  if (clean.length === 6) {
    const r = ((num >> 16) & 255) / 255
    const g = ((num >> 8) & 255) / 255
    const b = (num & 255) / 255
    return rgb(r, g, b)
  }
  return rgb(0, 0, 0)
}

export async function editPdf(filePath: string, params: PdfEditParams): Promise<string> {
  const fileBytes = readFileSync(filePath)
  const pdfDoc = await PDFDocument.load(fileBytes)
  const pages = pdfDoc.getPages()
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)

  for (const ann of params.annotations) {
    const pageIndex = ann.page - 1
    if (pageIndex < 0 || pageIndex >= pages.length) continue

    const page = pages[pageIndex]
    const { width: pWidth, height: pHeight } = page.getSize()

    const x = ann.x
    const y = ann.y
    const w = ann.width || 0
    const h = ann.height || 0

    if (ann.type === 'whiteout') {
      const pdfY = pHeight - (y + h)
      page.drawRectangle({
        x: Math.max(0, x),
        y: Math.max(0, pdfY),
        width: Math.min(w, pWidth - x),
        height: Math.min(h, pHeight),
        color: rgb(1, 1, 1),
        opacity: 1
      })
    } else if (ann.type === 'redact') {
      const pdfY = pHeight - (y + h)
      page.drawRectangle({
        x: Math.max(0, x),
        y: Math.max(0, pdfY),
        width: Math.min(w, pWidth - x),
        height: Math.min(h, pHeight),
        color: rgb(0, 0, 0),
        opacity: 1
      })
    } else if (ann.type === 'highlight') {
      const pdfY = pHeight - (y + h)
      page.drawRectangle({
        x: Math.max(0, x),
        y: Math.max(0, pdfY),
        width: Math.min(w, pWidth - x),
        height: Math.min(h, pHeight),
        color: rgb(1, 0.92, 0.23),
        opacity: 0.45
      })
    } else if (ann.type === 'text') {
      const text = ann.text || ''
      if (!text.trim()) continue
      const fontSize = ann.fontSize || 14
      const pdfY = pHeight - y - Math.round(fontSize * 0.82)
      const textColor = hexToRgb(ann.color)

      page.drawText(text, {
        x: Math.max(0, x),
        y: Math.max(0, pdfY),
        size: fontSize,
        font: fontBold,
        color: textColor
      })
    }
  }

  const dir = dirname(filePath)
  const base = basename(filePath, extname(filePath))
  const outPath = getUniquePath(dir, `${base} (Edited)`)

  const outBytes = await pdfDoc.save()
  writeFileSync(outPath, outBytes)
  console.log(`[pdf-edit] Applied ${params.annotations.length} annotations to ${outPath}`)
  return outPath
}
