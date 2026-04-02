import { useState, useRef, useEffect } from 'react'
import { useHabitStore } from '../../stores/habitStore'
import { useFoodStore } from '../../stores/foodStore'
import { usePointsStore } from '../../stores/pointsStore'
import { useTargetsStore } from '../../stores/targetsStore'

const EDGE_URL = 'https://birpqzahbtfbxxtaqeth.supabase.co/functions/v1'
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJpcnBxemFoYnRmYnh4dGFxZXRoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ0OTExODMsImV4cCI6MjA5MDA2NzE4M30.f85JKwllPo1dLRvzFphPkLL8bEMts0IYjqCnTLDrA_c'

async function callParseIntent(text) {
  const res = await fetch(EDGE_URL + '/parse-intent', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + ANON_KEY },
    body: JSON.stringify({ text }),
  })
  return res.json()
}

export default function CommandBar({ isOpen, onClose }) {
  const [input, setInput] = useState('')
  const [status, setStatus] = useState('idle') // idle | processing | success | error
  const [message, setMessage] = useState('')
  const inputRef = useRef(null)

  const { todayHabits, upsertHabit } = useHabitStore()
  const { parseWithAI, confirmAIEstimate } = useFoodStore()
  const { processIntentRedeem } = usePointsStore()
  const { targets } = useTargetsStore()

  // Cmd+K shortcut
  useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        if (isOpen) onClose()
        else document.dispatchEvent(new CustomEvent('open-command-bar'))
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [isOpen])

  useEffect(() => {
    if (isOpen) {
      setInput('')
      setStatus('idle')
      setMessage('')
      if (window.navigator.vibrate) window.navigator.vibrate(10)
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [isOpen])

  // Auto-close after success
  useEffect(() => {
    if (status === 'success') {
      const t = setTimeout(() => onClose(), 1500)
      return () => clearTimeout(t)
    }
  }, [status])

  const handleSubmit = async () => {
    if (!input.trim() || status === 'processing') return
    setStatus('processing')

    try {
      const intent = await callParseIntent(input.trim())
      if (intent.error) {
        setMessage(intent.error)
        setStatus('error')
        return
      }

      // Execute based on intent type
      if (intent.type === 'HABIT') {
        if (intent.action === 'add_water') {
          const current = Number(todayHabits.water?.value || 0)
          const amount = intent.payload?.amount || 0.5
          await upsertHabit('water', current + amount, targets.water || 2.5)
        } else if (intent.action === 'set_steps') {
          await upsertHabit('steps', intent.payload?.amount || 0, targets.steps || 10000)
        } else if (intent.action === 'toggle_gym') {
          await upsertHabit('gym', 1, 1)
        } else if (intent.action === 'toggle_bjj') {
          await upsertHabit('bjj', 1, 1)
        }
      } else if (intent.type === 'FOOD') {
        const estimate = await parseWithAI(intent.payload?.description || input.trim(), null)
        if (estimate) {
          await confirmAIEstimate({ ...estimate, rawInput: input.trim() })
        }
      } else if (intent.type === 'REDEEM') {
        const result = await processIntentRedeem(intent.payload?.item_id || input.trim())
        if (!result.success) {
          setMessage(result.msg)
          setStatus('error')
          return
        }
        if (window.navigator.vibrate) window.navigator.vibrate([30, 50])
        setMessage(result.msg)
        setStatus('success')
        return
      }
      // CHAT type — just show the confirmation, no action needed

      if (window.navigator.vibrate) window.navigator.vibrate([30, 50])
      setMessage(intent.confirmation_msg || 'Hecho')
      setStatus('success')
    } catch (err) {
      setMessage(String(err?.message || err))
      setStatus('error')
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[80]">
      {/* Glassmorphism overlay */}
      <div className="absolute inset-0 bg-white/70 backdrop-blur-2xl" onClick={onClose} />

      {/* Command bar */}
      <div className="relative z-10 flex flex-col items-center justify-start pt-[18vh] px-6 max-w-lg mx-auto">
        {status === 'success' ? (
          <div className="text-center animate-fade-in">
            <div className="w-20 h-20 bg-emerald-500 rounded-full flex items-center justify-center mx-auto mb-5 shadow-xl shadow-emerald-200 scale-100 animate-[scale-in_0.3s_ease-out]">
              <span className="text-4xl text-white">✓</span>
            </div>
            <p className="text-base font-black text-slate-800">{message}</p>
          </div>
        ) : status === 'error' ? (
          <div className="text-center animate-fade-in">
            <div className="w-20 h-20 bg-red-500 rounded-full flex items-center justify-center mx-auto mb-5 shadow-xl shadow-red-200">
              <span className="text-4xl text-white">✕</span>
            </div>
            <p className="text-sm font-bold text-slate-800">{message}</p>
            <button onClick={() => setStatus('idle')} className="text-xs text-violet-600 font-bold mt-4">Reintentar</button>
          </div>
        ) : (
          <>
            {/* Input card */}
            <div className="w-full bg-white/80 backdrop-blur-md rounded-[2.5rem] shadow-2xl shadow-slate-200/50 border border-white/30 overflow-hidden">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                placeholder="¿Qué hiciste hoy, Mati?"
                className="w-full px-8 py-6 text-lg font-black text-slate-800 bg-transparent border-none focus:outline-none focus:ring-0 placeholder:text-slate-300 placeholder:font-medium"
                disabled={status === 'processing'}
              />
              {status === 'processing' && (
                <div className="px-8 pb-5 flex items-center gap-3">
                  <div className="w-5 h-5 bg-violet-500 rounded-lg animate-pulse" />
                  <span className="text-sm text-slate-400 font-medium">Brim está pensando...</span>
                </div>
              )}
            </div>

            {/* Quick hints */}
            <div className="flex flex-wrap gap-2 mt-5 justify-center">
              {['500ml agua', 'café con leche', '8000 pasos', 'gym', 'canjeame una birra'].map(hint => (
                <button
                  key={hint}
                  onClick={() => { setInput(hint) }}
                  className="text-[10px] font-bold text-slate-400 bg-white/60 backdrop-blur-sm px-3 py-1.5 rounded-full border border-white/30 active:bg-white/90 transition"
                >
                  {hint}
                </button>
              ))}
            </div>

            <button onClick={onClose} className="mt-10 text-xs text-slate-300 font-medium">
              ESC para cerrar
            </button>
          </>
        )}
      </div>
    </div>
  )
}
