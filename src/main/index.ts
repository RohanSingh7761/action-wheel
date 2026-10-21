import {
  app,
  BrowserWindow,
  globalShortcut,
  ipcMain,
  Tray,
  Menu,
  nativeImage,
  dialog,
  clipboard,
  screen,
  shell,
  session
} from 'electron'
import { join } from 'path'
import { existsSync } from 'fs'
import { is } from '@electron-toolkit/utils'
import { WebSocketServer, WebSocket } from 'ws'
import sharp from 'sharp'
import { spawn, type ChildProcess } from 'child_process'

import {
  IPC,
  ACTIONS,
  type ActionId,
  type TriggerPayload,
  type PopupParams,
  type ActionSelectPayload,
  type PopupConfirmPayload,
  type PopupInitPayload
} from '../shared/ipc-types'

import {
  createOverlayWindow,
  getOverlayWindow,
  showOverlay,
  hideOverlay,
  enableMouseOnOverlay,
  disableMouseOnOverlay
} from './windows/overlay'

import {
  createPopupWindow,
  getPopupWindow,
  showPopup,
  hidePopup
} from './windows/popup'

import {
  createHubWindow,
  getHubWindow,
  showHub,
  hideHub
} from './windows/hub'

import { processAction } from './processor/index'

// ─── State ────────────────────────────────────────────────────────────────────

let tray: Tray | null = null
let currentFilePath: string | null = null
let currentCursorX = 0
let currentCursorY = 0
let pendingAction: ActionId | null = null

function getDemoImagePath(): string {
  const samplePath = join(__dirname, '../../resources/sample.jpg')
  if (existsSync(samplePath)) return samplePath
  const altPath = join(app.getAppPath(), 'resources/sample.jpg')
  if (existsSync(altPath)) return altPath
  return samplePath
}

// ─── System Tray ──────────────────────────────────────────────────────────────

function createTraySafe(): void {
  try {
    const iconPath = join(__dirname, '../../resources/icon.png')
    const icon = existsSync(iconPath)
      ? nativeImage.createFromPath(iconPath)
      : nativeImage.createEmpty()

    tray = new Tray(icon)
    const menu = Menu.buildFromTemplate([
      { label: '🌀 Action Wheel', enabled: false },
      { type: 'separator' },
      { label: 'Open Hub', click: () => showHub() },
      { label: 'Test Wheel (Ctrl+Shift+W)', click: () => triggerDemoWheel() },
      { type: 'separator' },
      { label: 'Quit', click: () => app.quit() }
    ])
    tray.setToolTip('Action Wheel — Image Tools')
    tray.setContextMenu(menu)
    tray.on('click', () => showHub())
  } catch (err) {
    console.warn('[tray] System tray creation skipped:', err)
  }
}

// ─── Wheel Triggers ───────────────────────────────────────────────────────────

export async function triggerDemoWheel(): Promise<void> {
  const cursor = screen.getCursorScreenPoint()
  const sampleFile = getDemoImagePath()
  await triggerWheel(sampleFile, cursor.x, cursor.y)
}

export async function triggerWithFilePicker(): Promise<void> {
  const hubWin = getHubWindow()
  const result = await dialog.showOpenDialog(hubWin ?? undefined, {
    title: 'Select Image for Action Wheel',
    filters: [
      { name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'webp', 'gif', 'bmp', 'tiff', 'avif', 'svg'] }
    ],
    properties: ['openFile']
  })

  if (result.canceled || result.filePaths.length === 0) return

  const filePath = result.filePaths[0]
  const cursor = screen.getCursorScreenPoint()
  await triggerWheel(filePath, cursor.x, cursor.y)
}

