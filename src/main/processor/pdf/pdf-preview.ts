import { readFileSync } from 'fs'
import { isEncrypted } from '@pdfsmaller/pdf-decrypt'

export interface LoadPdfBytesResult {
  isEncrypted: boolean
  bytes?: Buffer
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
    bytes: fileBytes
  }
}
