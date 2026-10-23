// ─── Shared IPC Types ────────────────────────────────────────────────────────
// This file is the single source of truth for all IPC channels and payloads.
// Imported by main, preload, and renderer code.

export type FileType = 'image' | 'pdf'

export type ActionId =
  | 'convert-pdf'
  | 'convert-format'
  | 'crop'
  | 'compress'
  | 'copy'
  | 'more'
  | 'pdf-edit'
  | 'pdf-sign'
  | 'pdf-split'
  | 'pdf-to-images'
  | 'pdf-compress'
  | 'pdf-protect'
  | 'pdf-merge'

export interface ActionMeta {
  id: ActionId
  label: string
  multipleLabel?: string
  icon: string
  color: string
  accentColor: string
  needsParams: boolean
}

export const ACTIONS: ActionMeta[] = [
  {
    id: 'convert-pdf',
    label: 'To PDF',
    multipleLabel: 'All to PDF',
    icon: 'pdf',
    color: '#13151b',
    accentColor: '#ffffff',
    needsParams: false
  },
  {
    id: 'convert-format',
    label: 'Convert',
    multipleLabel: 'Convert All',
    icon: 'convert',
    color: '#13151b',
    accentColor: '#ffffff',
    needsParams: true
  },
  {
    id: 'crop',
    label: 'Crop',
    multipleLabel: 'Crop All',
    icon: 'crop',
    color: '#13151b',
    accentColor: '#ffffff',
    needsParams: true
  },
  {
    id: 'compress',
    label: 'Compress',
    multipleLabel: 'Compress All',
    icon: 'compress',
    color: '#13151b',
    accentColor: '#ffffff',
    needsParams: true
  }
]

export const PDF_ACTIONS_SINGLE: ActionMeta[] = [
  {
    id: 'pdf-edit',
    label: 'Edit',
    icon: 'edit',
    color: '#13151b',
    accentColor: '#ffffff',
    needsParams: true
  },
  {
    id: 'pdf-sign',
    label: 'Sign',
    icon: 'sign',
    color: '#13151b',
    accentColor: '#ffffff',
    needsParams: true
  },
  {
    id: 'pdf-split',
    label: 'Split',
    icon: 'split',
    color: '#13151b',
    accentColor: '#ffffff',
    needsParams: true
  },
  {
    id: 'pdf-to-images',
    label: 'To Images',
    icon: 'convert',
    color: '#13151b',
    accentColor: '#ffffff',
    needsParams: true
  },
  {
    id: 'pdf-compress',
    label: 'Compress',
    icon: 'compress',
    color: '#13151b',
    accentColor: '#ffffff',
    needsParams: false
  },
  {
    id: 'pdf-protect',
    label: 'Protect',
    icon: 'lock',
    color: '#13151b',
    accentColor: '#ffffff',
    needsParams: true
  }
]

export const PDF_ACTIONS_MULTIPLE: ActionMeta[] = [
  {
    id: 'pdf-merge',
    label: 'Merge All',
    icon: 'merge',
    color: '#13151b',
    accentColor: '#ffffff',
    needsParams: true
  },
  {
    id: 'pdf-compress',
    label: 'Compress All',
    icon: 'compress',
    color: '#13151b',
    accentColor: '#ffffff',
    needsParams: false
  },
  {
    id: 'pdf-to-images',
    label: 'To Images',
    icon: 'convert',
    color: '#13151b',
    accentColor: '#ffffff',
    needsParams: true
  },
  {
    id: 'pdf-protect',
    label: 'Protect All',
    icon: 'lock',
    color: '#13151b',
    accentColor: '#ffffff',
    needsParams: true
  }
]

// ─── IPC Channel Names ────────────────────────────────────────────────────────

export const IPC = {
  // Main → Overlay
  OVERLAY_TRIGGER: 'overlay:trigger',       // show wheel
  OVERLAY_PROCESSING: 'overlay:processing', // show progress ring
  OVERLAY_DONE: 'overlay:done',             // show toast
  OVERLAY_ERROR: 'overlay:error',           // show error toast
  OVERLAY_HIDE: 'overlay:hide',             // hide wheel

  // Overlay → Main
  ACTION_SELECT: 'action:select',           // invoke → { needsParams }
  WHEEL_DISMISS: 'wheel:dismiss',           // notify

  // Main → Popup
  POPUP_INIT: 'popup:init',                 // send context

  // Popup → Main
  POPUP_CONFIRM: 'popup:confirm',           // invoke → void
  POPUP_CANCEL: 'popup:cancel',             // notify
  IMAGE_LOAD_PREVIEW: 'image:load-preview', // invoke → { dataUrl, width, height }
  PDF_LOAD_BYTES: 'pdf:load-bytes'          // invoke → { isEncrypted: boolean, buffer?: Uint8Array }
} as const

// ─── Payload Types ────────────────────────────────────────────────────────────

export interface TriggerPayload {
  filePath: string
  filePaths?: string[]
  fileType?: FileType
  pageCount?: number
  isMultiple?: boolean
  cursorX: number
  cursorY: number
  timestamp?: number
  /** base64 thumbnail, max 120x120 */
  thumbnail?: string
}

export interface ProcessingPayload {
  action: ActionId
}

export interface DonePayload {
  action: ActionId
  outputPath: string
  /** e.g. "2.1 MB → 820 KB" */
  sizeInfo?: string
}

export interface ErrorPayload {
  message: string
}

export interface ActionSelectPayload {
  action: ActionId
  filePath: string
  filePaths?: string[]
  fileType?: FileType
}

export interface ActionSelectResult {
  needsParams: boolean
}

export interface PopupInitPayload {
  action: ActionId
  filePath: string
  filePaths?: string[]
  fileType?: FileType
  pageCount?: number
  isMultiple?: boolean
}

export interface ConvertFormatParams {
  format: 'webp' | 'png' | 'jpg' | 'avif' | 'tiff' | 'bmp'
  quality: number
}

export interface CropParams {
  left: number
  top: number
  width: number
  height: number
}

export interface CompressParams {
  quality: number
}

export interface PdfReorderParams {
  orderedPaths: string[]
  outputName?: string
}

export interface PdfSignParams {
  signatureDataUrl: string
  page: number
  x: number // percent 0..100 or pt
  y: number // percent 0..100 or pt
  width: number
  height: number
}

export interface PdfSplitParams {
  selectedPages: number[]
  outputName?: string
}

export interface PdfProtectParams {
  mode: 'protect' | 'unlock'
  password?: string
}

export interface PdfEditAnnotation {
  type: 'text' | 'whiteout' | 'redact' | 'highlight'
  page: number
  x: number
  y: number
  width?: number
  height?: number
  text?: string
  fontSize?: number
  color?: string
}

export interface PdfEditParams {
  annotations: PdfEditAnnotation[]
}

export interface PdfMergeParams {
  orderedPaths: string[]
  outputName?: string
}

export interface PdfToImagesParams {
  images: Array<{ pageNumber: number; dataUrl: string }>
}

export type PopupParams =
  | ConvertFormatParams
  | CropParams
  | CompressParams
  | PdfReorderParams
  | PdfSignParams
  | PdfSplitParams
  | PdfProtectParams
  | PdfEditParams
  | PdfMergeParams
  | PdfToImagesParams

export interface PopupConfirmPayload {
  params: PopupParams
}
