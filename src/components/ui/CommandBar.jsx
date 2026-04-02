import { useState, useRef, useEffect } from 'react'
import { useHabitStore } from '../../stores/habitStore'
import { useFoodStore } from '../../stores/foodStore'
import { useTargetsStore } from '../../stores/targetsStore'

// ─── Intent Detection (client-side, no API call needed) ───

const WATER_PATTERNS = [
  /(\d+)\s*ml\s*(de\s+)?agua/i,
  /(\d+)\s*ml\s*water/i,
  /agua\s+(\d+)\s*ml/i,
  /(\d+(?:\.\d+)?)\s*(?:l|lt|litro|litros)\s*(de\s+)?agua/i,
  /agua\s+(\d+(?:\.\d+)?)\s*(?:l|lt|litro|litros)/i,
  /(\d+)\s*vasos?\s*(de\s+)?agua/i,
]

const STEPS_PATTERNS = [
  /(\d+)\s*pasos/i,
  /(\d+)\s*steps/i,
  /caminé?\s+(\d+)/i,
]

function parseIntent(text) {
  const trimmed = text.trim().toLowerCase()

  // Water detection
  for (const pattern of WATER_PATTERNS) {
    const match = trimmed.match(pattern)
    if (match) {
      const num = Number(match[1])
      if (trimmed.includes('ml') || trimmed.includes('water')) {
        return { type: 'water', value: num / 1000 } // ml → L
      }
      if (trimmed.includes('vaso')) {
        return { type: 'water', value: num * 0.25 } // 1 vaso = 250ml
      }
      return { type: 'water', value: num } // assume liters
    }
  }

  // Steps detection
  for (const pattern of STEPS_PATTERNS) {
    const match = trimmed.match(pattern)
    if (match) {
      return { type: 'steps', value: Number(match[1]) }
    }
  }

  // Gym / BJJ quick toggles
  if (/^(gym|hice gym|fui al gym)$/i.test(trimmed)) return { type: 'gym', value: 1 }
  if (/^(bjj|hice bjj|fui a bjj|entrené bjj|entrene bjj)$/i.test(trimmed)) return { type: 'bjj', value: 1 }

  // Default: treat as food
  return { type: 'food', text: text.trim() }
}

// ─── Component ───

export default function CommandBar({ isOpen, onClose }) {
  const [input, setInput] = useState('')
  const [status, setStatus] = useState('idle') // idle | processing | success | error
  const [message, setMessage] = useState('')
  const inputRef = useRef(null)

  const { todayHabits, upsertHabit } = useHabitStore()
  const { parseWithAI, confirmAIEstimate } = useFoodStore()
  const { targets } = useTargetsStore()

  useEffect(() => {
    if (isOpen) {
      setInput('')
      setStatus('idle')
      setMessage('')
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [isOpen])

  // Auto-close after success
  useEffect(() => {
    if (status === 'success') {
      const t = setTimeout(() => onClose(), 1200)
      return () => clearTimeout(t)
    }
  }, [status])

  const handleSubmit = async () => {
    if (!input.trim() || status === 'processing') return
    setStatus('processing')

    const intent = parseIntent(input)

    try {
      if (intent.type === 'water') {
        const current = Number(todayHabits.water?.value || 0)
        const newVal = current + intent.value
        await upsertHabit('water', newVal, targets.water || 2.5)
        setMessage(`+${intent.value}L agua → ${newVal}L total`)
        setStatus('success')
      } else if (intent.type === 'steps') {
        await upsertHabit('steps', intent.value, targets.steps || 10000)
        setMessage(`${intent.value.toLocaleString()} pasos registrados`)
        setStatus('success')
      } else if (intent.type === 'gym') {
        await upsertHabit('gym', 1, 1)
        setMessage('Gym registrado')
        setStatus('success')
      } else if (intent.type === 'bjj') {
        await upsertHabit('bjj', 1, 1)
        setMessage('BJJ registrado')
        setStatus('success')
      } else if (intent.type === 'food') {
        const estimate = await parseWithAI(intent.text, null)
        if (estimate) {
          await confirmAIEstimate({ ...estimate, rawInput: intent.text })
          setMessage(`${estimate.description} · ${estimate.calories} kcal`)
          setStatus('success')
        } else {
          setMessage('No pude parsear eso')
          setStatus('error')
        }
      }
    } catch {
      setMessage('Error al procesar')
      setStatus('error')
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[80]">
      {/* Glassmorphism overlay */}
      <div
        className="absolute inset-0 bg-white/70 backdrop-blur-xl"
        onClick={onClose}
      />

      {/* Command bar */}
      <div className="relative z-10 flex flex-col items-center justify-start pt-[20vh] px-6 max-w-lg mx-auto">
        {status === 'success' ? (
          <div className="animate-fade-in text-center">
            <div className="w-16 h-16 bg-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg shadow-emerald-200">
              <span className="text-3xl text-white">✓</span>
            </div>
            <p className="text-sm font-bold text-slate-800">{message}</p>
          </div>
        ) : status === 'error' ? (
          <div className="animate-fade-in text-center">
            <div className="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg shadow-red-200">
              <span className="text-3xl text-white">✕</span>
            </div>
            <p className="text-sm font-bold text-slate-800">{message}</p>
            <button onClick={() => setStatus('idle')} className="text-xs text-violet-600 font-bold mt-3">Reintentar</button>
          </div>
        ) : (
          <>
            <div className="w-full bg-white rounded-[2rem] shadow-2xl shadow-slate-200 border border-slate-100 overflow-hidden">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                placeholder="200ml agua, café con leche, 8000 pasos..."
                className="w-full px-6 py-5 text-base text-slate-800 bg-transparent border-none focus:outline-none focus:ring-0 placeholder:text-slate-300"
                disabled={status === 'processing'}
              />
              {status === 'processing' && (
                <div className="px-6 pb-4 flex items-center gap-2">
                  <div className="w-4 h-4 bg-violet-500 rounded animate-pulse" />
                  <span className="text-xs text-slate-400">Procesando...</span>
                </div>
              )}
            </div>

            {/* Quick hints */}
            <div className="flex flex-wrap gap-2 mt-4 justify-center">
              {['500ml agua', 'café con leche', '8000 pasos', 'gym'].map(hint => (
                <button
                  key={hint}
                  onClick={() => { setInput(hint); setTimeout(handleSubmit, 50) }}
                  className="text-[10px] font-bold text-slate-400 bg-white/80 px-3 py-1.5 rounded-full border border-slate-200 active:bg-slate-100 transition"
                >
                  {hint}
                </button>
              ))}
            </div>

            <button onClick={onClose} className="mt-8 text-xs text-slate-400 font-medium">
              Cerrar
            </button>
          </>
        )}
      </div>
    </div>
  )
}
