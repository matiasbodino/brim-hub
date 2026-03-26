import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { MATI_ID, HABITS } from '../lib/constants'

function Heatmap({ data }) {
  // Show last 28 days (4 weeks)
  const days = []
  const d = new Date()
  for (let i = 27; i >= 0; i--) {
    const dd = new Date(d)
    dd.setDate(dd.getDate() - i)
    const key = dd.toISOString().slice(0, 10)
    days.push({ date: key, day: dd.getDay(), score: data[key] || 0 })
  }

  const getColor = (score) => {
    if (score === -1) return 'bg-zinc-800'   // all skips
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
        {/* Pad first week */}
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

export default function Progress() {
  const [heatmapData, setHeatmapData] = useState({})
  const [weightHistory, setWeightHistory] = useState([])
  const [bjjSessions, setBjjSessions] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    const since = thirtyDaysAgo.toISOString().slice(0, 10)

    // Fetch habits for heatmap
    const { data: habits } = await supabase
      .from('habit_logs')
      .select('date, value, target, habit_type, completion_type')
      .eq('user_id', MATI_ID)
      .gte('date', since)
      .order('date', { ascending: true })

    // Calculate daily scores (skips don't count in denominator)
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
      if (d.total === 0) { scores[date] = -1; return }  // all skips
      scores[date] = Math.round((d.completed / d.total) * 100)
    })
    setHeatmapData(scores)

    // Fetch weight history
    const { data: weights } = await supabase
      .from('weight_logs')
      .select('date, weight')
      .eq('user_id', MATI_ID)
      .order('date', { ascending: true })
      .limit(20)
    setWeightHistory(weights || [])

    // Fetch BJJ sessions (last 30 days)
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
