import sharp from 'sharp'
import { extname, join, dirname, basename } from 'path'
import type { ConvertFormatParams } from '../../shared/ipc-types'

export async function convertFormat(
  inputPath: string,
  params: ConvertFormatParams
): Promise<string> {
  const ext = extname(inputPath).toLowerCase()
  const base = basename(inputPath, ext)
  const outputPath = join(dirname(inputPath), `${base}.${params.format}`)

  const sharpInst = sharp(inputPath)

  switch (params.format) {
    case 'webp':
      await sharpInst.webp({ quality: params.quality }).toFile(outputPath)
      break
    case 'png':
      await sharpInst.png({ quality: params.quality }).toFile(outputPath)
      break
    case 'jpg':
      await sharpInst.jpeg({ quality: params.quality }).toFile(outputPath)
      break
    case 'avif':
      await sharpInst.avif({ quality: params.quality }).toFile(outputPath)
      break
    case 'tiff':
      await sharpInst.tiff({ quality: params.quality }).toFile(outputPath)
      break
    case 'bmp':
      await sharpInst.bmp().toFile(outputPath)
      break
    default:
      throw new Error(`Unsupported format: ${params.format}`)
  }

  return outputPath
}
