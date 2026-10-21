// ─── Shared IPC Types ────────────────────────────────────────────────────────
// This file is the single source of truth for all IPC channels and payloads.
// Imported by main, preload, and renderer code.

export type ActionId =
  | 'convert-pdf'
  | 'convert-format'
  | 'crop'
  | 'compress'
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
    icon: 'pdf',
    color: '#13151b',
    accentColor: '#ffffff',
    needsParams: false
  },
  {
    id: 'convert-format',
    label: 'Convert',
    icon: 'convert',
    color: '#13151b',
    accentColor: '#ffffff',
    needsParams: true
  },
  {
    id: 'crop',
    label: 'Crop',
    icon: 'crop',
    color: '#13151b',
    accentColor: '#ffffff',
    needsParams: true
  },
  {
    id: 'compress',
    label: 'Compress',
    icon: 'compress',
    color: '#13151b',
    accentColor: '#ffffff',
    needsParams: true
  },
  {
    id: 'copy',
    label: 'Copy',
    icon: 'copy',
    color: '#13151b',
    accentColor: '#ffffff',
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
