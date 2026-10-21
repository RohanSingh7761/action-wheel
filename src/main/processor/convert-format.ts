import sharp from 'sharp'
import { extname, join, dirname, basename, resolve } from 'path'
import type { ConvertFormatParams } from '../../shared/ipc-types'

export async function convertFormat(
  inputPath: string,
  params: ConvertFormatParams
): Promise<string> {
  const ext = extname(inputPath).toLowerCase()
  const base = basename(inputPath, ext)
  const targetExt = params.format === 'jpg' ? 'jpg' : params.format
  let outputPath = join(dirname(inputPath), `${base}.${targetExt}`)

  // Avoid overwriting source file if same format
  if (resolve(inputPath) === resolve(outputPath)) {
    outputPath = join(dirname(inputPath), `${base}_converted.${targetExt}`)
  }

  const sharpInst = sharp(inputPath)

  switch (params.format) {
    case 'webp':
      await sharpInst.webp({ quality: params.quality }).toFile(outputPath)
      break
    case 'png':
      await sharpInst.png({ compressionLevel: Math.max(1, Math.min(9, Math.round(9 - (params.quality / 100) * 8))) }).toFile(outputPath)
      break
    case 'jpg':
      await sharpInst.jpeg({ quality: params.quality, mozjpeg: true }).toFile(outputPath)
      break
    case 'avif':
      await sharpInst.avif({ quality: params.quality }).toFile(outputPath)
      break
    case 'tiff':
      await sharpInst.tiff({ quality: params.quality }).toFile(outputPath)
      break
    default:
      await sharpInst.webp({ quality: params.quality }).toFile(outputPath)
      break
  }

  return outputPath
}
