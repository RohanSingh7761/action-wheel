import { readFileSync, writeFileSync, existsSync, openSync, closeSync } from 'fs'
import { PDFDocument } from 'pdf-lib'
import { extname, join, dirname, basename } from 'path'
import type { PdfSignParams } from '../../shared/ipc-types'

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

export async function signPdf(filePath: string, params: PdfSignParams): Promise<string> {
  const fileBytes = readFileSync(filePath)
  const pdfDoc = await PDFDocument.load(fileBytes)
  const pages = pdfDoc.getPages()

  const pageIndex = Math.max(0, Math.min(params.page - 1, pages.length - 1))
  const targetPage = pages[pageIndex]
  const { width: pageWidth, height: pageHeight } = targetPage.getSize()

  const base64Data = params.signatureDataUrl.replace(/^data:image\/\w+;base64,/, '')
  const sigBuffer = Buffer.from(base64Data, 'base64')
  const sigImage = await pdfDoc.embedPng(sigBuffer)

  const sigW = params.width > 1 ? params.width : params.width * pageWidth
  const sigH = params.height > 1 ? params.height : params.height * pageHeight
  const posX = params.x > 1 ? params.x : params.x * pageWidth
  const screenY = params.y > 1 ? params.y : params.y * pageHeight
  const posY = pageHeight - screenY - sigH

  targetPage.drawImage(sigImage, {
    x: Math.max(0, posX),
    y: Math.max(0, posY),
    width: sigW,
    height: sigH
  })

  const dir = dirname(filePath)
  const base = basename(filePath, extname(filePath))
  const outPath = getUniquePath(dir, `${base} (Signed)`)

  const outBytes = await pdfDoc.save()
  writeFileSync(outPath, outBytes)
  console.log(`[pdf-sign] Successfully saved signed PDF to ${outPath}`)
  return outPath
}
