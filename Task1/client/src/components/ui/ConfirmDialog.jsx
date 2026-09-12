import { useEffect, useRef } from 'react'
import Button from './Button.jsx'

export default function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Confirm',
  onConfirm,
  onCancel,
  isLoading = false,
  variant = 'danger',
}) {
  const dialogRef = useRef(null)

  useEffect(() => {
    if (!open) return

    dialogRef.current?.focus()

    function handleKeyDown(event) {
      if (event.key === 'Escape') onCancel()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [open, onCancel])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div
        ref={dialogRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        className="w-full max-w-sm rounded-xl bg-white p-6 shadow-lg outline-none"
      >
        <h2 id="confirm-dialog-title" className="text-lg font-semibold text-slate-900">
          {title}
        </h2>
        {description && <p className="mt-2 text-sm text-slate-500">{description}</p>}
        <div className="mt-6 flex justify-end gap-3">
          <Button type="button" variant="secondary" onClick={onCancel} disabled={isLoading}>
            Cancel
          </Button>
          <Button type="button" variant={variant} onClick={onConfirm} isLoading={isLoading}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  )
}
