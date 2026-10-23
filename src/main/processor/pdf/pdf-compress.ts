import { readFileSync, writeFileSync, statSync, existsSync, openSync, closeSync } from 'fs'
import { join, dirname, basename, extname } from 'path'
import { PDFDocument } from 'pdf-lib'

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

  // Optimize document by saving with object streams enabled
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
