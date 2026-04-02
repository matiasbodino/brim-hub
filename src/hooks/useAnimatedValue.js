import { useState, useEffect, useRef } from 'react'

// Animates a number from current to target over duration ms
export function useAnimatedValue(target, duration = 600) {
  const [display, setDisplay] = useState(target)
  const rafRef = useRef(null)
  const startRef = useRef(null)
  const fromRef = useRef(target)

  useEffect(() => {
    const from = fromRef.current
    if (from === target) return

    const startTime = performance.now()
    startRef.current = startTime

    const animate = (now) => {
      const elapsed = now - startTime
      const progress = Math.min(1, elapsed / duration)
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3)
      const current = from + (target - from) * eased

      setDisplay(Math.round(current * 10) / 10)

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate)
      } else {
        setDisplay(target)
        fromRef.current = target
      }
    }

    rafRef.current = requestAnimationFrame(animate)
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      fromRef.current = target
    }
  }, [target, duration])

  return display
}
