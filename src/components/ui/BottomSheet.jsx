import { useEffect } from 'react'

export default function BottomSheet({ isOpen, onClose, title, children }) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [isOpen])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[60]">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity duration-300"
        onClick={onClose}
      />
      {/* Sheet */}
      <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-[3rem] shadow-2xl max-h-[85vh] overflow-y-auto animate-slide-up max-w-lg mx-auto">
        {/* Handle */}
        <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mt-4 mb-2" />
        <div className="flex items-center justify-between px-8 pt-2 pb-4">
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">{title}</h2>
          <button
            onClick={onClose}
            className="p-2 bg-slate-100 rounded-full text-slate-400 text-sm active:scale-90 transition-transform"
          >
            ✕
          </button>
        </div>
        <div className="px-8 pb-8">
          {children}
        </div>
      </div>
    </div>
  )
}
