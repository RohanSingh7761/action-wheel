import { contextBridge, ipcRenderer } from 'electron'
import type {
  TriggerPayload,
  ProcessingPayload,
  DonePayload,
  ErrorPayload,
  ActionSelectPayload,
  ActionSelectResult
} from '../shared/ipc-types'
import { IPC } from '../shared/ipc-types'

contextBridge.exposeInMainWorld('overlayAPI', {
  onTrigger: (cb: (payload: TriggerPayload) => void) => {
    ipcRenderer.on(IPC.OVERLAY_TRIGGER, (_e, payload) => cb(payload))
    return () => ipcRenderer.removeAllListeners(IPC.OVERLAY_TRIGGER)
  },
  onProcessing: (cb: (payload: ProcessingPayload) => void) => {
    ipcRenderer.on(IPC.OVERLAY_PROCESSING, (_e, payload) => cb(payload))
    return () => ipcRenderer.removeAllListeners(IPC.OVERLAY_PROCESSING)
  },
  onDone: (cb: (payload: DonePayload) => void) => {
    ipcRenderer.on(IPC.OVERLAY_DONE, (_e, payload) => cb(payload))
    return () => ipcRenderer.removeAllListeners(IPC.OVERLAY_DONE)
  },
  onError: (cb: (payload: ErrorPayload) => void) => {
    ipcRenderer.on(IPC.OVERLAY_ERROR, (_e, payload) => cb(payload))
    return () => ipcRenderer.removeAllListeners(IPC.OVERLAY_ERROR)
  },
  onHide: (cb: () => void) => {
    ipcRenderer.on(IPC.OVERLAY_HIDE, () => cb())
    return () => ipcRenderer.removeAllListeners(IPC.OVERLAY_HIDE)
  },
  selectAction: (payload: ActionSelectPayload): Promise<ActionSelectResult> =>
    ipcRenderer.invoke(IPC.ACTION_SELECT, payload),
  dismiss: () => ipcRenderer.send(IPC.WHEEL_DISMISS)
})
