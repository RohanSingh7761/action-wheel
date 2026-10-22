import { BrowserWindow } from 'electron'
import { join } from 'path'
import { is } from '@electron-toolkit/utils'

let hubWin: BrowserWindow | null = null

export function createHubWindow(): BrowserWindow {
  hubWin = new BrowserWindow({
    width: 480,
    height: 560,
    frame: false,
    transparent: true,
    resizable: false,
    maximizable: false,
    show: true,
    alwaysOnTop: false,
    backgroundColor: '#00000000',
    webPreferences: {
      preload: join(__dirname, '../preload/hub.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  hubWin.on('close', (e) => {
    e.preventDefault()
    hubWin?.hide()
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    hubWin.loadURL(process.env['ELECTRON_RENDERER_URL'] + '/hub/index.html')
  } else {
    hubWin.loadFile(join(__dirname, '../renderer/hub/index.html'))
  }

  return hubWin
}

export function getHubWindow(): BrowserWindow | null {
  return hubWin
}

export function showHub(): void {
  if (!hubWin || hubWin.isDestroyed()) {
    createHubWindow()
  }
  if (!hubWin) return
  if (hubWin.isMinimized()) hubWin.restore()
  hubWin.show()
  hubWin.focus()
}

export function hideHub(): void {
  if (!hubWin) return
  hubWin.hide()
}
