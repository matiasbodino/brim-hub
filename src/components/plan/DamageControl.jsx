import { useState } from 'react'
import { useDamageStore } from '../../stores/damageStore'
import { usePlanStore } from '../../stores/planStore'

const PRESETS = [
  { label: 'Asado tranqui', emoji: '🥩', kcal: 800 },
  { label: 'Asado con todo', emoji: '🔥', kcal: 1500 },
  { label: 'Fiesta/Joda', emoji: '🎉', kcal: 2000 },
  { label: 'Pizza+Birra', emoji: '🍕', kcal: 1000 },
]

export default function DamageControl() {
  const { activePlan, loading, createPlan, fetchActive } = useDamageStore()
  const { recalculate } = usePlanStore()
  const [showForm, setShowForm] = useState(false)
  const [customKcal, setCustomKcal] = useState('')
  const [reason, setReason] = useState('')
  const [result, setResult] = useState(null)

  const handleCreate = async (kcal, reasonText) => {
    const res = await createPlan(kcal, reasonText)
    setResult(res)
    setShowForm(false)
    recalculate() // update daily plan with new damage control
    setTimeout(() => setResult(null), 5000)
  }

  // Active recovery plan progress bar
  if (activePlan) {
    const pct = Math.round((activePlan.days_completed / activePlan.spread_days) * 100)
    const daysLeft = activePlan.spread_days - activePlan.days_completed

    return (
      <div className="bg-white/80 backdrop-blur-md rounded-[2rem] p-5 border border-white/20 shadow-[0_2px_15px_-3px_rgba(0,0,0,0.05)]">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-black text-slate-400 uppercase tracking-widest">🔄 Compensación activa</span>
          <span className="text-[10px] text-slate-400">{activePlan.days_completed}/{activePlan.spread_days} días</span>
        </div>
        <p className="text-xs text-slate-600 mb-3">
          {activePlan.reason} · -{activePlan.daily_reduction} kcal/día · +{activePlan.daily_extra_steps} pasos
        </p>
        <div className="h-3 bg-slate-100 rounded-full overflow-hidden mb-2">
          <div
            className="h-full bg-gradient-to-r from-amber-400 to-emerald-500 rounded-full transition-all duration-1000"
            style={{ width: pct + '%' }}
          />
        </div>
        <p className="text-[10px] text-slate-400">
          {daysLeft > 0
            ? `${daysLeft} día${daysLeft > 1 ? 's' : ''} más y estás limpio. Oss!`
            : 'Compensación completada. Volvés al plan normal.'
          }
        </p>
      </div>
    )
  }

  // Success message
  if (result) {
    return (
      <div className="bg-emerald-50 rounded-[2rem] p-5 border border-emerald-100 animate-fade-in">
        <p className="text-xs font-black text-emerald-700 mb-1">✅ Plan de compensación activado</p>
        <p className="text-xs text-emerald-600">{result.message}</p>
        <p className="text-xs text-emerald-500 italic mt-2">"Disfrutá el momento, Mati. La consistencia le gana a la perfección. Ya ajusté tu plan. Oss!"</p>
      </div>
    )
  }

  // Form
  if (showForm) {
    return (
      <div className="bg-white/80 backdrop-blur-md rounded-[2rem] p-5 border border-white/20 shadow-[0_2px_15px_-3px_rgba(0,0,0,0.05)] space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-black text-slate-400 uppercase tracking-widest">🍖 ¿Cuánto te pasaste?</span>
          <button onClick={() => setShowForm(false)} className="text-xs text-slate-400">✕</button>
        </div>

        {/* Presets */}
        <div className="grid grid-cols-2 gap-2">
          {PRESETS.map(p => (
            <button
              key={p.label}
              onClick={() => handleCreate(p.kcal, p.label)}
              disabled={loading}
              className="bg-slate-50 rounded-xl p-3 text-left active:scale-95 transition disabled:opacity-50"
            >
              <span className="text-lg">{p.emoji}</span>
              <p className="text-xs font-bold text-slate-700 mt-1">{p.label}</p>
              <p className="text-[10px] text-slate-400">+{p.kcal} kcal</p>
            </button>
          ))}
        </div>

        {/* Custom */}
        <div className="flex gap-2">
          <input
            type="number"
            value={customKcal}
            onChange={e => setCustomKcal(e.target.value)}
            placeholder="kcal extra"
            className="flex-1 bg-slate-50 border-none rounded-xl px-3 py-2 text-sm"
          />
          <input
            type="text"
            value={reason}
            onChange={e => setReason(e.target.value)}
            placeholder="Motivo"
            className="flex-1 bg-slate-50 border-none rounded-xl px-3 py-2 text-sm"
          />
        </div>
        <button
          onClick={() => handleCreate(Number(customKcal) || 1000, reason || 'Exceso')}
          disabled={loading || !customKcal}
          className="w-full bg-slate-900 text-white py-3 rounded-xl font-bold text-sm active:scale-95 transition disabled:opacity-50"
        >
          {loading ? 'Calculando...' : 'Activar compensación'}
        </button>
      </div>
    )
  }

  // Trigger button (inline, not too prominent)
  return null // Only shows via Spotlight or explicit trigger
}

// Standalone button for Dashboard
export function DamageControlButton({ onOpen }) {
  return (
    <button
      onClick={onOpen}
      className="text-[10px] font-bold text-amber-600 bg-amber-50 px-3 py-1.5 rounded-full active:bg-amber-100 transition"
    >
      🍖 Me pasé
    </button>
  )
}
