import { readFileSync, writeFileSync, existsSync, openSync, closeSync } from 'fs'
import { PDFDocument } from 'pdf-lib'
import { extname, join, dirname, basename } from 'path'
import type { PdfSplitParams } from '../../shared/ipc-types'

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

export async function splitPdf(filePath: string, params: PdfSplitParams): Promise<string> {
  const fileBytes = readFileSync(filePath)
  const srcDoc = await PDFDocument.load(fileBytes)
  const totalPages = srcDoc.getPageCount()

  const validIndices = params.selectedPages
    .map((p) => p - 1)
    .filter((idx) => idx >= 0 && idx < totalPages)

  if (validIndices.length === 0) {
    throw new Error('No valid pages selected for extraction')
  }

  const newDoc = await PDFDocument.create()
  const copiedPages = await newDoc.copyPages(srcDoc, validIndices)
  copiedPages.forEach((p) => newDoc.addPage(p))

  const dir = dirname(filePath)
  const base = basename(filePath, extname(filePath))
  const custom = params.outputName?.trim()
  const cleanBase = custom
    ? custom.replace(/\.pdf$/i, '')
    : `${base} (Extracted - ${validIndices.length} pages)`
  const outPath = getUniquePath(dir, cleanBase)

  const outBytes = await newDoc.save()
  writeFileSync(outPath, outBytes)
  console.log(`[pdf-split] Successfully extracted ${validIndices.length} page(s) to ${outPath}`)
  return outPath
}
