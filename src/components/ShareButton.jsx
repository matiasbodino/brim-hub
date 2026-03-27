import { useRef, useState } from 'react'
import html2canvas from 'html2canvas'
import ShareCard from './ShareCard'

export default function ShareButton({ cardProps }) {
  const cardRef = useRef(null)
  const [capturing, setCapturing] = useState(false)

  const handleShare = async () => {
    if (!cardRef.current || capturing) return
    setCapturing(true)

    try {
      const canvas = await html2canvas(cardRef.current, {
        scale: 2,
        backgroundColor: null,
        useCORS: true,
      })

      canvas.toBlob(async (blob) => {
        if (!blob) { setCapturing(false); return }

        const file = new File([blob], 'brim-hub-progress.png', { type: 'image/png' })

        // Try Web Share API (works on mobile Safari/Chrome)
        if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
          try {
            await navigator.share({
              files: [file],
              title: 'Mi progreso — Brim Hub',
            })
          } catch (e) {
            // User cancelled share — not an error
          }
        } else {
          // Fallback: download
          const url = URL.createObjectURL(blob)
          const a = document.createElement('a')
          a.href = url
          a.download = 'brim-hub-progress.png'
          a.click()
          URL.revokeObjectURL(url)
        }

        setCapturing(false)
      }, 'image/png')
    } catch (e) {
      setCapturing(false)
    }
  }

  return (
    <>
      {/* Offscreen card for capture */}
      <div style={{ position: 'fixed', left: -9999, top: 0 }}>
        <ShareCard ref={cardRef} {...cardProps} />
      </div>

      <button
        onClick={handleShare}
        disabled={capturing}
        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-zinc-100 text-zinc-600 active:bg-zinc-200 transition disabled:opacity-50"
      >
        {capturing ? '...' : '📷'} Compartir
      </button>
    </>
  )
}
