// Cached dynamic loader for pdfjs-dist ESM in CommonJS Electron main process
let pdfjsModule: any = null

export async function getPdfjs(): Promise<any> {
  if (pdfjsModule) return pdfjsModule
  // Using new Function prevents Vite / esbuild / Rollup from transpiling import() into require()
  const dynamicImport = new Function('specifier', 'return import(specifier)')
  pdfjsModule = await dynamicImport('pdfjs-dist/legacy/build/pdf.mjs')
  return pdfjsModule
}
