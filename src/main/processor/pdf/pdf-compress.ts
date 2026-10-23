import { readFileSync, writeFileSync, existsSync, openSync, closeSync } from 'fs'
import { join, dirname, basename, extname } from 'path'
import { PDFDocument, PDFName, PDFRawStream, PDFNumber } from 'pdf-lib'
import sharp from 'sharp'
import zlib from 'zlib'

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

function formatSize(bytes: number): string {
  if (bytes >= 1_048_576) {
    return `${(bytes / 1_048_576).toFixed(1)} MB`
  }
  return `${Math.round(bytes / 1024)} KB`
}

export async function compressPdf(filePath: string): Promise<{ outputPath: string; sizeInfo: string }> {
  const initialBytes = readFileSync(filePath)
  const initialSize = initialBytes.length

  const pdfDoc = await PDFDocument.load(initialBytes, {
    ignoreEncryption: true,
    updateMetadata: false
  })

  // 1. Iterate over all indirect objects to find and recompress embedded images
  for (const [, obj] of pdfDoc.context.enumerateIndirectObjects()) {
    if (obj instanceof PDFRawStream) {
      const dict = obj.dict
      const subtype = dict.get(PDFName.of('Subtype'))
      const filter = dict.get(PDFName.of('Filter'))

      if (subtype === PDFName.of('Image')) {
        // Handle JPEG images
        if (filter === PDFName.of('DCTDecode')) {
          try {
            const rawData = obj.contents
            const recompressed = await sharp(rawData)
              .jpeg({ quality: 65, mozjpeg: true })
              .toBuffer()

            if (recompressed.length < rawData.length) {
              obj.contents = recompressed
              dict.set(PDFName.of('Length'), PDFNumber.of(recompressed.length))
            }
          } catch (e) {
            // Silently retain original image if sharp cannot parse or recompress
          }
        } else if (filter === PDFName.of('FlateDecode')) {
          // Handle uncompressed bitmap / PNG streams
          try {
            const width = (dict.get(PDFName.of('Width')) as any)?.asNumber?.()
            const height = (dict.get(PDFName.of('Height')) as any)?.asNumber?.()
            const colorSpace = dict.get(PDFName.of('ColorSpace'))

            if (width && height && colorSpace === PDFName.of('DeviceRGB')) {
              const decompressed = zlib.inflateSync(obj.contents)
              if (decompressed.length >= width * height * 3) {
                const recompressed = await sharp(decompressed.subarray(0, width * height * 3), {
                  raw: { width, height, channels: 3 }
                })
                  .jpeg({ quality: 70, mozjpeg: true })
                  .toBuffer()

                if (recompressed.length < obj.contents.length) {
                  obj.contents = recompressed
                  dict.set(PDFName.of('Filter'), PDFName.of('DCTDecode'))
                  dict.set(PDFName.of('Length'), PDFNumber.of(recompressed.length))
                }
              }
            }
          } catch (e) {
            // Silently retain original stream if conversion not feasible
          }
        }
      }
    }
  }

  // 2. Strip redundant metadata tags
  try {
    pdfDoc.setTitle('')
    pdfDoc.setAuthor('')
    pdfDoc.setSubject('')
    pdfDoc.setKeywords([])
    pdfDoc.setProducer('')
    pdfDoc.setCreator('')
  } catch {}

  // 3. Save with object streams enabled (compresses cross-reference tables and streams)
  const compressedBytes = await pdfDoc.save({
    useObjectStreams: true,
    addDefaultPage: false
  })

  const dir = dirname(filePath)
  const base = basename(filePath, extname(filePath))
  const outPath = getUniquePath(dir, `${base} (Compressed)`)

  writeFileSync(outPath, compressedBytes)
  const finalSize = compressedBytes.length

  const sizeInfo = `${formatSize(initialSize)} → ${formatSize(finalSize)}`
  console.log(`[pdf-compress] Compressed ${filePath}: ${sizeInfo} saved to ${outPath}`)

  return {
    outputPath: outPath,
    sizeInfo
  }
}
