import { writeFileSync, existsSync, mkdirSync } from 'fs'
import { join, dirname, basename, extname } from 'path'

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

export interface SavePdfImageItem {
  pageNumber: number
  dataUrl: string
}

export async function savePdfImages(
  filePath: string,
  images: SavePdfImageItem[]
): Promise<{ outputPath: string; sizeInfo?: string }> {
  const dir = dirname(filePath)
  const base = basename(filePath, extname(filePath))
  const pageCount = images.length

  if (pageCount === 0) {
    throw new Error('No images to save')
  }

  const exportToFolder = pageCount > 10
  const outDir = exportToFolder ? getUniqueDir(dir, `${base} (Images)`) : dir
  const savedFiles: string[] = []
  const padDigits = pageCount >= 100 ? 3 : 2

  for (const item of images) {
    const paddedNum = String(item.pageNumber).padStart(padDigits, '0')
    const fileBase = exportToFolder ? `page-${paddedNum}` : `${base}_page_${item.pageNumber}`
    const pageFilePath = exportToFolder
      ? join(outDir, `${fileBase}.png`)
      : getUniquePath(outDir, fileBase, '.png')

    const base64Data = item.dataUrl.replace(/^data:image\/\w+;base64,/, '')
    writeFileSync(pageFilePath, Buffer.from(base64Data, 'base64'))
    savedFiles.push(pageFilePath)
  }

  console.log(`[pdf-to-images] Successfully saved ${pageCount} images from ${filePath}`)
  return {
    outputPath: exportToFolder ? outDir : savedFiles[0],
    sizeInfo: exportToFolder ? `${pageCount} images saved in folder` : `${pageCount} images exported`
  }
}

export async function saveBatchPdfImages(
  batch: Record<string, SavePdfImageItem[]>
): Promise<{ outputPath: string; sizeInfo?: string }> {
  let lastOut = ''
  let totalSaved = 0
  const fileCount = Object.keys(batch).length

  for (const [filePath, images] of Object.entries(batch)) {
    if (images && images.length > 0) {
      const res = await savePdfImages(filePath, images)
      lastOut = res.outputPath
      totalSaved += images.length
    }
  }

  return {
    outputPath: lastOut,
    sizeInfo: `${totalSaved} images saved across ${fileCount} PDFs`
  }
}
