import sharp from 'sharp'
import { extname, join, dirname, basename } from 'path'
import type { CropParams } from '../../shared/ipc-types'

export async function cropImage(inputPath: string, params: CropParams): Promise<string> {
  const ext = extname(inputPath).toLowerCase()
  const base = basename(inputPath, ext)
  const outputPath = join(dirname(inputPath), `${base}_cropped${ext}`)

  const meta = await sharp(inputPath).metadata()
  const imgW = meta.width ?? 800
  const imgH = meta.height ?? 600

  const left = Math.max(0, Math.min(Math.round(params.left || 0), imgW - 2))
  const top = Math.max(0, Math.min(Math.round(params.top || 0), imgH - 2))
  const width = Math.max(1, Math.min(Math.round(params.width || imgW / 2), imgW - left))
  const height = Math.max(1, Math.min(Math.round(params.height || imgH / 2), imgH - top))

  await sharp(inputPath)
    .extract({ left, top, width, height })
    .toFile(outputPath)

  return outputPath
}
