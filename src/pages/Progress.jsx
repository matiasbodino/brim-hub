import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { MATI_ID, HABITS } from '../lib/constants'
import { useCycleStore } from '../stores/cycleStore'

function Heatmap({ data }) {
  const days = []
  const d = new Date()
  for (let i = 27; i >= 0; i--) {
    const dd = new Date(d)
    dd.setDate(dd.getDate() - i)
    const key = dd.toISOString().slice(0, 10)
    days.push({ date: key, day: dd.getDay(), score: data[key] || 0 })
  }

  const getColor = (score) => {
    if (score === -1) return 'bg-zinc-800'
    if (score === 0) return 'bg-gray-100'
    if (score < 50) return 'bg-red-300'
    if (score < 80) return 'bg-amber-300'
    return 'bg-emerald-400'
  }

  return (
    <div>
      <div className="grid grid-cols-7 gap-1.5">
        {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map(d => (
          <div key={d} className="text-center text-xs text-gray-400 font-medium">{d}</div>
        ))}
        {Array.from({ length: (days[0]?.day + 6) % 7 }).map((_, i) => (
          <div key={'pad-' + i} />
        ))}
        {days.map(d => (
          <div
            key={d.date}
            className={`aspect-square rounded-md ${getColor(d.score)}`}
            title={d.date + ': ' + d.score + '%'}
          />
        ))}
      </div>
      <div className="flex items-center gap-2 mt-2 text-xs text-gray-400">
        <span>Menos</span>
        <div className="w-3 h-3 rounded bg-gray-100" />
        <div className="w-3 h-3 rounded bg-red-300" />
        <div className="w-3 h-3 rounded bg-amber-300" />
        <div className="w-3 h-3 rounded bg-emerald-400" />
        <span>Más</span>
      </div>
    </div>
  )
}

function getWeekTrafficLight(full, target) {
  if (target === 0) return { color: 'bg-gray-200', text: '—' }
  const pct = (full / target) * 100
  if (pct >= 80) return { color: 'bg-emerald-400', text: '🟢' }
  if (pct >= 50) return { color: 'bg-amber-400', text: '🟡' }
  return { color: 'bg-red-400', text: '🔴' }
}

