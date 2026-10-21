import { statSync } from 'fs'
import path from 'path'
import type { ActionId, PopupParams, ConvertFormatParams, CropParams, CompressParams } from '../../shared/ipc-types'
import { convertToPdf } from './convert-pdf'
import { convertFormat } from './convert-format'
import { cropImage } from './crop'
import { compressImage } from './compress'
import { shell } from 'electron'

export interface ProcessResult {
  outputPath: string
  sizeInfo?: string
}

export async function processAction(
  action: ActionId,
  filePath: string,
  params?: PopupParams
): Promise<ProcessResult> {
  switch (action) {
    case 'convert-pdf': {
      const out = await convertToPdf(filePath)
      return { outputPath: out }
    }

    case 'convert-format': {
      if (!params) throw new Error('convert-format requires params')
      const out = await convertFormat(filePath, params as ConvertFormatParams)
      return { outputPath: out }
    }

    case 'crop': {
      if (!params) throw new Error('crop requires params')
      const out = await cropImage(filePath, params as CropParams)
      return { outputPath: out }
    }

    case 'compress': {
      if (!params) throw new Error('compress requires params')
      const result = await compressImage(filePath, params as CompressParams)
      return result
    }


    case 'copy': {
      // Handled in main/index.ts via clipboard API
      return { outputPath: filePath }
    }

    default:
      throw new Error(`Unknown action: ${action}`)
  }
}

export function getFileSizeLabel(filePath: string): string {
  try {
    const bytes = statSync(filePath).size
    return bytes >= 1_048_576
      ? `${(bytes / 1_048_576).toFixed(1)} MB`
      : `${Math.round(bytes / 1024)} KB`
  } catch {
    return ''
  }
}