export async function triggerWheel(filePath: string, cursorX: number, cursorY: number): Promise<void> {
  currentFilePath = filePath
  currentCursorX = cursorX
  currentCursorY = cursorY

  // Generate thumbnail
  let thumbnail: string | undefined
  try {
    const thumbBuffer = await sharp(filePath)
      .resize(120, 120, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toBuffer()
    thumbnail = `data:image/png;base64,${thumbBuffer.toString('base64')}`
  } catch (err) {
    console.warn('[thumbnail] Could not generate preview thumbnail:', err)
    thumbnail = undefined
  }

  const overlayWin = getOverlayWindow()
  if (!overlayWin) return

  enableMouseOnOverlay()
  showOverlay()

  const payload: TriggerPayload = { filePath, cursorX, cursorY, thumbnail }
  overlayWin.webContents.send(IPC.OVERLAY_TRIGGER, payload)
}

// ─── IPC Handlers ─────────────────────────────────────────────────────────────

function registerIpcHandlers(): void {
  // Overlay selects an action
  ipcMain.handle(IPC.ACTION_SELECT, async (_e, { action, filePath }: ActionSelectPayload) => {
    currentFilePath = filePath
    const meta = ACTIONS.find(a => a.id === action)

    // Handle copy immediately
    if (action === 'copy') {
      try {
        const img = nativeImage.createFromPath(filePath)
        clipboard.writeImage(img)
        const overlayWin = getOverlayWindow()
        overlayWin?.webContents.send(IPC.OVERLAY_DONE, {
          action,
          outputPath: filePath,
          sizeInfo: 'Copied to clipboard'
        })
      } catch (err) {
        const overlayWin = getOverlayWindow()
        overlayWin?.webContents.send(IPC.OVERLAY_ERROR, { message: String(err) })
      }
      return { needsParams: false }
    }

    if (meta?.needsParams) {
      pendingAction = action as ActionId

      // Show popup near cursor
      const popupWin = getPopupWindow()
      if (popupWin) {
        const initPayload: PopupInitPayload = { action, filePath }
        showPopup(currentCursorX, currentCursorY)
        setTimeout(() => {
          popupWin.webContents.send(IPC.POPUP_INIT, initPayload)
        }, 150)
      }
      return { needsParams: true }
    }

    // No params needed — process immediately
    processImmediate(action as ActionId, filePath)
    return { needsParams: false }
  })

  // Overlay dismissed (click outside)
  ipcMain.on(IPC.WHEEL_DISMISS, () => {
    hideWheel()
  })

  // Popup confirmed with params
  ipcMain.handle(IPC.POPUP_CONFIRM, async (_e, { params }: PopupConfirmPayload) => {
    hidePopup()
    if (!currentFilePath || !pendingAction) return

    const overlayWin = getOverlayWindow()
    overlayWin?.webContents.send(IPC.OVERLAY_PROCESSING, { action: pendingAction })

    try {
      const result = await processAction(pendingAction, currentFilePath, params)
      overlayWin?.webContents.send(IPC.OVERLAY_DONE, {
        action: pendingAction,
        outputPath: result.outputPath,
        sizeInfo: result.sizeInfo
      })
      shell.showItemInFolder(result.outputPath)
    } catch (err) {
      overlayWin?.webContents.send(IPC.OVERLAY_ERROR, { message: String(err) })
    }
  })

  // Popup cancelled
  ipcMain.on(IPC.POPUP_CANCEL, () => {
    hidePopup()
  })

  // Hub actions
  ipcMain.on(IPC.HUB_TRIGGER_DEMO, () => {
    triggerDemoWheel()
  })

  ipcMain.on(IPC.HUB_SELECT_FILE, () => {
    triggerWithFilePicker()
  })

  ipcMain.on(IPC.HUB_DROP_FILE, (_e, filePath: string) => {
    const cursor = screen.getCursorScreenPoint()
    triggerWheel(filePath, cursor.x, cursor.y)
  })

  ipcMain.on(IPC.HUB_MINIMIZE, () => {
    const hub = getHubWindow()
    hub?.minimize()
  })

  ipcMain.on(IPC.HUB_QUIT, () => {
    app.quit()
  })
}

async function processImmediate(action: ActionId, filePath: string): Promise<void> {
  const overlayWin = getOverlayWindow()
  overlayWin?.webContents.send(IPC.OVERLAY_PROCESSING, { action })

  try {
    const result = await processAction(action, filePath)
    overlayWin?.webContents.send(IPC.OVERLAY_DONE, {
      action,
      outputPath: result.outputPath,
      sizeInfo: result.sizeInfo
    })
    if (action !== 'edit' && action !== 'copy') {
      shell.showItemInFolder(result.outputPath)
    }
  } catch (err) {
    overlayWin?.webContents.send(IPC.OVERLAY_ERROR, { message: String(err) })
  }
}

function hideWheel(): void {
  disableMouseOnOverlay()
  hideOverlay()
  hidePopup()
}

// ─── WebSocket Server (for Native Hook Daemon) ────────────────────────────────

function startHookServer(): void {
  try {
    const wss = new WebSocketServer({ port: 39217, host: '127.0.0.1' })
    wss.on('connection', (ws: WebSocket) => {
      console.log('[hook] Native drag hook connected')
      ws.on('message', async (raw) => {
        try {
          const msg = JSON.parse(raw.toString())
          if (msg.type === 'DRAG_TAB') {
            const { filePath, cursorX, cursorY } = msg
            console.log(`[hook] Trigger from native hook: ${filePath} at (${cursorX}, ${cursorY})`)
            await triggerWheel(filePath, cursorX, cursorY)
          }
        } catch (err) {
          console.error('[hook] Bad message:', err)
        }
      })
    })
    console.log('[hook] WebSocket server listening on ws://127.0.0.1:39217')
  } catch (err) {
    console.error('[hook] Failed to start WebSocket server:', err)
  }
}

let hookProcess: ChildProcess | null = null

function startHookDaemon(): void {
  const scriptPath = join(__dirname, '../../scripts/drag-listener.ps1')
  const altPath = join(app.getAppPath(), 'scripts/drag-listener.ps1')
  const finalPath = existsSync(scriptPath) ? scriptPath : existsSync(altPath) ? altPath : null

  if (finalPath) {
    try {
      hookProcess = spawn('powershell.exe', [
        '-NoProfile',
        '-ExecutionPolicy', 'Bypass',
        '-WindowStyle', 'Hidden',
        '-File', finalPath
      ], { windowsHide: true })

      hookProcess.on('error', (err) => {
        console.warn('[listener] Process error:', err.message)
      })

      hookProcess.stdout?.on('data', (d) => console.log(`[listener] ${d.toString().trim()}`))
      hookProcess.stderr?.on('data', (d) => console.error(`[listener error] ${d.toString().trim()}`))
      console.log(`[listener] Drag + Tab background listener active (PID: ${hookProcess.pid})`)
    } catch (e) {
      console.warn('[listener] Could not start listener:', e)
    }
  } else {
    console.warn('[listener] scripts/drag-listener.ps1 not found at', scriptPath)
  }
}

// ─── App Lifecycle ─────────────────────────────────────────────────────────────

const gotTheLock = app.requestSingleInstanceLock()
if (!gotTheLock) {
  app.quit()
}

app.whenReady().then(async () => {
  // Block any browser permission dialogs (geolocation, camera, etc.)
  session.defaultSession.setPermissionRequestHandler((_wc, _perm, callback) => callback(false))
  session.defaultSession.setPermissionCheckHandler(() => false)

  // Global hotkey: Ctrl+Shift+W as secondary quick trigger
  globalShortcut.register('CommandOrControl+Shift+W', () => {
    console.log('[shortcut] Ctrl+Shift+W triggered')
    triggerDemoWheel()
  })

  createTraySafe()

  // 1. Create transparent wheel overlay (hidden until Tab is pressed while dragging)
  const overlayWin = createOverlayWindow()

  // 2. Create options popup window (hidden until an action needing params is selected)
  createPopupWindow(overlayWin)

  registerIpcHandlers()
  startHookServer()
  startHookDaemon()
})

app.on('will-quit', () => {
  globalShortcut.unregisterAll()
  if (hookProcess) {
    hookProcess.kill()
    hookProcess = null
  }
})

app.on('window-all-closed', (e: Event) => {
  e.preventDefault()
})