function CycleCard({ cycle, targets, weeklyStats }) {
  const today = new Date().toISOString().slice(0, 10)
  const totalDays = Math.round((new Date(cycle.ends_at) - new Date(cycle.started_at)) / 86400000) + 1
  const elapsed = Math.max(0, Math.round((new Date(today) - new Date(cycle.started_at)) / 86400000))
  const pct = Math.min(100, Math.round((elapsed / totalDays) * 100))
  const currentWeek = Math.min(4, Math.floor(elapsed / 7) + 1)

  return (
    <div className="bg-white rounded-2xl p-4 border border-violet-200">
      <div className="flex items-center justify-between mb-2">
        <h2 className="font-bold text-gray-900">{cycle.name}</h2>
        <span className="text-xs text-violet-600 font-semibold">Semana {currentWeek}/4</span>
      </div>
      <div className="flex justify-between text-xs text-gray-400 mb-1">
        <span>{new Date(cycle.started_at + 'T12:00:00').toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })}</span>
        <span>{new Date(cycle.ends_at + 'T12:00:00').toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })}</span>
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden mb-4">
        <div className="h-full rounded-full bg-violet-500" style={{ width: pct + '%' }} />
      </div>

      {/* Weekly traffic light grid: 4 columns (weeks) x N rows (habits) */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr>
              <th className="text-left text-gray-400 font-medium pb-2 pr-2">Hábito</th>
              {[1, 2, 3, 4].map(w => (
                <th key={w} className={'text-center font-medium pb-2 ' + (w === currentWeek ? 'text-violet-600' : 'text-gray-400')}>
                  S{w}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {HABITS.map(h => {
              const t = targets.find(t => t.habit_type === h.type)
              const wt = t ? t.weekly_target : 0
              return (
                <tr key={h.type}>
                  <td className="py-1.5 pr-2 text-gray-600">{h.emoji} {h.label}</td>
                  {weeklyStats.map((week, wi) => {
                    const s = week.habits[h.type]
                    const tl = getWeekTrafficLight(s ? s.full : 0, wt)
                    const isFuture = wi + 1 > currentWeek
                    return (
                      <td key={wi} className="text-center py-1.5">
                        {isFuture ? (
                          <span className="text-gray-200">·</span>
                        ) : (
                          <div className="flex flex-col items-center">
                            <span>{tl.text}</span>
                            <span className="text-gray-400 mt-0.5">{s ? s.full : 0}/{wt}</span>
                          </div>
                        )}
                      </td>
                    )
                  })}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function NewCycleForm({ onSubmit }) {
  const [name, setName] = useState('')
  const [targets, setTargets] = useState({
    water: 5, steps: 5, bjj: 2, gym: 2,
  })

  const handleSubmit = () => {
    if (!name.trim()) return
    onSubmit(name.trim(), targets)
  }

  return (
    <div className="bg-white rounded-2xl p-4 border border-gray-100 space-y-4">
      <h2 className="font-bold text-gray-900">Nuevo ciclo</h2>
      <div>
        <label className="text-xs text-gray-500">Nombre del ciclo</label>
        <input
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="Ciclo Abril 2026"
          className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-base mt-1"
        />
      </div>
      <div>
        <label className="text-xs text-gray-500 block mb-2">Targets semanales (veces por semana)</label>
        <div className="grid grid-cols-2 gap-2">
          {HABITS.map(h => (
            <div key={h.type} className="flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-2">
              <span>{h.emoji}</span>
              <span className="text-sm text-gray-600 flex-1">{h.label}</span>
              <input
                type="number"
                min="0"
                max="7"
                value={targets[h.type]}
                onChange={e => setTargets({ ...targets, [h.type]: Number(e.target.value) })}
                className="w-12 text-center px-1 py-1 rounded-lg border border-gray-200 text-sm font-bold"
              />
            </div>
          ))}
        </div>
      </div>
      <p className="text-xs text-gray-400">Duración: 4 semanas desde hoy</p>
      <button
        onClick={handleSubmit}
        disabled={!name.trim()}
        className="w-full py-2.5 bg-violet-600 text-white font-semibold rounded-xl disabled:opacity-40 active:scale-95 transition"
      >
        Arrancar ciclo
      </button>
    </div>
  )
}

export default function Progress() {
  const [heatmapData, setHeatmapData] = useState({})
  const [weightHistory, setWeightHistory] = useState([])
  const [bjjSessions, setBjjSessions] = useState([])
  const [loading, setLoading] = useState(true)
  const [showNewCycle, setShowNewCycle] = useState(false)

  const { activeCycle, cycleTargets, weeklyStats, loading: cycleLoading, fetchActive, createCycle, completeCycle } = useCycleStore()

  useEffect(() => {
    loadData()
    fetchActive()
  }, [])

  const loadData = async () => {
    setLoading(true)
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    const since = thirtyDaysAgo.toISOString().slice(0, 10)

    const { data: habits } = await supabase
      .from('habit_logs')
      .select('date, value, target, habit_type, completion_type')
      .eq('user_id', MATI_ID)
      .gte('date', since)
      .order('date', { ascending: true })

    const byDate = {}
    ;(habits || []).forEach(h => {
      if (!byDate[h.date]) byDate[h.date] = { completed: 0, total: 0 }
      if (h.completion_type !== 'skip') {
        byDate[h.date].total++
      }
      if (Number(h.value) >= Number(h.target)) byDate[h.date].completed++
    })
    const scores = {}
    Object.entries(byDate).forEach(([date, d]) => {
      if (d.total === 0) { scores[date] = -1; return }
      scores[date] = Math.round((d.completed / d.total) * 100)
    })
    setHeatmapData(scores)

    const { data: weights } = await supabase
      .from('weight_logs')
      .select('date, weight')
      .eq('user_id', MATI_ID)
      .order('date', { ascending: true })
      .limit(20)
    setWeightHistory(weights || [])

    const { data: bjj } = await supabase
      .from('habit_logs')
      .select('date, value, metadata')
      .eq('user_id', MATI_ID)
      .eq('habit_type', 'bjj')
      .gte('date', since)
      .order('date', { ascending: false })
    setBjjSessions((bjj || []).filter(b => Number(b.value) >= 1))

    setLoading(false)
  }

  const handleCreateCycle = async (name, targets) => {
    await createCycle(name, targets)
    setShowNewCycle(false)
  }

  if (loading) {
    return (
      <div className="px-4 py-5 pb-24 flex items-center justify-center min-h-[50vh]">
        <div className="w-8 h-8 bg-violet-600 rounded-xl animate-pulse" />
      </div>
    )
  }

  return (
    <div className="px-4 py-5 pb-24 space-y-4">
      <h1 className="text-xl font-bold text-gray-900">Progreso</h1>

      {/* Active Cycle */}
      {activeCycle ? (
        <CycleCard cycle={activeCycle} targets={cycleTargets} weeklyStats={weeklyStats} />
      ) : showNewCycle ? (
        <NewCycleForm onSubmit={handleCreateCycle} />
      ) : (
        <button
          onClick={() => setShowNewCycle(true)}
          className="w-full py-3 border-2 border-dashed border-violet-300 rounded-2xl text-violet-600 font-semibold text-sm active:bg-violet-50 transition"
        >
          + Arrancar un ciclo de 4 semanas
        </button>
      )}

      {/* Heatmap */}
      <div className="bg-white rounded-2xl p-4 border border-gray-100">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">Últimos 28 días</h2>
        <Heatmap data={heatmapData} />
      </div>

      {/* Weight trend */}
      <div className="bg-white rounded-2xl p-4 border border-gray-100">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">Peso</h2>
        {weightHistory.length === 0 ? (
          <p className="text-sm text-gray-400">Sin registros de peso. Agregá desde Perfil.</p>
        ) : (
          <div className="space-y-2">
            {weightHistory.slice(-5).map(w => (
              <div key={w.date} className="flex justify-between text-sm">
                <span className="text-gray-500">
                  {new Date(w.date + 'T12:00:00').toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })}
                </span>
                <span className="font-bold text-gray-800">{w.weight} kg</span>
              </div>
            ))}
            {weightHistory.length >= 2 && (
              <div className="border-t border-gray-100 pt-2 mt-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Diferencia</span>
                  {(() => {
                    const diff = (weightHistory[weightHistory.length - 1].weight - weightHistory[0].weight).toFixed(1)
                    return (
                      <span className={`font-bold ${Number(diff) <= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                        {Number(diff) > 0 ? '+' : ''}{diff} kg
                      </span>
                    )
                  })()}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* BJJ Journal */}
      <div className="bg-white rounded-2xl p-4 border border-gray-100">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">🥋 BJJ Journal</h2>
        {bjjSessions.length === 0 ? (
          <p className="text-sm text-gray-400">Sin sesiones registradas este mes.</p>
        ) : (
          <div className="space-y-2">
            <div className="text-sm text-violet-600 font-semibold mb-2">
              {bjjSessions.length} sesiones este mes
            </div>
            {bjjSessions.map(s => (
              <div key={s.date} className="bg-gray-50 rounded-xl px-3 py-2.5">
                <div className="flex justify-between text-sm">
                  <span className="font-medium text-gray-700">
                    {new Date(s.date + 'T12:00:00').toLocaleDateString('es-AR', { weekday: 'short', day: 'numeric', month: 'short' })}
                  </span>
                  {s.metadata && (
                    <span className="text-xs text-violet-600 font-semibold">
                      {s.metadata.tipo} · {s.metadata.duracion}min
                    </span>
                  )}
                </div>
                {s.metadata?.tecnicas && (
                  <div className="text-xs text-gray-500 mt-1">{s.metadata.tecnicas}</div>
                )}
                {s.metadata?.notas && (
                  <div className="text-xs text-gray-400 mt-0.5 italic">{s.metadata.notas}</div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
