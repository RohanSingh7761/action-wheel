import { BrowserWindow, screen } from 'electron'
import { join } from 'path'
import { is } from '@electron-toolkit/utils'

let popupWin: BrowserWindow | null = null

export function createPopupWindow(): BrowserWindow {
  popupWin = new BrowserWindow({
    width: 380,
    height: 280,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    resizable: false,
    movable: true,
    skipTaskbar: true,
    show: false,
    hasShadow: false,
    webPreferences: {
      preload: join(__dirname, '../preload/popup.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    popupWin.loadURL(process.env['ELECTRON_RENDERER_URL'] + '/popup/index.html')
  } else {
    popupWin.loadFile(join(__dirname, '../renderer/popup/index.html'))
  }

  popupWin.setAlwaysOnTop(true, 'screen-saver')

  return popupWin
}

export function getPopupWindow(): BrowserWindow | null {
  return popupWin
}

export function showPopup(x?: number, y?: number): void {
  if (!popupWin) return
  if (x !== undefined && y !== undefined) {
    const { width: screenW, height: screenH } = screen.getPrimaryDisplay().workAreaSize
    const targetX = Math.max(20, Math.min(Math.round(x - 190), screenW - 400))
    const targetY = Math.max(20, Math.min(Math.round(y - 140), screenH - 300))
    popupWin.setPosition(targetX, targetY)
  }
  popupWin.setAlwaysOnTop(true, 'screen-saver')
  popupWin.show()
  popupWin.focus()
}

export function hidePopup(): void {
  if (!popupWin) return
  popupWin.hide()
}
