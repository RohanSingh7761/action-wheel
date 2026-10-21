import { contextBridge, ipcRenderer } from 'electron'
import { IPC } from '../shared/ipc-types'

contextBridge.exposeInMainWorld('hubAPI', {
  triggerDemo: () => ipcRenderer.send(IPC.HUB_TRIGGER_DEMO),
  selectFile: () => ipcRenderer.send(IPC.HUB_SELECT_FILE),
  dropFile: (filePath: string) => ipcRenderer.send(IPC.HUB_DROP_FILE, filePath),
  minimize: () => ipcRenderer.send(IPC.HUB_MINIMIZE),
  quit: () => ipcRenderer.send(IPC.HUB_QUIT)
})
