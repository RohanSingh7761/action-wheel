import { readFileSync, writeFileSync, existsSync, openSync, closeSync } from 'fs'
import { PDFDocument } from 'pdf-lib'
import { extname, join, dirname, basename } from 'path'
import type { PdfMergeParams } from '../../shared/ipc-types'

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

export async function mergePdfs(filePaths: string[], params?: PdfMergeParams): Promise<string> {
  const orderedList = params?.orderedPaths && params.orderedPaths.length > 0
    ? params.orderedPaths
    : filePaths

  if (orderedList.length === 0) {
    throw new Error('No PDF files provided to merge')
  }

  const mergedDoc = await PDFDocument.create()

  for (const filePath of orderedList) {
    try {
      const bytes = readFileSync(filePath)
      const srcDoc = await PDFDocument.load(bytes)
      const indices = srcDoc.getPageIndices()
      const copiedPages = await mergedDoc.copyPages(srcDoc, indices)
      copiedPages.forEach((p) => mergedDoc.addPage(p))
    } catch (err) {
      console.warn(`[pdf-merge] Failed to merge ${filePath}:`, err)
    }
  }

  const firstFile = orderedList[0]
  const dir = dirname(firstFile)
  const firstBase = basename(firstFile, extname(firstFile))
  const custom = params?.outputName?.trim()
  const cleanBase = custom
    ? custom.replace(/\.pdf$/i, '')
    : `${firstBase} (Merged - ${orderedList.length} files)`

  const outPath = getUniquePath(dir, cleanBase)
  const outBytes = await mergedDoc.save()
  writeFileSync(outPath, outBytes)
  console.log(`[pdf-merge] Successfully merged ${orderedList.length} PDFs into ${outPath}`)
  return outPath
}
