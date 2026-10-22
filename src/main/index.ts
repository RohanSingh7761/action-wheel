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
import { spawn, spawnSync, type ChildProcess } from 'child_process'

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
const wsClients = new Set<WebSocket>()

function broadcastWs(msg: object): void {
  const json = JSON.stringify(msg)
  for (const client of wsClients) {
    if (client.readyState === WebSocket.OPEN) {
      try {
        client.send(json)
      } catch (err) {
        console.warn('[ws] send error:', err)
      }
    }
  }
}

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
  broadcastWs({ type: 'WHEEL_OPENED' })

  const payload: TriggerPayload = {
    filePath,
    cursorX,
    cursorY,
    timestamp: Date.now(),
    thumbnail
  }
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
        hideWheel()
      } catch (err) {
        hideWheel()
        console.error('[copy] error:', err)
      }
      return { needsParams: false }
    }

    if (meta?.needsParams) {
      pendingAction = action as ActionId
      currentFilePath = filePath

      // Immediately hide the wheel overlay so it doesn't linger behind the popup
      hideOverlay()
      disableMouseOnOverlay()

      // Show popup near cursor
      const popupWin = getPopupWindow()
      if (popupWin) {
        const initPayload: PopupInitPayload = { action, filePath }
        showPopup(currentCursorX, currentCursorY)
        popupWin.webContents.send(IPC.POPUP_INIT, initPayload)
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

  // Overlay dismissed (click outside / cancel button)
  ipcMain.on(IPC.WHEEL_DISMISS, () => {
    hideWheel()
  })

  // Popup confirmed with params
  ipcMain.handle(IPC.POPUP_CONFIRM, async (_e, { params }: PopupConfirmPayload) => {
    hidePopup()
    if (!currentFilePath || !pendingAction) {
      hideWheel()
      return
    }

    const action = pendingAction
    const filePath = currentFilePath
    pendingAction = null

    try {
      const result = await processAction(action, filePath, params)
      hideWheel()

      if (result.outputPath) {
        shell.openPath(result.outputPath)
      }
    } catch (err) {
      hideWheel()
      console.error('[process] Error processing popup action:', err)
    }
  })

  // Popup cancelled
  ipcMain.on(IPC.POPUP_CANCEL, () => {
    hideWheel()
  })

  // Load image preview for interactive tools like Crop
  ipcMain.handle(IPC.IMAGE_LOAD_PREVIEW, async (_e, filePath: string) => {
    try {
      const meta = await sharp(filePath).metadata()
      const buffer = await sharp(filePath)
        .resize(1200, 1200, { fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: 90 })
        .toBuffer()
      return {
        dataUrl: `data:image/jpeg;base64,${buffer.toString('base64')}`,
        width: meta.width || 800,
        height: meta.height || 600
      }
    } catch (err) {
      console.error('[preview] Error generating preview for crop:', err)
      return null
    }
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

let isProcessingImmediate = false

async function processImmediate(action: ActionId, filePath: string): Promise<void> {
  if (isProcessingImmediate) return
  isProcessingImmediate = true

  const overlayWin = getOverlayWindow()
  overlayWin?.webContents.send(IPC.OVERLAY_PROCESSING, { action })

  try {
    const result = await processAction(action, filePath)
    console.log(`[process] Action ${action} succeeded for ${filePath} -> ${result.outputPath}`)

    overlayWin?.webContents.send(IPC.OVERLAY_DONE, {
      action,
      outputPath: result.outputPath,
      sizeInfo: result.sizeInfo
    })

    // Immediately hide wheel and release mouse events so desktop is completely unblocked
    hideOverlay()
    disableMouseOnOverlay()
    broadcastWs({ type: 'WHEEL_CLOSED' })

    if (action !== 'copy' && result.outputPath) {
      console.log(`[shell] Opening output file: ${result.outputPath}`)
      const openErr = await shell.openPath(result.outputPath)
      if (openErr) {
        console.warn(`[shell] Open path warning: ${openErr}`)
      }
    }
  } catch (err) {
    console.error(`[process] Action ${action} failed:`, err)
    hideOverlay()
    disableMouseOnOverlay()
    broadcastWs({ type: 'WHEEL_CLOSED' })
    overlayWin?.webContents.send(IPC.OVERLAY_ERROR, { message: String(err) })
  } finally {
    isProcessingImmediate = false
  }
}

function hideWheel(): void {
  disableMouseOnOverlay()
  hideOverlay()
  hidePopup()
  pendingAction = null
  currentFilePath = null
  broadcastWs({ type: 'WHEEL_CLOSED' })
}

// ─── WebSocket Server (for Native Hook Daemon) ────────────────────────────────

function startHookServer(): void {
  try {
    const wss = new WebSocketServer({ port: 39217, host: '127.0.0.1' })
    wss.on('connection', (ws: WebSocket) => {
      console.log('[hook] Native drag hook connected')
      wsClients.add(ws)

      ws.on('message', async (raw) => {
        try {
          const msg = JSON.parse(raw.toString())
          if (msg.type === 'DRAG_TAB') {
            const { filePath, cursorX, cursorY } = msg
            const cur = screen.getCursorScreenPoint()
            const finalX = cur ? cur.x : cursorX
            const finalY = cur ? cur.y : cursorY
            console.log(`[hook] Trigger from native hook: ${filePath} at (${finalX}, ${finalY})`)
            await triggerWheel(filePath, finalX, finalY)
          } else if (msg.type === 'DISMISS') {
            console.log('[hook] Dismiss request from native hook')
            hideWheel()
          }
        } catch (err) {
          console.error('[hook] Bad message:', err)
        }
      })

      ws.on('close', () => {
        wsClients.delete(ws)
      })

      ws.on('error', () => {
        wsClients.delete(ws)
      })
    })
    console.log('[hook] WebSocket server listening on ws://127.0.0.1:39217')
  } catch (err) {
    console.error('[hook] Failed to start WebSocket server:', err)
  }
}

let hookProcess: ChildProcess | null = null

function startHookDaemon(): void {
  // 1. Check for pre-compiled native listener binary first (bypasses PowerShell heuristics)
  const binaryCandidates = [
    join(process.resourcesPath, 'resources/drag-listener.exe'),
    join(process.resourcesPath, 'drag-listener.exe'),
    join(__dirname, '../../resources/drag-listener.exe'),
    join(app.getAppPath(), 'resources/drag-listener.exe')
  ]
  const nativeBinary = binaryCandidates.find((p) => existsSync(p))

  if (nativeBinary) {
    try {
      try {
        spawnSync('taskkill', ['/F', '/IM', 'drag-listener.exe'], { windowsHide: true })
      } catch {}

      hookProcess = spawn(nativeBinary, [], { windowsHide: true })

      hookProcess.on('error', (err) => {
        console.warn('[listener] Native binary error:', err.message)
      })

      hookProcess.on('exit', (code, signal) => {
        console.log(`[listener] Native listener process exited with code ${code}, signal ${signal}`)
      })

      hookProcess.stdout?.on('data', (d) => console.log(`[listener] ${d.toString().trim()}`))
      hookProcess.stderr?.on('data', (d) => console.error(`[listener error] ${d.toString().trim()}`))
      console.log(`[listener] Native drag listener active (PID: ${hookProcess.pid}) from ${nativeBinary}`)
      return
    } catch (e) {
      console.warn('[listener] Could not start native binary, falling back to script:', e)
    }
  }

  // 2. Fallback to PowerShell script if native binary is not available
  const scriptCandidates = [
    join(__dirname, '../../scripts/drag-listener.ps1'),
    join(app.getAppPath(), 'scripts/drag-listener.ps1'),
    join(process.resourcesPath, 'scripts/drag-listener.ps1')
  ]
  const scriptPath = scriptCandidates.find((p) => existsSync(p))

  if (scriptPath) {
    try {
      // Clean up any previously orphaned drag-listener PowerShell processes synchronously
      try {
        spawnSync('powershell.exe', [
          '-NoProfile',
          '-Command',
          "Get-Process powershell -ErrorAction SilentlyContinue | ForEach-Object { try { $c = (Get-CimInstance Win32_Process -Filter \"ProcessId = $($_.Id)\").CommandLine; if ($c -like '*drag-listener.ps1*') { Stop-Process -Id $_.Id -Force } } catch {} }"
        ], { timeout: 3000 })
      } catch {}

      hookProcess = spawn('powershell.exe', [
        '-NoProfile',
        '-ExecutionPolicy', 'Bypass',
        '-WindowStyle', 'Hidden',
        '-File', scriptPath
      ], { windowsHide: true })

      hookProcess.on('error', (err) => {
        console.warn('[listener] Process error:', err.message)
      })

      hookProcess.on('exit', (code, signal) => {
        console.log(`[listener] Process exited with code ${code}, signal ${signal}`)
      })

      hookProcess.stdout?.on('data', (d) => console.log(`[listener] ${d.toString().trim()}`))
      hookProcess.stderr?.on('data', (d) => console.error(`[listener error] ${d.toString().trim()}`))
      console.log(`[listener] Drag + Tab background listener active (PID: ${hookProcess.pid})`)
    } catch (e) {
      console.warn('[listener] Could not start listener:', e)
    }
  } else {
    console.warn('[listener] No listener binary or script found')
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

  createTraySafe()

  // 1. Create transparent wheel overlay (hidden until Tab is pressed while dragging)
  createOverlayWindow()

  // 2. Create options popup window (hidden until an action needing params is selected)
  createPopupWindow()

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
  try {
    spawnSync('taskkill', ['/F', '/IM', 'drag-listener.exe'], { windowsHide: true })
  } catch {}
})

app.on('window-all-closed', (e: Event) => {
  e.preventDefault()
})
