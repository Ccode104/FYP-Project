import { createContext, useContext, useMemo, useState } from 'react'
import './Toast.css'

type Toast = { id: string; kind: 'success'|'error'|'info'; message: string }

const ToastCtx = createContext<{ push: (t: Omit<Toast,'id'>) => void } | null>(null)

let __toastCounter = 0
function nextToastId() {
  __toastCounter += 1
  return `${Date.now()}-${__toastCounter}`
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const push = (t: Omit<Toast,'id'>) => {
    const id = nextToastId()
    setToasts((prev) => [...prev, { id, ...t }])
    setTimeout(() => setToasts((prev) => prev.filter((x) => x.id !== id)), 2500)
  }
  const value = useMemo(() => ({ push }), [])
  return (
    <ToastCtx.Provider value={value}>
      {children}
      <div className="toast-stack">
        {toasts.map((t) => (
          <div key={t.id} className={`toast toast-${t.kind}`}>{t.message}</div>
        ))}
      </div>
    </ToastCtx.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastCtx)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}
