import { readFileSync, writeFileSync } from 'fs'
import { PDFDocument } from 'pdf-lib'
import sharp from 'sharp'
import { extname, join, dirname, basename } from 'path'

export async function convertToPdf(inputPath: string): Promise<string> {
  const ext = extname(inputPath).toLowerCase()
  const base = basename(inputPath, ext)
  const outputPath = join(dirname(inputPath), `${base}.pdf`)

  // Convert image to PNG bytes first (for embedding into PDF)
  let imgBytes: Buffer
  let width: number
  let height: number

  const metadata = await sharp(inputPath).metadata()
  width = metadata.width ?? 800
  height = metadata.height ?? 600

  if (ext === '.jpg' || ext === '.jpeg') {
    imgBytes = readFileSync(inputPath)
  } else {
    imgBytes = await sharp(inputPath).jpeg({ quality: 95 }).toBuffer()
  }

  const pdfDoc = await PDFDocument.create()
  const page = pdfDoc.addPage([width, height])

  let embeddedImage
  if (ext === '.jpg' || ext === '.jpeg') {
    embeddedImage = await pdfDoc.embedJpg(imgBytes)
  } else {
    const pngBytes = await sharp(inputPath).png().toBuffer()
    embeddedImage = await pdfDoc.embedPng(pngBytes)
  }

  page.drawImage(embeddedImage, { x: 0, y: 0, width, height })

  const pdfBytes = await pdfDoc.save()
  writeFileSync(outputPath, pdfBytes)

  return outputPath
}
