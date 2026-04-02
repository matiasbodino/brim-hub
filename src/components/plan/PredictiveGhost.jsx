import { useState } from 'react'
import { useHabitStore } from '../../stores/habitStore'
import { useBJJTheme } from '../../hooks/useBJJTheme'
import BottomSheet from '../ui/BottomSheet'

// ─── Prediction Logic ───

const HABIT_SCHEDULE = {
  // dayOfWeek (0=dom) → hour ranges → habit suggestions
  water: { allDays: true, hours: [7, 8, 9, 10, 11], label: 'Agua', emoji: '💧', prompt: '¿Ya tomaste el primer vaso?' },
  gym: {
    days: [1, 3, 5], // lun, mie, vie
    hours: [7, 8, 9, 10],
    label: 'Gym',
    emoji: '🏋️',
    prompt: '¿Hoy toca gym?',
  },
  bjj: {
    days: [2, 4], // mar, jue
    hours: [17, 18, 19, 20],
    label: 'BJJ',
    emoji: '🥋',
    prompt: '¿Ya estás en el tatami?',
  },
  steps: {
    allDays: true,
    hours: [13, 14, 15, 16, 17],
    label: 'Pasos',
    emoji: '🚶',
    prompt: '¿Saliste a caminar después de comer?',
  },
}

function getPrediction(todayHabits) {
  const now = new Date()
  const hour = now.getHours()
  const dayOfWeek = now.getDay()

  for (const [type, config] of Object.entries(HABIT_SCHEDULE)) {
    // Already done today? Skip
    const log = todayHabits[type]
    if (log && Number(log.value) >= (Number(log.target) || 1)) continue

    // Check if this habit matches current time window
    const dayMatch = config.allDays || (config.days && config.days.includes(dayOfWeek))
    const hourMatch = config.hours && config.hours.includes(hour)

    if (dayMatch && hourMatch) {
      return { type, ...config }
    }
  }
  return null
}

// ─── Water Glow: morning + not logged ───

function shouldGlowWater(todayHabits) {
  const hour = new Date().getHours()
  const waterLog = todayHabits.water
  const waterDone = waterLog && Number(waterLog.value) > 0
  return hour < 12 && !waterDone
}

// ─── Component ───

export default function PredictiveGhost({ todayHabits }) {
  const prediction = getPrediction(todayHabits)
  const waterGlow = shouldGlowWater(todayHabits)
  const { colors } = useBJJTheme()
  const { upsertHabit } = useHabitStore()
  const [showBJJ, setShowBJJ] = useState(false)
  const [bjjTipo, setBjjTipo] = useState('Gi')
  const [confirmed, setConfirmed] = useState(false)

  if (confirmed || !prediction) {
    // Still show water glow even without prediction
    if (!waterGlow) return null
  }

  const handleQuickConfirm = async () => {
    if (prediction.type === 'bjj') {
      setShowBJJ(true)
      return
    }
    if (prediction.type === 'gym') {
      await upsertHabit('gym', 1, 1)
      setConfirmed(true)
      return
    }
    if (prediction.type === 'water') {
      const current = Number(todayHabits.water?.value || 0)
      await upsertHabit('water', current + 0.5, 2.5)
      setConfirmed(true)
      return
    }
  }

  const handleBJJConfirm = async () => {
    await upsertHabit('bjj', 1, 1, { tipo: bjjTipo, duracion: 90, tecnicas: '', notas: '' })
    setShowBJJ(false)
    setConfirmed(true)
  }

  return (
    <>
      {/* Ghost prediction card */}
      {prediction && !confirmed && (
        <div
          className="rounded-[2rem] p-5 border border-dashed border-slate-200 opacity-40 hover:opacity-80 transition-all duration-500 cursor-pointer active:opacity-100 active:scale-[0.98]"
          onClick={handleQuickConfirm}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-3xl">{prediction.emoji}</span>
              <div>
                <p className="text-sm font-bold text-slate-700">{prediction.prompt}</p>
                <p className="text-[10px] text-slate-400">Tocá para confirmar</p>
              </div>
            </div>
            {prediction.type === 'bjj' && (
              <span className="text-[10px] font-bold bg-violet-100 text-violet-600 px-2 py-1 rounded-full">Confirmar Treino →</span>
            )}
            {prediction.type === 'gym' && (
              <span className="text-[10px] font-bold bg-indigo-100 text-indigo-600 px-2 py-1 rounded-full">Marcar Gym</span>
            )}
            {prediction.type === 'water' && (
              <span className="text-[10px] font-bold bg-blue-100 text-blue-600 px-2 py-1 rounded-full">+500ml</span>
            )}
            {prediction.type === 'steps' && (
              <span className="text-[10px] font-bold bg-emerald-100 text-emerald-600 px-2 py-1 rounded-full">Registrar</span>
            )}
          </div>
        </div>
      )}

      {/* Water glow card (morning, no water logged) */}
      {waterGlow && !prediction?.type !== 'water' && !confirmed && (
        <div
          className="rounded-[2rem] p-4 border border-blue-200 cursor-pointer active:scale-[0.98] transition-all relative overflow-hidden"
          style={{ boxShadow: `0 0 20px ${colors.primary}30` }}
          onClick={async () => {
            const current = Number(todayHabits.water?.value || 0)
            await upsertHabit('water', current + 0.25, 2.5)
          }}
        >
          <div className="absolute inset-0 rounded-[2rem] animate-pulse opacity-20" style={{ backgroundColor: colors.primary }} />
          <div className="relative flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xl">💧</span>
              <span className="text-xs font-bold text-slate-600">Che, ¿todavía no te despertaste? Metele el primer vaso</span>
            </div>
            <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-full">+250ml</span>
          </div>
        </div>
      )}

      {/* BJJ Quick Sheet */}
      <BottomSheet isOpen={showBJJ} onClose={() => setShowBJJ(false)} title="🥋 Confirmar Treino">
        <div className="space-y-6">
          <div className="flex bg-slate-100 p-1.5 rounded-[2rem]">
            {['Gi', 'No-Gi'].map(t => (
              <button key={t} onClick={() => setBjjTipo(t)}
                className={`flex-1 py-3 rounded-[1.5rem] font-bold text-sm transition-all ${
                  bjjTipo === t ? 'bg-white shadow-md text-indigo-600' : 'text-slate-500'
                }`}>
                {t === 'Gi' ? '🥋 Gi' : '🤼 No-Gi'}
              </button>
            ))}
          </div>
          <p className="text-xs text-slate-400 text-center">90 min · Datos precargados</p>
          <button
            onClick={handleBJJConfirm}
            className="w-full bg-slate-900 text-white py-5 rounded-[2rem] font-black text-lg active:scale-[0.98] transition-transform"
          >
            ✅ Oss! Confirmar
          </button>
        </div>
      </BottomSheet>
    </>
  )
}
