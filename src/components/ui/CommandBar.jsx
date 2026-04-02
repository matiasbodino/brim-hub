import { useState, useRef, useEffect, useCallback } from 'react'
import { useHabitStore } from '../../stores/habitStore'
import { useFoodStore } from '../../stores/foodStore'
import { usePointsStore } from '../../stores/pointsStore'
import { useTargetsStore } from '../../stores/targetsStore'
import { useEnergyStore } from '../../stores/energyStore'
import { usePlanStore } from '../../stores/planStore'
import { useDamageStore } from '../../stores/damageStore'

const EDGE_URL = 'https://birpqzahbtfbxxtaqeth.supabase.co/functions/v1'
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJpcnBxemFoYnRmYnh4dGFxZXRoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ0OTExODMsImV4cCI6MjA5MDA2NzE4M30.f85JKwllPo1dLRvzFphPkLL8bEMts0IYjqCnTLDrA_c'

async function callParseIntent(text) {
  const res = await fetch(EDGE_URL + '/parse-intent', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + ANON_KEY },
    body: JSON.stringify({ text }),
  })
  if (!res.ok) throw new Error('Error de conexión')
  return res.json()
}

export default function CommandBar({ isOpen, onClose }) {
  const [input, setInput] = useState('')
  const [status, setStatus] = useState('idle') // idle | processing | success | error
  const [message, setMessage] = useState('')
  const inputRef = useRef(null)

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
      const t = setTimeout(() => onClose(), 2000)
      return () => clearTimeout(t)
    }
  }, [status])

  const handleSubmit = useCallback(async (textOverride) => {
    const text = (textOverride || input).trim()
    if (!text || status === 'processing') return
    setStatus('processing')

    try {
      const intent = await callParseIntent(text)
      if (intent.error) {
        setMessage('No entendí eso. Probá con algo como "500ml agua" o "café con leche".')
        setStatus('error')
        return
      }

      let successMsg = intent.confirmation_msg || 'Anotado, Mati. Ya lo sumé a tus números.'

      // Execute based on intent type
      if (intent.type === 'HABIT') {
        if (intent.action === 'add_water') {
          const amount = intent.payload?.amount || 0.5
          await useHabitStore.getState().addWater(amount, targets.water || 2.5)
          successMsg = intent.confirmation_msg || `+${amount}L de agua. ${(Number(useHabitStore.getState().todayHabits.water?.value || 0)).toFixed(1)}L total.`
        } else if (intent.action === 'add_mate') {
          const termos = intent.payload?.termos || 1
          await useHabitStore.getState().addMate(termos, targets.water || 2.5)
          successMsg = intent.confirmation_msg || `Mate sumado (${(termos * 0.7).toFixed(1)}L efectivos).`
        } else if (intent.action === 'set_steps') {
          const amount = intent.payload?.amount || 0
          await useHabitStore.getState().upsertHabit('steps', amount, targets.steps || 10000)
          successMsg = intent.confirmation_msg || `${amount.toLocaleString()} pasos registrados.`
        } else if (intent.action === 'toggle_gym') {
          await useHabitStore.getState().upsertHabit('gym', 1, 1)
          successMsg = intent.confirmation_msg || 'Gym marcado. La disciplina paga.'
        } else if (intent.action === 'toggle_bjj') {
          await useHabitStore.getState().upsertHabit('bjj', 1, 1)
          successMsg = intent.confirmation_msg || 'BJJ marcado. Oss!'
        } else {
          setMessage('Hábito no reconocido: ' + intent.action)
          setStatus('error')
          return
        }
      } else if (intent.type === 'FOOD') {
        const desc = intent.payload?.description || text
        const estimate = await useFoodStore.getState().parseWithAI(desc, null)
        if (estimate) {
          await useFoodStore.getState().confirmAIEstimate({ ...estimate, rawInput: text })
          successMsg = intent.confirmation_msg || `${estimate.description} · ${estimate.calories} kcal registrado.`
        } else {
          setMessage('No pude estimar esa comida. Probá ser más específico.')
          setStatus('error')
          return
        }
      } else if (intent.type === 'REDEEM') {
        const result = await usePointsStore.getState().processIntentRedeem(intent.payload?.item_id || text)
        if (!result.success) {
          setMessage(result.msg)
          setStatus('error')
          return
        }
        successMsg = result.msg
      } else if (intent.type === 'MOOD') {
        const energy = intent.payload?.energy || 3
        await useEnergyStore.getState().saveEnergy(energy)
        if (energy <= 2 && intent.payload?.suggest_plan_adjust) {
          await usePlanStore.getState().recalculate()
        }
        successMsg = intent.confirmation_msg || `Energía ${energy}/5 registrada.`
      } else if (intent.type === 'DAMAGE') {
        const excess = intent.payload?.excess_kcal || 1000
        const reason = intent.payload?.reason || 'Exceso'
        const res = await useDamageStore.getState().createPlan(excess, reason)
        usePlanStore.getState().recalculate()
        successMsg = intent.confirmation_msg || res.message
      } else if (intent.type === 'CHAT') {
        successMsg = intent.confirmation_msg || 'Anotado.'
      } else {
        setMessage('No sé qué hacer con eso. Probá "500ml agua", "gym" o "me siento cansado".')
        setStatus('error')
        return
      }

      if (window.navigator.vibrate) window.navigator.vibrate([30, 50])
      setMessage(successMsg)
      setStatus('success')
    } catch (err) {
      setMessage('Error de conexión. Revisá tu internet y probá de nuevo.')
      setStatus('error')
    }
  }, [input, status, targets])

  // Quick hint: set text AND submit immediately
  const handleHint = (hint) => {
    setInput(hint)
    handleSubmit(hint)
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
            <div className="w-20 h-20 bg-emerald-500 rounded-full flex items-center justify-center mx-auto mb-5 shadow-xl shadow-emerald-200 animate-[scale-in_0.3s_ease-out]">
              <span className="text-4xl text-white">✓</span>
            </div>
            <p className="text-base font-black text-slate-800">{message}</p>
            <p className="text-xs text-slate-400 mt-2">Anotado, Mati.</p>
          </div>
        ) : status === 'error' ? (
          <div className="text-center animate-fade-in">
            <div className="w-20 h-20 bg-red-500 rounded-full flex items-center justify-center mx-auto mb-5 shadow-xl shadow-red-200">
              <span className="text-4xl text-white">✕</span>
            </div>
            <p className="text-sm font-bold text-slate-800">{message}</p>
            <button onClick={() => setStatus('idle')} className="text-xs text-violet-600 font-bold mt-4 bg-violet-50 px-4 py-2 rounded-full">Reintentar</button>
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

            {/* Quick hints — tap = instant submit */}
            <div className="flex flex-wrap gap-2 mt-5 justify-center">
              {['500ml agua', 'café con leche', '8000 pasos', 'gym', 'estoy detonado', 'me siento un crack'].map(hint => (
                <button
                  key={hint}
                  onClick={() => handleHint(hint)}
                  className="text-[10px] font-bold text-slate-400 bg-white/60 backdrop-blur-sm px-3 min-h-[36px] rounded-full border border-white/30 active:bg-white/90 transition"
                >
                  {hint}
                </button>
              ))}
            </div>

            <button onClick={onClose} className="mt-10 text-xs text-slate-300 font-medium">
              Tocá afuera para cerrar
            </button>
          </>
        )}
      </div>
    </div>
  )
}
