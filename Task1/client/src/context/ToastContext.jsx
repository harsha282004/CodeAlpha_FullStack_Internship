import { useCallback, useRef, useState } from 'react'
import { ToastContext } from './toastContext.js'
import Toast from '../components/ui/Toast.jsx'

const DEFAULT_DURATION = 2500

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const nextId = useRef(0)

  const showToast = useCallback((message, variant = 'info', duration = DEFAULT_DURATION) => {
    const id = nextId.current++
    setToasts((prev) => [...prev, { id, message, variant }])
    setTimeout(() => {
      setToasts((prev) => prev.filter((toast) => toast.id !== id))
    }, duration)
  }, [])

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 top-4 z-50 flex flex-col items-center gap-2 px-4">
        {toasts.map((toast) => (
          <Toast key={toast.id} message={toast.message} variant={toast.variant} />
        ))}
      </div>
    </ToastContext.Provider>
  )
}
