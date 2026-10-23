import { readFileSync, writeFileSync, existsSync, openSync, closeSync } from 'fs'
import { join, dirname, basename, extname } from 'path'
import { encryptPDF } from '@pdfsmaller/pdf-encrypt'
import { decryptPDF, isEncrypted } from '@pdfsmaller/pdf-decrypt'
import type { PdfProtectParams } from '../../shared/ipc-types'

function getUniquePath(dir: string, base: string, ext = '.pdf'): string {
  let outputPath = join(dir, `${base}${ext}`)
  let counter = 1
  while (existsSync(outputPath)) {
    try {
      const fd = openSync(outputPath, 'r+')
      closeSync(fd)
      break
    } catch {
      outputPath = join(dir, `${base} (${counter})${ext}`)
      counter++
    }
  }
  return outputPath
}

export async function protectOrUnlockPdf(
  filePath: string,
  params: PdfProtectParams
): Promise<string> {
  const fileBytes = readFileSync(filePath)
  const dir = dirname(filePath)
  const base = basename(filePath, extname(filePath))
  const password = params.password || ''

  if (params.mode === 'protect') {
    if (!password) {
      throw new Error('A password is required to protect the PDF')
    }
    const encryptedBytes = await encryptPDF(fileBytes, password, { keyLength: 256 })
    const outPath = getUniquePath(dir, `${base} (Protected)`)
    writeFileSync(outPath, Buffer.from(encryptedBytes))
    console.log(`[pdf-protect] Protected PDF saved to ${outPath}`)
    return outPath
  } else {
    // Unlock mode
    const decryptedBytes = await decryptPDF(fileBytes, password)
    const outPath = getUniquePath(dir, `${base} (Unlocked)`)
    writeFileSync(outPath, Buffer.from(decryptedBytes))
    console.log(`[pdf-protect] Unlocked PDF saved to ${outPath}`)
    return outPath
  }
}

export async function checkIsPdfEncrypted(filePath: string): Promise<boolean> {
  try {
    const fileBytes = readFileSync(filePath)
    const res = await isEncrypted(fileBytes)
    return Boolean(res.encrypted)
  } catch (err) {
    console.warn('[pdf-protect] isEncrypted check failed:', err)
    return false
  }
}
