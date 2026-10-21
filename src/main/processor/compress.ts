import sharp from 'sharp'
import { statSync } from 'fs'
import { extname, join, dirname, basename } from 'path'
import type { CompressParams } from '../../shared/ipc-types'

export async function compressImage(
  inputPath: string,
  params: CompressParams
): Promise<{ outputPath: string; sizeInfo: string }> {
  const ext = extname(inputPath).toLowerCase()
  const base = basename(inputPath, ext)
  const outputPath = join(dirname(inputPath), `${base}_compressed${ext}`)
  const originalSize = statSync(inputPath).size

  const sharpInst = sharp(inputPath)

  if (ext === '.jpg' || ext === '.jpeg') {
    await sharpInst.jpeg({ quality: params.quality, mozjpeg: true }).toFile(outputPath)
  } else if (ext === '.png') {
    await sharpInst.png({ quality: params.quality, compressionLevel: 9 }).toFile(outputPath)
  } else if (ext === '.webp') {
    await sharpInst.webp({ quality: params.quality }).toFile(outputPath)
  } else if (ext === '.avif') {
    await sharpInst.avif({ quality: params.quality }).toFile(outputPath)
  } else {
    // Fallback: convert to high-quality webp
    const webpPath = join(dirname(inputPath), `${base}_compressed.webp`)
    await sharpInst.webp({ quality: params.quality }).toFile(webpPath)
    return {
      outputPath: webpPath,
      sizeInfo: formatSizeInfo(originalSize, statSync(webpPath).size)
    }
  }

  return {
    outputPath,
    sizeInfo: formatSizeInfo(originalSize, statSync(outputPath).size)
  }
}

function formatSizeInfo(original: number, compressed: number): string {
  const fmt = (b: number) =>
    b >= 1_048_576 ? `${(b / 1_048_576).toFixed(1)} MB` : `${Math.round(b / 1024)} KB`
  const pct = Math.round((1 - compressed / original) * 100)
  return `${fmt(original)} → ${fmt(compressed)} (${pct}% smaller)`
}
