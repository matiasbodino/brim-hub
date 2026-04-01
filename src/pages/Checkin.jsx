import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { MATI_ID, HABITS } from '../lib/constants'
import { track } from '../lib/analytics'

const getTrafficLight = (full, partial) => {
  if (full >= 4) return { color: 'text-emerald-400', label: '🟢 Excelente' }
  if (full >= 2 || partial >= 3) return { color: 'text-amber-400', label: '🟡 Regular' }
  return { color: 'text-red-400', label: '🔴 Floja' }
}

export default function Checkin() {
  const navigate = useNavigate()
  const [weekStats, setWeekStats] = useState(null)
  const [weight, setWeight] = useState('')
  const [reflection, setReflection] = useState('')
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadWeek()
  }, [])

  const loadWeek = async () => {
    const today = new Date()
    const day = today.getDay()
    const diffToMonday = day === 0 ? -6 : 1 - day
    const monday = new Date(today)
    monday.setDate(today.getDate() + diffToMonday)
    const since = monday.toISOString().slice(0, 10)

    const { data } = await supabase
      .from('habit_logs')
      .select('date, habit_type, value, target, completion_type')
      .eq('user_id', MATI_ID)
      .gte('date', since)

    const stats = {}
    HABITS.forEach(h => {
      const logs = data?.filter(l => l.habit_type === h.type) ?? []
      const full = logs.filter(l => l.completion_type === 'full').length
      const partial = logs.filter(l => l.completion_type === 'partial').length
      stats[h.type] = { full, partial, label: h.label, emoji: h.emoji }
    })
    setWeekStats(stats)
    setLoading(false)
  }

  const handleSave = async () => {
    if (!weight) return
    const today = new Date().toISOString().slice(0, 10)
    const { error } = await supabase
      .from('weight_logs')
      .upsert({
        user_id: MATI_ID,
        date: today,
        weight: Number(weight),
        notes: reflection || null,
      }, { onConflict: 'user_id,date' })
    if (error) return
    track('checkin_completed')
    setSaved(true)
    setTimeout(() => navigate('/'), 1500)
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white px-4 py-8">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <button
          onClick={() => navigate('/')}
          className="text-zinc-400 hover:text-white transition-colors"
        >
          ← Volver
        </button>
        <h1 className="text-xl font-semibold">Check-in semanal</h1>
      </div>

      {/* Semáforo de la semana */}
      <div className="mb-8">
        <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-widest mb-4">La semana</h2>
        {loading ? (
          <p className="text-zinc-500">Cargando...</p>
        ) : weekStats && (
          <div className="space-y-3">
            {HABITS.map(h => {
              const s = weekStats[h.type]
              if (!s) return null
              const tl = getTrafficLight(s.full, s.partial)
              return (
                <div key={h.type} className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-zinc-300">
                    <span>{s.emoji}</span>
                    <span className="text-sm">{s.label}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-zinc-500">
                      {s.full} completos · {s.partial} parciales
                    </span>
                    <span className={'text-xs font-semibold ' + tl.color}>{tl.label}</span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Peso */}
      <div className="mb-6">
        <label className="text-sm font-semibold text-zinc-400 uppercase tracking-widest block mb-2">Peso hoy</label>
        <input
          type="number"
          step="0.1"
          value={weight}
          onChange={e => setWeight(e.target.value)}
          placeholder="97.0"
          className="bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3 text-white w-full text-base focus:outline-none focus:border-violet-500"
        />
      </div>

      {/* Reflexión */}
      <div className="mb-8">
        <label className="text-sm font-semibold text-zinc-400 uppercase tracking-widest block mb-2">¿Cómo fue la semana?</label>
        <textarea
          value={reflection}
          onChange={e => setReflection(e.target.value)}
          placeholder="Qué funcionó, qué no, qué cambio la próxima..."
          className="bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3 text-white w-full text-base min-h-[120px] resize-none focus:outline-none focus:border-violet-500"
        />
      </div>

      {/* Guardar */}
      <button
        onClick={handleSave}
        disabled={!weight || saved}
        className="bg-violet-600 text-white w-full py-3 rounded-xl font-semibold disabled:opacity-40 active:scale-95 transition"
      >
        {saved ? '✓ Guardado' : 'Cerrar semana'}
      </button>
    </div>
  )
}
