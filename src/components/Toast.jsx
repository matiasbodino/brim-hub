import { useState, useEffect, createContext, useContext } from 'react'

const ToastContext = createContext(null)

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const showToast = (message, duration = 2000) => {
    const id = Date.now()
    setToasts(prev => [...prev, { id, message }])
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, duration)
  }

  return (
    <ToastContext.Provider value={showToast}>
      {children}
      <div className="fixed top-4 left-0 right-0 flex flex-col items-center gap-2 z-[100] pointer-events-none">
        {toasts.map(t => (
          <div key={t.id} className="bg-gray-900 text-white text-sm font-medium px-4 py-2 rounded-full shadow-lg animate-fade-in">
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  return useContext(ToastContext)
}
