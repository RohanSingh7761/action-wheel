import { readFileSync } from 'fs'
import { isEncrypted } from '@pdfsmaller/pdf-decrypt'

export interface LoadPdfBytesResult {
  isEncrypted: boolean
  base64?: string
}

export async function loadPdfBytes(filePath: string): Promise<LoadPdfBytesResult> {
  const fileBytes = readFileSync(filePath)
  const encInfo = await isEncrypted(fileBytes)
  if (encInfo.encrypted) {
    return {
      isEncrypted: true
    }
  }

  return {
    isEncrypted: false,
    base64: fileBytes.toString('base64')
  }
}
