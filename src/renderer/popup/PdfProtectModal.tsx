import React, { useState, useEffect } from 'react'
import { LockIcon } from '../shared/Icons'

interface PdfProtectModalProps {
  filePath: string
  isMultiple?: boolean
}

export default function PdfProtectModal({ filePath, isMultiple }: PdfProtectModalProps): React.ReactElement {
  const [loading, setLoading] = useState(true)
  const [isEncrypted, setIsEncrypted] = useState(false)
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Clear all states and re-inspect whenever filePath changes
  useEffect(() => {
    let isMounted = true
    setPassword('')
    setConfirmPassword('')
    setShowPassword(false)
    setError(null)
    setIsSubmitting(false)
    setLoading(true)

    const checkStatus = async () => {
      try {
        const api = (window as any).popupAPI
        if (api?.checkPdfEncrypted) {
          const enc = await api.checkPdfEncrypted(filePath)
          if (isMounted) setIsEncrypted(Boolean(enc))
        }
      } catch (err) {
        console.warn('Failed to check encryption status:', err)
      } finally {
        if (isMounted) setLoading(false)
      }
    }
    checkStatus()
    return () => {
      isMounted = false
    }
  }, [filePath])

  const fileName = filePath.split('\\').pop()?.split('/').pop() || 'Document'

  const handleSubmit = async () => {
    if (isSubmitting) return
    setError(null)

    if (!password.trim()) {
      setError('Please enter a password')
      return
    }

    if (!isEncrypted && password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    setIsSubmitting(true)
    const api = (window as any).popupAPI
    if (api?.confirm) {
      try {
        const res = await api.confirm({
          params: {
            mode: isEncrypted ? 'unlock' : 'protect',
            password: password.trim()
          }
        })
        if (res && res.success === false && res.error) {
          setError(res.error)
          setIsSubmitting(false)
        }
      } catch (err: any) {
        setError(err?.message || 'Operation failed')
        setIsSubmitting(false)
      }
    }
  }

  const handleCancel = () => {
    ;(window as any).popupAPI?.cancel()
  }

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-3 min-h-[300px]">
        <div className="w-7 h-7 rounded-full border-2 border-indigo-500/20 border-t-indigo-500 animate-spin" />
        <span className="text-xs text-zinc-400 font-medium tracking-wide">
          Inspecting encryption status…
        </span>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col justify-between select-none h-full min-h-[380px]">
      <div>
        {/* Header Badge */}
        <div className="flex items-center gap-3 p-3 bg-white/[0.03] border border-white/[0.06] rounded-xl mb-4">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center ${
              isEncrypted
                ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                : 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
            }`}
          >
            <LockIcon size={20} />
          </div>
          <div>
            <h3 className="text-xs font-semibold text-white">
              {isEncrypted ? 'Unlock PDF Document' : isMultiple ? 'Protect All PDFs' : 'Protect PDF Document'}
            </h3>
            <p className="text-[11px] text-zinc-400 mt-0.5">
              {isEncrypted
                ? `Enter password to remove encryption from ${fileName}`
                : 'Encrypt document with AES-256 standard password security'}
            </p>
          </div>
        </div>

        {/* Form Inputs */}
        <div className="space-y-3">
          <div>
            <label className="text-[11px] font-semibold text-zinc-300 block mb-1">
              {isEncrypted ? 'Current Document Password' : 'New Password'}
            </label>
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-black/40 border border-white/[0.08] focus-within:border-indigo-500/80 transition-all">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value)
                  setError(null)
                }}
                placeholder="Enter password"
                className="w-full bg-transparent text-xs text-white focus:outline-none placeholder-zinc-500 font-mono tracking-wider"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="text-[10px] text-zinc-400 hover:text-white transition-colors cursor-pointer"
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
          </div>

          {!isEncrypted && (
            <div>
              <label className="text-[11px] font-semibold text-zinc-300 block mb-1">
                Confirm Password
              </label>
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-black/40 border border-white/[0.08] focus-within:border-indigo-500/80 transition-all">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value)
                    setError(null)
                  }}
                  placeholder="Re-enter password"
                  className="w-full bg-transparent text-xs text-white focus:outline-none placeholder-zinc-500 font-mono tracking-wider"
                />
              </div>
            </div>
          )}

          {error && (
            <p className="text-[11px] text-red-400 font-medium px-1 flex items-center gap-1.5 animate-pulse">
              <span>⚠</span> {error}
            </p>
          )}

          {!isEncrypted && password && (
            <div className="p-2.5 bg-indigo-500/5 rounded-xl border border-indigo-500/10">
              <span className="text-[10px] text-indigo-300/80 block">
                🔒 Protected files require this password to be opened on any device.
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Footer Actions */}
      <div className="pt-4 border-t border-white/[0.08] flex items-center justify-between mt-3">
        <button
          onClick={handleCancel}
          className="px-5 py-2.5 rounded-xl text-xs font-semibold text-zinc-300 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] transition-all cursor-pointer active:scale-95 shadow-sm"
        >
          Cancel
        </button>

        <button
          onClick={handleSubmit}
          disabled={!password || isSubmitting}
          className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold text-white transition-all shadow-lg active:scale-95 ${
            password && !isSubmitting
              ? isEncrypted
                ? 'bg-gradient-to-r from-amber-600 via-amber-500 to-amber-600 hover:from-amber-500 hover:to-amber-500 shadow-amber-600/30 cursor-pointer'
                : 'bg-gradient-to-r from-indigo-600 via-indigo-500 to-indigo-600 hover:from-indigo-500 hover:to-indigo-500 shadow-indigo-600/30 cursor-pointer'
              : 'bg-zinc-800 text-zinc-500 cursor-not-allowed shadow-none'
          }`}
        >
          {isSubmitting
            ? isEncrypted
              ? 'Unlocking…'
              : 'Protecting…'
            : isEncrypted
            ? 'Unlock PDF'
            : 'Protect PDF'}
        </button>
      </div>
    </div>
  )
}
