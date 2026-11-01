import { createContext, useCallback, useContext, useRef, useState } from 'react'

const ToastContext = createContext(() => {})

export function ToastProvider({ children }) {
  const [items, setItems] = useState([])
  const id = useRef(0)

  const toast = useCallback((message, type = 'ok') => {
    const key = ++id.current
    setItems((l) => [...l, { key, message, type }])
    setTimeout(() => setItems((l) => l.filter((i) => i.key !== key)), 4000)
  }, [])

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div className="fixed bottom-4 right-4 z-[100] flex w-[min(24rem,calc(100vw-2rem))] flex-col gap-2" role="status" aria-live="polite">
        {items.map((i) => (
          <div
            key={i.key}
            className={`rounded-md border px-4 py-3 text-sm font-medium shadow-lg ${
              i.type === 'error'
                ? 'border-shell bg-white text-shell-dark'
                : 'border-kelp bg-tank text-foam'
            }`}
          >
            {i.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export const useToast = () => useContext(ToastContext)
