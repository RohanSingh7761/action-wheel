import { BrowserWindow, screen } from 'electron'
import { join } from 'path'
import { is } from '@electron-toolkit/utils'

let overlayWin: BrowserWindow | null = null

export function createOverlayWindow(): BrowserWindow {
  const { width, height } = screen.getPrimaryDisplay().workAreaSize

  overlayWin = new BrowserWindow({
    width,
    height,
    x: 0,
    y: 0,
    transparent: true,
    frame: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    focusable: false,
    resizable: false,
    movable: false,
    show: false,
    hasShadow: false,
    webPreferences: {
      preload: join(__dirname, '../preload/overlay.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  // Ignore all mouse events by default — only the wheel area will be interactive
  overlayWin.setIgnoreMouseEvents(true, { forward: true })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    overlayWin.loadURL(process.env['ELECTRON_RENDERER_URL'] + '/overlay/index.html')
  } else {
    overlayWin.loadFile(join(__dirname, '../renderer/overlay/index.html'))
  }

  overlayWin.setAlwaysOnTop(true, 'screen-saver')

  return overlayWin
}

export function getOverlayWindow(): BrowserWindow | null {
  return overlayWin
}

export function showOverlay(): void {
  if (!overlayWin) return
  overlayWin.setAlwaysOnTop(true, 'screen-saver')
  overlayWin.show()
  overlayWin.moveTop()
}

export function hideOverlay(): void {
  if (!overlayWin) return
  overlayWin.hide()
  overlayWin.setIgnoreMouseEvents(true, { forward: true })
}

export function enableMouseOnOverlay(): void {
  if (!overlayWin) return
  overlayWin.setIgnoreMouseEvents(false)
  overlayWin.setAlwaysOnTop(true, 'screen-saver')
}

export function disableMouseOnOverlay(): void {
  if (!overlayWin) return
  overlayWin.setIgnoreMouseEvents(true, { forward: true })
}
