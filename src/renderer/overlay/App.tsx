import React, { useEffect, useState, useCallback } from 'react'
import { AnimatePresence } from 'framer-motion'
import ActionWheel from './ActionWheel'
import Toast from './Toast'
import type { TriggerPayload, DonePayload, ErrorPayload, ProcessingPayload } from '../../shared/ipc-types'

type WheelState = 'hidden' | 'visible' | 'processing'

interface ToastData {
  type: 'success' | 'error'
  message: string
  subMessage?: string
}

export default function App(): React.ReactElement {
  const [wheelState, setWheelState] = useState<WheelState>('hidden')
  const [triggerData, setTriggerData] = useState<TriggerPayload | null>(null)
  const [processingAction, setProcessingAction] = useState<string | null>(null)
  const [toast, setToast] = useState<ToastData | null>(null)

  const showToast = useCallback((data: ToastData) => {
    setToast(data)
    setTimeout(() => setToast(null), 3500)
  }, [])

  useEffect(() => {
    const api = (window as any).overlayAPI
    if (!api) return

    const cleanTrigger = api.onTrigger((payload: TriggerPayload) => {
      setTriggerData(payload)
      setWheelState('visible')
      setProcessingAction(null)
    })

    const cleanProcessing = api.onProcessing((payload: ProcessingPayload) => {
      setProcessingAction(payload.action)
      setWheelState('processing')
    })

    const cleanDone = api.onDone((payload: DonePayload) => {
      setWheelState('hidden')
      setProcessingAction(null)
      showToast({
        type: 'success',
        message: `Done!`,
        subMessage: payload.sizeInfo || payload.outputPath.split('\\').pop()
      })
      setTimeout(() => {
        api.dismiss()
      }, 3500)
    })

    const cleanError = api.onError((payload: ErrorPayload) => {
      setWheelState('hidden')
      setProcessingAction(null)
      showToast({ type: 'error', message: 'Error', subMessage: payload.message })
      setTimeout(() => {
        api.dismiss()
      }, 3500)
    })

    const cleanHide = api.onHide(() => {
      setWheelState('hidden')
      setProcessingAction(null)
    })

    return () => {
      cleanTrigger?.()
      cleanProcessing?.()
      cleanDone?.()
      cleanError?.()
      cleanHide?.()
    }
  }, [showToast])

  const handleDismiss = useCallback(() => {
    setWheelState('hidden');  
    (window as any).overlayAPI?.dismiss()
  }, [])

  return (
    <div
      className="fixed inset-0"
      style={{ background: 'transparent' }}
    >
      <AnimatePresence>
        {(wheelState === 'visible' || wheelState === 'processing') && triggerData && (
          <ActionWheel
            key={`wheel-${triggerData.timestamp || Date.now()}-${triggerData.cursorX}-${triggerData.cursorY}`}
            triggerData={triggerData}
            isProcessing={wheelState === 'processing'}
            processingAction={processingAction}
            onDismiss={handleDismiss}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {toast && (
          <Toast
            key="toast"
            type={toast.type}
            message={toast.message}
            subMessage={toast.subMessage}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
