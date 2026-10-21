import { writeFileSync, existsSync, openSync, closeSync } from 'fs'
import { PDFDocument } from 'pdf-lib'
import sharp from 'sharp'
import { extname, join, dirname, basename } from 'path'

export async function convertToPdf(inputPath: string): Promise<string> {
  const ext = extname(inputPath).toLowerCase()
  const base = basename(inputPath, ext)
  const dir = dirname(inputPath)
  let outputPath = join(dir, `${base}.pdf`)

  // If the destination PDF already exists and is locked by a viewer, append a number
  let counter = 1
  while (existsSync(outputPath)) {
    try {
      const fd = openSync(outputPath, 'r+')
      closeSync(fd)
      break
    } catch {
      outputPath = join(dir, `${base} (${counter}).pdf`)
      counter++
    }
  }

  const metadata = await sharp(inputPath).metadata()
  const width = metadata.width ?? 800
  const height = metadata.height ?? 600

  const pdfDoc = await PDFDocument.create()
  const page = pdfDoc.addPage([width, height])

  let embeddedImage
  try {
    // Convert to a clean baseline JPEG buffer (strips progressive / CMYK flags that pdf-lib cannot parse)
    const jpgBytes = await sharp(inputPath)
      .jpeg({ quality: 95, progressive: false })
      .toBuffer()
    embeddedImage = await pdfDoc.embedJpg(jpgBytes)
  } catch (jpgErr) {
    console.warn('[pdf] embedJpg failed, falling back to PNG embedding:', jpgErr)
    const pngBytes = await sharp(inputPath).png().toBuffer()
    embeddedImage = await pdfDoc.embedPng(pngBytes)
  }

  page.drawImage(embeddedImage, { x: 0, y: 0, width, height })

  const pdfBytes = await pdfDoc.save()
  writeFileSync(outputPath, pdfBytes)
  console.log(`[pdf] Successfully saved: ${outputPath}`)

  return outputPath
}
