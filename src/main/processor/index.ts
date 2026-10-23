import { statSync } from 'fs'
import type {
  ActionId,
  PopupParams,
  ConvertFormatParams,
  CropParams,
  CompressParams,
  PdfReorderParams,
  PdfSignParams,
  PdfSplitParams,
  PdfProtectParams,
  PdfEditParams,
  PdfMergeParams,
  PdfToImagesParams
} from '../../shared/ipc-types'
import { convertToPdf, convertMultipleToPdf } from './convert-pdf'
import { convertFormat } from './convert-format'
import { cropImage } from './crop'
import { compressImage } from './compress'

import { signPdf } from './pdf/pdf-sign'
import { splitPdf } from './pdf/pdf-split'
import { mergePdfs } from './pdf/pdf-merge'
import { savePdfImages } from './pdf/pdf-to-images'
import { protectOrUnlockPdf } from './pdf/pdf-protect'
import { compressPdf } from './pdf/pdf-compress'
import { editPdf } from './pdf/pdf-edit'

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
      if (params && 'orderedPaths' in params) {
        const reorder = params as PdfReorderParams
        const out = await convertMultipleToPdf(reorder.orderedPaths, reorder.outputName)
        return { outputPath: out }
      }
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

    case 'pdf-edit': {
      if (!params) throw new Error('pdf-edit requires params')
      const out = await editPdf(filePath, params as PdfEditParams)
      return { outputPath: out }
    }

    case 'pdf-sign': {
      if (!params) throw new Error('pdf-sign requires params')
      const out = await signPdf(filePath, params as PdfSignParams)
      return { outputPath: out }
    }

    case 'pdf-split': {
      if (!params) throw new Error('pdf-split requires params')
      const out = await splitPdf(filePath, params as PdfSplitParams)
      return { outputPath: out }
    }

    case 'pdf-to-images': {
      if (!params || !('images' in params)) throw new Error('pdf-to-images requires images')
      const result = await savePdfImages(filePath, (params as PdfToImagesParams).images)
      return result
    }

    case 'pdf-compress': {
      const result = await compressPdf(filePath)
      return result
    }

    case 'pdf-protect': {
      if (!params) throw new Error('pdf-protect requires params')
      const out = await protectOrUnlockPdf(filePath, params as PdfProtectParams)
      return { outputPath: out }
    }

    case 'pdf-merge': {
      const out = await mergePdfs([filePath], params as PdfMergeParams | undefined)
      return { outputPath: out }
    }

    default:
      throw new Error(`Unknown action: ${action}`)
  }
}

export async function processBatchAction(
  action: ActionId,
  filePaths: string[],
  params?: PopupParams
): Promise<ProcessResult> {
  if (!filePaths || filePaths.length === 0) {
    throw new Error('No files provided')
  }

  if (action === 'convert-pdf') {
    const paths = params && 'orderedPaths' in params ? (params as PdfReorderParams).orderedPaths : filePaths
    const customName = params && 'outputName' in params ? (params as PdfReorderParams).outputName : undefined
    const out = await convertMultipleToPdf(paths, customName)
    return { outputPath: out }
  }

  if (action === 'pdf-merge') {
    const out = await mergePdfs(filePaths, params as PdfMergeParams | undefined)
    return {
      outputPath: out,
      sizeInfo: `${filePaths.length} PDFs merged`
    }
  }

  let lastOut = ''
  for (const file of filePaths) {
    const res = await processAction(action, file, params)
    lastOut = res.outputPath
  }

  return {
    outputPath: lastOut,
    sizeInfo: `${filePaths.length} files processed`
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
