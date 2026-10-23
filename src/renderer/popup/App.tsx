import React, { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import type { ActionId, PopupInitPayload } from '../../shared/ipc-types'
import FormatPicker from './FormatPicker'
import CropEditor from './CropEditor'
import CompressSlider from './CompressSlider'
import PdfReorder from './PdfReorder'
import PdfSplitModal from './PdfSplitModal'
import PdfSignModal from './PdfSignModal'
import PdfMergeModal from './PdfMergeModal'
import PdfProtectModal from './PdfProtectModal'
import PdfEditModal from './PdfEditModal'
import PdfToImagesModal from './PdfToImagesModal'
import {
  ConvertIcon,
  CropIcon,
  CompressIcon,
  CloseIcon,
  PdfIcon,
  EditIcon,
  SignIcon,
  SplitIcon,
  LockIcon,
  MergeIcon
} from '../shared/Icons'

export default function App(): React.ReactElement {
  const [initData, setInitData] = useState<PopupInitPayload | null>(null)

  useEffect(() => {
    const api = (window as any).popupAPI
    if (!api) return
    const cleanup = api.onInit((payload: PopupInitPayload) => {
      setInitData(payload)
    })
    return cleanup
  }, [])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'Tab') {
        e.preventDefault()
        ;(window as any).popupAPI?.cancel()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  if (!initData) {
    return (
      <div className="w-full h-full p-3 flex items-center justify-center select-none">
        <div
          className="w-full h-full rounded-2xl flex items-center justify-center"
          style={{
            background: 'rgba(14, 16, 21, 0.95)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.08)'
          }}
        >
          <span className="text-zinc-500 text-xs font-medium">Loading…</span>
        </div>
      </div>
    )
  }

  const getActionMeta = (action: ActionId) => {
    switch (action) {
      case 'convert-pdf':
        return { title: 'Arrange PDF Pages', icon: <PdfIcon size={15} strokeWidth={1.8} /> }
      case 'convert-format':
        return {
          title: initData.isMultiple ? 'Convert All Images' : 'Convert Format',
          icon: <ConvertIcon size={15} strokeWidth={1.8} />
        }
      case 'crop':
        return {
          title: initData.isMultiple ? 'Crop All Images' : 'Crop Image',
          icon: <CropIcon size={15} strokeWidth={1.8} />
        }
      case 'compress':
        return {
          title: initData.isMultiple ? 'Compress All Images' : 'Compress Image',
          icon: <CompressIcon size={15} strokeWidth={1.8} />
        }
      case 'pdf-edit':
        return {
          title: 'Edit PDF Document',
          icon: <EditIcon size={15} strokeWidth={1.8} />
        }
      case 'pdf-sign':
        return {
          title: 'Sign PDF Document',
          icon: <SignIcon size={15} strokeWidth={1.8} />
        }
      case 'pdf-split':
        return {
          title: 'Split & Extract Pages',
          icon: <SplitIcon size={15} strokeWidth={1.8} />
        }
      case 'pdf-merge':
        return {
          title: 'Merge Multiple PDFs',
          icon: <MergeIcon size={15} strokeWidth={1.8} />
        }
      case 'pdf-protect':
        return {
          title: initData.isMultiple ? 'Protect All PDFs' : 'Protect / Unlock PDF',
          icon: <LockIcon size={15} strokeWidth={1.8} />
        }
      case 'pdf-to-images':
        return {
          title: 'Convert PDF to Images',
          icon: <ConvertIcon size={15} strokeWidth={1.8} />
        }
      default:
        return { title: 'Action Wheel Settings', icon: null }
    }
  }

  const { title, icon } = getActionMeta(initData.action)

  return (
    <motion.div
      className="w-full h-full p-2.5 select-none"
      initial={{ opacity: 0, scale: 0.97, y: 6 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97, y: 6 }}
      transition={{ duration: 0.14, ease: [0.16, 1, 0.3, 1] }}
    >
      <div
        className="w-full h-full rounded-2xl overflow-hidden flex flex-col"
        style={{
          background: 'rgba(14, 16, 21, 0.96)',
          backdropFilter: 'blur(28px)',
          WebkitBackdropFilter: 'blur(28px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          boxShadow: '0 24px 64px rgba(0, 0, 0, 0.7), inset 0 1px 0 rgba(255, 255, 255, 0.1)'
        }}
      >
        {/* Compact Title Bar */}
        <div
          className="flex items-center justify-between px-4 py-3"
          style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.06)' }}
        >
          <div className="flex items-center gap-2 text-zinc-200">
            <span className="text-zinc-400">{icon}</span>
            <span className="font-semibold text-xs tracking-tight text-white">
              {title}
            </span>
          </div>

          <button
            onClick={() => (window as any).popupAPI?.cancel()}
            className="w-6 h-6 rounded-lg flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/[0.08] transition-colors cursor-pointer"
            title="Close (Esc)"
          >
            <CloseIcon size={13} strokeWidth={2} />
          </button>
        </div>

        {/* Modal Body Container */}
        <div className="flex-1 overflow-y-auto p-4 flex flex-col">
          {initData.action === 'convert-pdf' && (
            <PdfReorder filePath={initData.filePath} filePaths={initData.filePaths} />
          )}
          {initData.action === 'convert-format' && (
            <FormatPicker filePath={initData.filePath} />
          )}
          {initData.action === 'crop' && (
            <CropEditor filePath={initData.filePath} />
          )}
          {initData.action === 'compress' && (
            <CompressSlider filePath={initData.filePath} />
          )}
          {initData.action === 'pdf-edit' && (
            <PdfEditModal filePath={initData.filePath} />
          )}
          {initData.action === 'pdf-sign' && (
            <PdfSignModal filePath={initData.filePath} />
          )}
          {initData.action === 'pdf-split' && (
            <PdfSplitModal filePath={initData.filePath} />
          )}
          {initData.action === 'pdf-merge' && (
            <PdfMergeModal filePath={initData.filePath} filePaths={initData.filePaths} />
          )}
          {initData.action === 'pdf-protect' && (
            <PdfProtectModal filePath={initData.filePath} isMultiple={initData.isMultiple} />
          )}
          {initData.action === 'pdf-to-images' && (
            <PdfToImagesModal filePath={initData.filePath} filePaths={initData.filePaths} />
          )}
        </div>
      </div>
    </motion.div>
  )
}
