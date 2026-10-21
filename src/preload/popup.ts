import { contextBridge, ipcRenderer } from 'electron'
import type { PopupInitPayload, PopupConfirmPayload } from '../shared/ipc-types'
import { IPC } from '../shared/ipc-types'

contextBridge.exposeInMainWorld('popupAPI', {
  onInit: (cb: (payload: PopupInitPayload) => void) => {
    ipcRenderer.on(IPC.POPUP_INIT, (_e, payload) => cb(payload))
    return () => ipcRenderer.removeAllListeners(IPC.POPUP_INIT)
  },
  confirm: (payload: PopupConfirmPayload): Promise<void> =>
    ipcRenderer.invoke(IPC.POPUP_CONFIRM, payload),
  cancel: () => ipcRenderer.send(IPC.POPUP_CANCEL)
})
