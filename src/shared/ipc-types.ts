// ─── Shared IPC Types ────────────────────────────────────────────────────────
// This file is the single source of truth for all IPC channels and payloads.
// Imported by main, preload, and renderer code.

export type ActionId =
  | 'convert-pdf'
  | 'convert-format'
  | 'crop'
  | 'compress'
  | 'edit'
  | 'copy'
  | 'more'

export interface ActionMeta {
  id: ActionId
  label: string
  icon: string
  color: string
  accentColor: string
  needsParams: boolean
}

export const ACTIONS: ActionMeta[] = [
  {
    id: 'convert-pdf',
    label: 'To PDF',
    icon: '📄',
    color: 'rgba(251,113,133,0.85)',
    accentColor: '#fb7185',
    needsParams: false
  },
  {
    id: 'convert-format',
    label: 'Convert',
    icon: '🔄',
    color: 'rgba(96,165,250,0.85)',
    accentColor: '#60a5fa',
    needsParams: true
  },
  {
    id: 'crop',
    label: 'Crop',
    icon: '✂️',
    color: 'rgba(52,211,153,0.85)',
    accentColor: '#34d399',
    needsParams: true
  },
  {
    id: 'compress',
    label: 'Compress',
    icon: '🗜️',
    color: 'rgba(167,139,250,0.85)',
    accentColor: '#a78bfa',
    needsParams: true
  },
  {
    id: 'edit',
    label: 'Edit',
    icon: '🎨',
    color: 'rgba(251,191,36,0.85)',
    accentColor: '#fbbf24',
    needsParams: false
  },
  {
    id: 'copy',
    label: 'Copy',
    icon: '📋',
    color: 'rgba(45,212,191,0.85)',
    accentColor: '#2dd4bf',
    needsParams: false
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

  // Hub → Main
  HUB_TRIGGER_DEMO: 'hub:trigger-demo',
  HUB_SELECT_FILE: 'hub:select-file',
  HUB_DROP_FILE: 'hub:drop-file',
  HUB_MINIMIZE: 'hub:minimize',
  HUB_QUIT: 'hub:quit'
} as const

// ─── Payload Types ────────────────────────────────────────────────────────────

export interface TriggerPayload {
  filePath: string
  cursorX: number
  cursorY: number
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
}

export interface ActionSelectResult {
  needsParams: boolean
}

export interface PopupInitPayload {
  action: ActionId
  filePath: string
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

export type PopupParams = ConvertFormatParams | CropParams | CompressParams

export interface PopupConfirmPayload {
  params: PopupParams
}
