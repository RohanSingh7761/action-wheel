import sharp from 'sharp'
import { extname, join, dirname, basename } from 'path'
import type { CropParams } from '../../shared/ipc-types'

export async function cropImage(inputPath: string, params: CropParams): Promise<string> {
  const ext = extname(inputPath).toLowerCase()
  const base = basename(inputPath, ext)
  const outputPath = join(dirname(inputPath), `${base}_cropped${ext}`)

  await sharp(inputPath)
    .extract({
      left: Math.round(params.left),
      top: Math.round(params.top),
      width: Math.round(params.width),
      height: Math.round(params.height)
    })
    .toFile(outputPath)

  return outputPath
}
