import { BrowserWindow, screen } from 'electron'
import { join } from 'path'
import { is } from '@electron-toolkit/utils'

let popupWin: BrowserWindow | null = null

export function createPopupWindow(): BrowserWindow {
  popupWin = new BrowserWindow({
    width: 720,
    height: 600,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    resizable: true,
    minWidth: 540,
    minHeight: 480,
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
    const [curW, curH] = popupWin.getSize()
    const targetX = Math.max(20, Math.min(Math.round(x - curW / 2), screenW - curW - 20))
    const targetY = Math.max(20, Math.min(Math.round(y - curH / 2), screenH - curH - 20))
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
