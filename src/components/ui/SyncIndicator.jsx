import { useState, useEffect } from 'react'

// Global sync event system
let listeners = []
export function notifySync() {
  listeners.forEach(fn => fn())
}

export default function SyncIndicator() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const handler = () => {
      setVisible(true)
      setTimeout(() => setVisible(false), 1500)
    }
    listeners.push(handler)
    return () => { listeners = listeners.filter(l => l !== handler) }
  }, [])

  if (!visible) return null

  return (
    <div className="fixed top-12 left-1/2 -translate-x-1/2 z-[90] animate-fade-in">
      <div className="bg-emerald-500 text-white text-[10px] font-bold px-3 py-1.5 rounded-full shadow-lg flex items-center gap-1.5">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
          <path d="M20 6L9 17l-5-5" />
        </svg>
        Sincronizado
      </div>
    </div>
  )
}
