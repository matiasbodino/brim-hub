import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { MATI_ID, HABITS, GYM_EXERCISES } from '../lib/constants'
import { useCycleStore } from '../stores/cycleStore'
import { useGymPrStore } from '../stores/gymPrStore'
import { useJournalStore } from '../stores/journalStore'
import { useInsightsStore } from '../stores/insightsStore'
import { useHabitStore } from '../stores/habitStore'
import { useFoodStore } from '../stores/foodStore'
import { useEnergyStore } from '../stores/energyStore'
import { useTargetsStore } from '../stores/targetsStore'
import { usePointsStore } from '../stores/pointsStore'
import { useRoutineStore } from '../stores/routineStore'
import MonthlyReport from '../components/report/MonthlyReport'
import { WeightChart, HabitWeeklyChart, MacroChart, useTrendData } from '../components/charts/TrendCharts'
import { OneRepMaxChart, BalanceRadar } from '../components/charts/GymCharts'

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
    if (score === -1) return 'bg-gray-800'
    if (score === 0) return 'bg-gray-800/50'
    if (score < 33) return 'bg-emerald-900'
    if (score < 66) return 'bg-emerald-700'
    if (score < 90) return 'bg-emerald-500'
    return 'bg-emerald-400 shadow-sm shadow-emerald-400/30'
  }

  return (
    <div>
      <div className="grid grid-cols-7 gap-1.5">
        {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map(d => (
          <div key={d} className="text-center text-[9px] text-gray-600 font-bold">{d}</div>
        ))}
        {Array.from({ length: (days[0]?.day + 6) % 7 }).map((_, i) => (
          <div key={'pad-' + i} />
        ))}
        {days.map(d => (
          <div
            key={d.date}
            className={`aspect-square rounded-lg ${getColor(d.score)} transition-all`}
            title={d.date + ': ' + d.score + '%'}
          />
        ))}
      </div>
      <div className="flex items-center gap-1.5 mt-3 justify-center">
        <span className="text-[9px] text-gray-600">Menos</span>
        <div className="w-3 h-3 rounded bg-gray-800/50" />
        <div className="w-3 h-3 rounded bg-emerald-900" />
        <div className="w-3 h-3 rounded bg-emerald-700" />
        <div className="w-3 h-3 rounded bg-emerald-500" />
        <div className="w-3 h-3 rounded bg-emerald-400" />
        <span className="text-[9px] text-gray-600">Más</span>
      </div>
    </div>
  )
}

function BioRadar({ todayHabits, macros, targets, todayEnergy }) {
  const pillars = [
    { label: 'Nutrición', pct: macros.calories > 0 ? Math.min(100, Math.round((macros.calories / (targets.calories || 2100)) * 100)) : 0 },
    { label: 'Pasos', pct: Math.min(100, Math.round((Number(todayHabits.steps?.value || 0) / (targets.steps || 10000)) * 100)) },
    { label: 'BJJ', pct: Number(todayHabits.bjj?.value || 0) >= 1 ? 100 : 0 },
    { label: 'Gym', pct: Number(todayHabits.gym?.value || 0) >= 1 ? 100 : 0 },
    { label: 'Agua', pct: Math.min(100, Math.round((Number(todayHabits.water?.value || 0) / (targets.water || 2.5)) * 100)) },
    { label: 'Energía', pct: todayEnergy ? Math.round((todayEnergy / 5) * 100) : 0 },
  ]

  const n = pillars.length
  const cx = 70, cy = 70, r = 55
  const points = pillars.map((p, i) => {
    const angle = (Math.PI * 2 * i / n) - Math.PI / 2
    const pr = r * (p.pct / 100)
    return { x: cx + pr * Math.cos(angle), y: cy + pr * Math.sin(angle), label: p.label, pct: p.pct, lx: cx + (r + 12) * Math.cos(angle), ly: cy + (r + 12) * Math.sin(angle) }
  })
  const polyPoints = points.map(p => `${p.x},${p.y}`).join(' ')

  return (
    <div>
      <svg viewBox="0 0 140 140" className="w-full max-w-[220px] mx-auto">
        {/* Grid rings */}
        {[0.25, 0.5, 0.75, 1].map(scale => (
          <polygon key={scale} points={Array.from({ length: n }).map((_, i) => {
            const a = (Math.PI * 2 * i / n) - Math.PI / 2
            return `${cx + r * scale * Math.cos(a)},${cy + r * scale * Math.sin(a)}`
          }).join(' ')} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="0.5" />
        ))}
        {/* Axis lines */}
        {points.map((p, i) => (
          <line key={i} x1={cx} y1={cy} x2={cx + r * Math.cos((Math.PI * 2 * i / n) - Math.PI / 2)} y2={cy + r * Math.sin((Math.PI * 2 * i / n) - Math.PI / 2)} stroke="rgba(255,255,255,0.05)" strokeWidth="0.5" />
        ))}
        {/* Filled area */}
        <polygon points={polyPoints} fill="rgba(34,197,94,0.15)" stroke="#22c55e" strokeWidth="1.5" />
        {/* Dots */}
        {points.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r="3" fill={p.pct >= 80 ? '#22c55e' : p.pct >= 40 ? '#f59e0b' : '#ef4444'} />
        ))}
        {/* Labels */}
        {points.map((p, i) => (
          <text key={i} x={p.lx} y={p.ly} textAnchor="middle" dominantBaseline="central" fill="#6b7280" fontSize="6" fontWeight="bold">{p.label}</text>
        ))}
      </svg>
    </div>
  )
}

function Trophies({ streak, totalPoints, habits, todayHabits }) {
  const trophies = []
  if (streak >= 3) trophies.push({ icon: '🔥', label: `${streak} días racha`, active: true })
  if (streak >= 7) trophies.push({ icon: '⚡', label: '7+ días', active: true })
  if (totalPoints >= 100) trophies.push({ icon: '💰', label: '100+ pts', active: true })
  if (totalPoints >= 500) trophies.push({ icon: '💎', label: '500+ pts', active: true })

  const waterDone = Number(todayHabits.water?.value || 0) >= 2.5
  const allHabitsDone = habits.every(h => Number(todayHabits[h.type]?.value || 0) >= h.target)
  if (allHabitsDone) trophies.push({ icon: '🏆', label: 'Día perfecto', active: true })
  if (waterDone) trophies.push({ icon: '💧', label: 'Agua ✓', active: true })

  // Placeholder locked trophies
  if (trophies.length < 6) {
    const locked = [
      { icon: '🦍', label: '10 PRs' },
      { icon: '🥋', label: '50 BJJ' },
      { icon: '🚶', label: '100k pasos' },
    ]
    locked.slice(0, 6 - trophies.length).forEach(t => trophies.push({ ...t, active: false }))
  }

  return (
    <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1">
      {trophies.map((t, i) => (
        <div key={i} className={`flex-shrink-0 w-16 text-center ${t.active ? '' : 'opacity-30'}`}>
          <div className={`w-12 h-12 mx-auto rounded-full flex items-center justify-center text-xl ${t.active ? 'bg-amber-500/20 border border-amber-500/30' : 'bg-gray-800 border border-gray-700'}`}>
            {t.icon}
          </div>
          <p className="text-[8px] text-gray-500 font-bold mt-1 leading-tight">{t.label}</p>
        </div>
      ))}
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

function CycleCard({ cycle, targets, weeklyStats, onComplete }) {
  const today = new Date().toISOString().slice(0, 10)
  const totalDays = Math.round((new Date(cycle.ends_at) - new Date(cycle.started_at)) / 86400000) + 1
  const elapsed = Math.max(0, Math.round((new Date(today) - new Date(cycle.started_at)) / 86400000))
  const pct = Math.min(100, Math.round((elapsed / totalDays) * 100))
  const currentWeek = Math.min(4, Math.floor(elapsed / 7) + 1)

  const getColor = (full, target) => {
    if (!target) return 'bg-slate-100'
    const p = (full / target) * 100
    if (p >= 80) return 'bg-emerald-400'
    if (p >= 50) return 'bg-amber-400'
    return 'bg-red-400'
  }

  return (
    <div className="bg-white rounded-[2.5rem] p-6 shadow-sm border border-slate-100">
      <div className="flex justify-between items-center mb-6">
        <h3 className="font-black text-slate-800 tracking-tight">{cycle.name}</h3>
        <span className="text-[10px] font-bold bg-indigo-100 text-indigo-600 px-3 py-1 rounded-full uppercase">
          Semana {currentWeek} de 4
        </span>
      </div>

      {/* Grid de semáforos */}
      <div className="grid grid-cols-5 gap-2 text-center">
        <div className="text-[8px] font-black text-slate-300 uppercase py-2">Hábito</div>
        {[1, 2, 3, 4].map(w => (
          <div key={w} className={`text-[8px] font-black uppercase py-2 ${w === currentWeek ? 'text-indigo-600' : 'text-slate-300'}`}>
            Sem {w}
          </div>
        ))}

        {HABITS.map(h => {
          const t = targets.find(t => t.habit_type === h.type)
          const wt = t ? t.weekly_target : 0
          return [
            <div key={h.type + '-label'} className="text-[10px] font-bold text-slate-500 text-left self-center">
              {h.emoji} {h.label}
            </div>,
            ...weeklyStats.map((week, wi) => {
              const s = week.habits[h.type]
              const full = s ? s.full : 0
              const isFuture = wi + 1 > currentWeek
              return (
                <div key={h.type + '-' + wi} className="flex flex-col items-center gap-0.5">
                  <div className={`h-6 w-6 rounded-lg shadow-sm transition-all ${
                    isFuture ? 'bg-slate-100' : getColor(full, wt)
                  }`} />
                  {!isFuture && wt > 0 && (
                    <span className="text-[8px] text-slate-400">{full}/{wt}</span>
                  )}
                </div>
              )
            })
          ]
        })}
      </div>

      {/* Barra de progreso del ciclo */}
      <div className="mt-8 pt-6 border-t border-slate-50">
        <div className="flex justify-between items-center mb-2">
          <p className="text-[10px] font-black text-slate-400 uppercase">Progreso del ciclo</p>
          <p className="text-[10px] font-bold text-indigo-600">{pct}%</p>
        </div>
        <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden">
          <div className="h-full bg-indigo-600 rounded-full transition-all duration-1000" style={{ width: pct + '%' }} />
        </div>
        <div className="flex justify-between text-[10px] text-slate-400 mt-1.5">
          <span>{new Date(cycle.started_at + 'T12:00:00').toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })}</span>
          <span>{new Date(cycle.ends_at + 'T12:00:00').toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })}</span>
        </div>
      </div>

      <button
        onClick={onComplete}
        className="w-full mt-6 py-3 text-xs text-slate-400 font-bold border border-slate-200 rounded-2xl active:bg-slate-50 transition"
      >
        Cerrar ciclo
      </button>
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
    <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-4 border border-white/10 space-y-4">
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
  const [selectedExercise, setSelectedExercise] = useState(null)
  const [prWeight, setPrWeight] = useState('')
  const [prReps, setPrReps] = useState('')
  const [prNotes, setPrNotes] = useState('')
  const [expandedExercise, setExpandedExercise] = useState(null)
  const [customExercise, setCustomExercise] = useState('')
  const [showCustomInput, setShowCustomInput] = useState(false)
  const [expandedCheckin, setExpandedCheckin] = useState(null)
  const [expandedCycle, setExpandedCycle] = useState(null)
  const { weightData: trendWeights, habitWeeklyData, macroData, loading: trendsLoading } = useTrendData()
  const [showWeightChart, setShowWeightChart] = useState(false)
  const [showHabitChart, setShowHabitChart] = useState(false)
  const [showMacroChart, setShowMacroChart] = useState(false)
  const { todayHabits } = useHabitStore()
  const { getTodayMacros } = useFoodStore()
  const { todayEnergy } = useEnergyStore()
  const { targets } = useTargetsStore()
  const { totalPoints, streak } = usePointsStore()
  const dashMacros = getTodayMacros()

  const { activeCycle, cycleTargets, weeklyStats, pastCycles, loading: cycleLoading, fetchActive, fetchPast, createCycle, completeCycle } = useCycleStore()
  const { prs, fetchPRs, addPR, deletePR, getMaxPR, getExercises } = useGymPrStore()
  var { monthEntries, fetchMonth } = useJournalStore()
  const { insights, userModel, generating, lastGenerated, fetchInsights, fetchUserModel, generateInsights, dismissInsight } = useInsightsStore()
  const { routine, loading: routineLoading, generateRoutine, clearRoutine } = useRoutineStore()
  const progressNavigate = useNavigate()
  const [routineTime, setRoutineTime] = useState(60)
  const [routineFocus, setRoutineFocus] = useState('fuerza')
  const [showInsights, setShowInsights] = useState(false)
  const [showUserModel, setShowUserModel] = useState(false)

  useEffect(() => {
    loadData()
    fetchActive()
    fetchPast()
    fetchPRs()
    fetchInsights()
    fetchUserModel()
    var ym = new Date().toISOString().slice(0, 7)
    fetchMonth(ym)
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
      .select('date, weight, notes')
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
    <div className="min-h-screen bg-[#0a0a0a] px-4 py-5 pb-24 space-y-4 max-w-lg mx-auto">
      <h1 className="text-xl font-black text-white tracking-tight">Progreso</h1>

      {/* ═══ TROPHIES ═══ */}
      <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-4 border border-white/10">
        <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-3">Logros</p>
        <Trophies streak={streak} totalPoints={totalPoints} habits={HABITS} todayHabits={todayHabits} />
      </div>

      {/* ═══ BIO-BALANCE RADAR ═══ */}
      <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-4 border border-white/10">
        <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-2">Bio-Balance (6 Pilares)</p>
        <BioRadar todayHabits={todayHabits} macros={dashMacros} targets={targets} todayEnergy={todayEnergy} />
      </div>

      {/* Active Cycle */}
      {activeCycle ? (
        <CycleCard cycle={activeCycle} targets={cycleTargets} weeklyStats={weeklyStats} onComplete={() => completeCycle('')} />
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
      <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-4 border border-white/10">
        <h2 className="text-sm font-semibold text-gray-300 mb-3">Últimos 28 días</h2>
        <Heatmap data={heatmapData} />
      </div>

      {/* AI Insights */}
      <div className="bg-white rounded-[2rem] p-5 border border-slate-100 shadow-sm">
        <div className="flex items-center justify-between mb-3 cursor-pointer" onClick={() => setShowInsights(!showInsights)}>
          <div className="flex items-center gap-2">
            <span className="text-base">🧠</span>
            <h2 className="text-sm font-bold text-slate-800">Lo que la AI aprendió de vos</h2>
          </div>
          <div className="flex items-center gap-2">
            {lastGenerated && (
              <span className="text-[10px] text-slate-400">
                {(() => {
                  const diff = Math.round((Date.now() - new Date(lastGenerated).getTime()) / 86400000)
                  return diff === 0 ? 'Hoy' : diff === 1 ? 'Ayer' : `Hace ${diff} días`
                })()}
              </span>
            )}
            <span className={`text-slate-400 transition-transform duration-300 text-xs ${showInsights ? 'rotate-180' : ''}`}>▼</span>
          </div>
        </div>

        {showInsights && (
          <div className="space-y-3 animate-fade-in">
            {/* User Model expandible */}
            {userModel && (
              <div className="bg-slate-900 rounded-2xl p-4 text-white">
                <div className="flex items-center justify-between cursor-pointer" onClick={() => setShowUserModel(!showUserModel)}>
                  <span className="text-xs font-bold text-indigo-300 uppercase tracking-widest">📋 Tu perfil AI v{userModel.model_version}</span>
                  <span className={`text-slate-400 text-xs transition-transform duration-300 ${showUserModel ? 'rotate-180' : ''}`}>▼</span>
                </div>
                {showUserModel && (
                  <div className="mt-3 text-sm text-slate-300 leading-relaxed whitespace-pre-line">
                    {userModel.model_content}
                  </div>
                )}
              </div>
            )}

            {/* Insight cards */}
            {insights.length > 0 ? (
              insights.map(insight => {
                const typeEmoji = { correlation: '🔗', food_preference: '🍽', behavior_pattern: '📅', trend: '📈', motivation: '💪' }
                const conf = insight.confidence
                const confColor = conf >= 0.8 ? 'bg-green-500' : conf >= 0.6 ? 'bg-yellow-500' : 'bg-orange-500'
                return (
                  <div key={insight.id} className="bg-white rounded-2xl p-4 border border-slate-100 relative animate-fade-in">
                    <button
                      onClick={() => dismissInsight(insight.id)}
                      className="absolute top-3 right-3 text-slate-300 hover:text-red-400 text-xs p-1"
                    >✕</button>
                    <div className="flex items-start gap-3">
                      <span className="text-xl">{typeEmoji[insight.insight_type] || '🔍'}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-800">{insight.insight_value?.pattern}</p>
                        <p className="text-xs text-slate-500 mt-1">{insight.insight_value?.suggestion}</p>
                        <div className="flex items-center gap-3 mt-2">
                          <div className="flex items-center gap-1.5">
                            <div className={`h-1 w-12 rounded-full ${confColor}`} />
                            <span className="text-[10px] text-slate-400">{Math.round(conf * 100)}%</span>
                          </div>
                          {insight.evidence_count > 0 && (
                            <span className="text-[10px] text-slate-400">basado en {insight.evidence_count} datos</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })
            ) : (
              <p className="text-xs text-slate-400 text-center py-2 italic">Tu AI todavía no te conoce. Dale a Generar y dejá que te analice 🧠</p>
            )}

            {/* Generate / Regenerate button */}
            <button
              onClick={generateInsights}
              disabled={generating}
              className="w-full py-3 text-xs font-bold text-indigo-600 bg-indigo-50 rounded-2xl active:scale-95 transition disabled:opacity-50"
            >
              {generating ? 'Analizando 90 días...' : insights.length > 0 ? '🔄 Regenerar análisis' : '✨ Generar análisis'}
            </button>
          </div>
        )}
      </div>

      {/* Trends */}
      {!trendsLoading && (
        <>
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <div className="flex items-center justify-between p-4 cursor-pointer" onClick={() => setShowWeightChart(!showWeightChart)}>
              <h2 className="text-sm font-semibold text-gray-300">{'\u2696\uFE0F'} Tendencia de peso</h2>
              <span className="text-xs text-gray-400">{showWeightChart ? '\u25B2' : '\u25BC'}</span>
            </div>
            {showWeightChart && <div className="px-2 pb-4"><WeightChart data={trendWeights} /></div>}
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <div className="flex items-center justify-between p-4 cursor-pointer" onClick={() => setShowHabitChart(!showHabitChart)}>
              <h2 className="text-sm font-semibold text-gray-300">{'\uD83D\uDCCA'} Habitos por semana</h2>
              <span className="text-xs text-gray-400">{showHabitChart ? '\u25B2' : '\u25BC'}</span>
            </div>
            {showHabitChart && <div className="px-2 pb-4"><HabitWeeklyChart data={habitWeeklyData} /></div>}
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <div className="flex items-center justify-between p-4 cursor-pointer" onClick={() => setShowMacroChart(!showMacroChart)}>
              <h2 className="text-sm font-semibold text-gray-300">{'\uD83C\uDF7D'} Macros diarios</h2>
              <span className="text-xs text-gray-400">{showMacroChart ? '\u25B2' : '\u25BC'}</span>
            </div>
            {showMacroChart && <div className="px-2 pb-4"><MacroChart data={macroData} /></div>}
          </div>
        </>
      )}

      {/* Weight trend + baseline */}
      <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-4 border border-white/10">
        <h2 className="text-sm font-semibold text-gray-300 mb-3">Peso</h2>
        {weightHistory.length === 0 ? (
          <p className="text-sm text-gray-500 italic">El gráfico de peso está esperando tus datos... no le tengas miedo ⚖️</p>
        ) : (
          <div className="space-y-2">
            {/* Baseline comparison */}
            {weightHistory.length >= 3 && (() => {
              const recent = weightHistory.slice(-3)
              const avg = Math.round(recent.reduce((a, w) => a + w.weight, 0) / recent.length * 10) / 10
              const current = weightHistory[weightHistory.length - 1].weight
              const diff = (current - avg).toFixed(1)
              const pct = ((current - avg) / avg * 100).toFixed(1)
              return (
                <div className="bg-white/5 rounded-xl p-3 mb-3 flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-400">Actual vs promedio 3 días</p>
                    <p className="text-lg font-black text-white">{current} kg</p>
                  </div>
                  <div className={`text-right ${Number(diff) <= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    <p className="text-lg font-black">{Number(diff) > 0 ? '↑' : '↓'} {Math.abs(Number(pct))}%</p>
                    <p className="text-[10px]">{Number(diff) > 0 ? '+' : ''}{diff} kg vs prom</p>
                  </div>
                </div>
              )
            })()}
            {weightHistory.slice(-5).map(w => (
              <div key={w.date} className="flex justify-between text-sm">
                <span className="text-gray-500">
                  {new Date(w.date + 'T12:00:00').toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })}
                </span>
                <span className="font-bold text-gray-300">{w.weight} kg</span>
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

      {/* Check-ins */}
      {(() => {
        const checkins = weightHistory.filter(w => w.notes !== null).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 10)
        if (checkins.length === 0) return null
        return (
          <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-4 border border-white/10">
            <h2 className="text-sm font-semibold text-gray-300 mb-3">📋 Check-ins semanales</h2>
            <div className="space-y-0">
              {checkins.map(w => (
                <div key={w.date}>
                  <div
                    className="flex items-center justify-between py-3 border-b border-gray-100 cursor-pointer"
                    onClick={() => setExpandedCheckin(expandedCheckin === w.date ? null : w.date)}
                  >
                    <span className="text-sm text-gray-600">
                      {new Date(w.date + 'T12:00:00').toLocaleDateString('es-AR', { weekday: 'short', day: 'numeric', month: 'short' })}
                    </span>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-bold text-gray-800">{w.weight} kg</span>
                      <span className="text-xs text-gray-400">{expandedCheckin === w.date ? '▲' : '▼'}</span>
                    </div>
                  </div>
                  {expandedCheckin === w.date && (
                    <p className="text-gray-500 text-sm py-2 leading-relaxed">{w.notes}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )
      })()}

      {/* Routine Generator */}
      <div className="bg-white/80 backdrop-blur-md rounded-[2rem] p-5 border border-white/20 shadow-[0_2px_15px_-3px_rgba(0,0,0,0.05)]">
        <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 px-1">🏋️ Generador de Rutina</h2>

        {routine ? (
          <div className="space-y-3">
            {routine.is_deload && (
              <div className="bg-amber-50 rounded-xl px-4 py-3 mb-3 flex items-start gap-2">
                <span className="text-lg">⚠️</span>
                <div>
                  <p className="text-xs font-black text-amber-700">Deload Workout</p>
                  <p className="text-[10px] text-amber-600">Pesos al 70%. Hoy se trabaja técnica y movilidad.</p>
                </div>
              </div>
            )}
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-black text-slate-800">{routine.routine_name}</h3>
              <div className="flex gap-1.5">
                {routine.is_deload && <span className="text-[10px] font-bold bg-amber-100 text-amber-700 px-2 py-1 rounded-full">DELOAD</span>}
                <span className="text-[10px] font-bold bg-indigo-100 text-indigo-600 px-2 py-1 rounded-full">{routine.estimated_time} min</span>
              </div>
            </div>

            {routine.exercises?.map((ex, i) => (
              <div key={i} className={`rounded-xl p-3 ${ex.category === 'main_lift' ? 'bg-indigo-50 border border-indigo-100' : 'bg-slate-50'}`}>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-slate-800">{ex.name}</span>
                  <span className="text-xs text-slate-500">{ex.sets} × {ex.target_reps} @ {ex.target_weight}kg</span>
                </div>
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-[10px] text-slate-400">Descanso: {ex.rest_seconds}s</span>
                  {ex.notes && <span className="text-[10px] text-slate-400 italic">{ex.notes}</span>}
                </div>
              </div>
            ))}

            {routine.coach_note && (
              <p className="text-xs text-slate-500 italic text-center mt-2">"{routine.coach_note}"</p>
            )}

            <button
              onClick={() => progressNavigate('/workout', { state: { routine } })}
              className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black active:scale-[0.98] transition-all mt-2"
            >
              🏋️ Arrancar Entrenamiento
            </button>
            <button onClick={clearRoutine} className="w-full text-xs text-slate-400 font-bold mt-1 py-2">
              Generar otra
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex gap-2">
              <div className="flex-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Tiempo</label>
                <div className="flex gap-1.5 mt-1">
                  {[45, 60, 75, 90].map(t => (
                    <button key={t} onClick={() => setRoutineTime(t)}
                      className={`flex-1 min-h-[44px] py-2 text-xs font-bold rounded-full transition-all ${routineTime === t ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500'}`}>
                      {t}'
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase">Foco</label>
              <div className="flex gap-1.5 mt-1">
                {[{ id: 'fuerza', label: '💪 Fuerza' }, { id: 'bjj', label: '🥋 BJJ' }, { id: 'estetica', label: '🪞 Estética' }].map(f => (
                  <button key={f.id} onClick={() => setRoutineFocus(f.id)}
                    className={`flex-1 min-h-[44px] py-2.5 text-xs font-bold rounded-full transition-all ${routineFocus === f.id ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500'}`}>
                    {f.label}
                  </button>
                ))}
              </div>
            </div>
            <button
              onClick={() => generateRoutine(routineTime, routineFocus)}
              disabled={routineLoading}
              className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black active:scale-[0.98] transition-all disabled:opacity-50"
            >
              {routineLoading ? 'Armando rutina...' : 'Generar Rutina'}
            </button>
          </div>
        )}
      </div>

      {/* 1RM Estimated Chart */}
      {prs.length >= 2 && (
        <div className="bg-white/80 backdrop-blur-md rounded-[2rem] p-5 border border-white/20 shadow-[0_2px_15px_-3px_rgba(0,0,0,0.05)]">
          <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 px-1">📈 1RM Estimado (Big Lifts)</h2>
          <OneRepMaxChart prs={prs} />
        </div>
      )}

      {/* Muscle Balance Radar */}
      {prs.length >= 3 && (
        <div className="bg-white/80 backdrop-blur-md rounded-[2rem] p-5 border border-white/20 shadow-[0_2px_15px_-3px_rgba(0,0,0,0.05)]">
          <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 px-1">🎯 Balance Muscular</h2>
          <BalanceRadar prs={prs} />
        </div>
      )}

      {/* Gym PRs */}
      <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-4 border border-white/10">
        <h2 className="text-sm font-semibold text-gray-300 mb-3">🏋️ PRs de Gym</h2>

        {selectedExercise ? (
          <div className="space-y-3">
            <h3 className="font-semibold text-gray-800">Nuevo PR — {selectedExercise}</h3>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-gray-500">Peso (kg)</label>
                <input type="number" step="0.5" value={prWeight} onChange={e => setPrWeight(e.target.value)}
                  placeholder="kg" className="w-full px-3 py-2 rounded-xl border border-gray-200 text-base mt-1" />
              </div>
              <div>
                <label className="text-xs text-gray-500">Reps</label>
                <input type="number" value={prReps} onChange={e => setPrReps(e.target.value)}
                  placeholder="reps" className="w-full px-3 py-2 rounded-xl border border-gray-200 text-base mt-1" />
              </div>
            </div>
            <div>
              <label className="text-xs text-gray-500">Notas (opcional)</label>
              <input type="text" value={prNotes} onChange={e => setPrNotes(e.target.value)}
                placeholder="Notas..." className="w-full px-3 py-2 rounded-xl border border-gray-200 text-base mt-1" />
            </div>
            <div className="flex gap-2">
              <button onClick={() => setSelectedExercise(null)}
                className="flex-1 py-2 text-sm font-semibold rounded-xl border border-gray-200 text-gray-600">Cancelar</button>
              <button
                onClick={async () => {
                  await addPR(selectedExercise, prWeight, prReps, prNotes)
                  setPrWeight(''); setPrReps(''); setPrNotes(''); setSelectedExercise(null)
                }}
                disabled={!prWeight || !prReps}
                className="flex-1 py-2 text-sm font-semibold rounded-xl bg-violet-600 text-white disabled:opacity-40">
                Guardar PR
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-1">
            {getExercises(GYM_EXERCISES).map(ex => {
              const maxPr = getMaxPR(ex)
              const isExpanded = expandedExercise === ex
              const history = prs.filter(p => p.exercise === ex).slice(0, 5)
              return (
                <div key={ex}>
                  <div className="flex items-center justify-between py-2 border-b border-gray-100">
                    <button onClick={() => setExpandedExercise(isExpanded ? null : ex)}
                      className="flex items-center gap-2 text-left flex-1">
                      <span className="text-xs text-gray-400">{isExpanded ? '▲' : '▼'}</span>
                      <span className="text-sm text-gray-700">{ex}</span>
                    </button>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-gray-800">
                        {maxPr ? (Number(maxPr.weight) + 'kg × ' + maxPr.reps) : '—'}
                      </span>
                      <button onClick={() => setSelectedExercise(ex)}
                        className="text-xs text-violet-600 font-semibold px-2 py-1 rounded-lg bg-violet-50 active:bg-violet-100">
                        + PR
                      </button>
                    </div>
                  </div>
                  {isExpanded && history.length > 0 && (
                    <div className="bg-gray-50 rounded-xl p-2 my-1 space-y-1">
                      {history.map(p => (
                        <div key={p.id} className="flex items-center justify-between text-xs px-2 py-1">
                          <span className="text-gray-500">
                            {new Date(p.date + 'T12:00:00').toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })}
                          </span>
                          <span className="text-gray-700 font-semibold">{Number(p.weight)}kg × {p.reps}</span>
                          {p.notes && <span className="text-gray-400 italic truncate max-w-[80px]">{p.notes}</span>}
                          <button onClick={() => deletePR(p.id)} className="text-gray-300 hover:text-red-400 ml-1">🗑️</button>
                        </div>
                      ))}
                    </div>
                  )}
                  {isExpanded && history.length === 0 && (
                    <p className="text-xs text-slate-400 py-2 pl-6 italic">Todavía no hay PRs acá. Metele fierro y volvé 💪</p>
                  )}
                </div>
              )
            })}

            {showCustomInput ? (
              <div className="flex gap-2 mt-2">
                <input type="text" value={customExercise} onChange={e => setCustomExercise(e.target.value)}
                  placeholder="Nombre del ejercicio"
                  className="flex-1 px-3 py-2 rounded-xl border border-gray-200 text-sm" />
                <button
                  onClick={async () => {
                    if (!customExercise.trim()) return
                    await addPR(customExercise.trim(), 0, 0, 'ejercicio agregado')
                    setCustomExercise(''); setShowCustomInput(false)
                  }}
                  className="px-3 py-2 text-sm font-semibold rounded-xl bg-violet-600 text-white">
                  Agregar
                </button>
              </div>
            ) : (
              <button onClick={() => setShowCustomInput(true)}
                className="w-full mt-2 py-2 text-xs text-violet-600 font-semibold border border-dashed border-violet-300 rounded-xl active:bg-violet-50">
                + Ejercicio custom
              </button>
            )}
          </div>
        )}
      </div>

      {/* Journal */}
      {monthEntries.length > 0 && (
        <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-4 border border-white/10">
          <h2 className="text-sm font-semibold text-gray-300 mb-3">{'\u{1F4DD}'} Journal</h2>
          <div className="space-y-2">
            {monthEntries.slice(0, 10).map(function(e) {
              var moodEmoji = e.mood ? ['', '\u{1F62B}', '\u{1F615}', '\u{1F610}', '\u{1F60A}', '\u{1F525}'][e.mood] : ''
              return (
                <div key={e.id} className="flex items-start gap-2 py-2 border-b border-gray-50">
                  <span className="text-xs text-gray-400 min-w-[60px]">
                    {new Date(e.date + 'T12:00:00').toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })}
                  </span>
                  <span className="text-sm text-gray-600 flex-1">{e.content}</span>
                  {moodEmoji && <span className="text-sm">{moodEmoji}</span>}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* BJJ Journal */}
      <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-4 border border-white/10">
        <h2 className="text-sm font-semibold text-gray-300 mb-3">🥋 BJJ Journal</h2>
        {bjjSessions.length === 0 ? (
          <p className="text-sm text-slate-400 italic">El mat te extraña. Anotá tu próximo treino y arrancamos el journal 🥋</p>
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

      {/* Monthly Report */}
      <MonthlyReport />

      {/* Past Cycles */}
      {pastCycles.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-gray-300 mb-3">Ciclos anteriores</h2>
          {pastCycles.map(cycle => {
            const isExpanded = expandedCycle === cycle.id
            const statusBadge = cycle.status === 'completed'
              ? <span className="text-xs bg-emerald-100 text-emerald-700 rounded-full px-2 py-0.5">✓ Completado</span>
              : <span className="text-xs bg-gray-100 text-gray-500 rounded-full px-2 py-0.5">Abandonado</span>
            return (
              <div key={cycle.id} className="bg-white/5 backdrop-blur-sm rounded-2xl p-4 border border-white/10 mb-3">
                <div
                  className="flex items-center justify-between cursor-pointer"
                  onClick={() => setExpandedCycle(isExpanded ? null : cycle.id)}
                >
                  <div>
                    <div className="font-semibold text-gray-900 text-sm">{cycle.name}</div>
                    <div className="text-xs text-gray-400 mt-0.5">
                      {new Date(cycle.started_at + 'T12:00:00').toLocaleDateString('es-AR', {day:'numeric',month:'short'})}
                      {' → '}
                      {new Date(cycle.ends_at + 'T12:00:00').toLocaleDateString('es-AR', {day:'numeric',month:'short'})}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {statusBadge}
                    <span className="text-xs text-gray-400">{isExpanded ? '▲' : '▼'}</span>
                  </div>
                </div>
                {isExpanded && (
                  <div className="mt-3 pt-3 border-t border-gray-100">
                    {cycle.weeklyStats && cycle.weeklyStats.length > 0 ? (
                      <table className="w-full text-xs">
                        <thead>
                          <tr>
                            <th className="text-left text-gray-400 font-medium pb-2 pr-2"></th>
                            {HABITS.map(h => (
                              <th key={h.type} className="text-center font-medium pb-2 text-gray-400">{h.emoji}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {cycle.weeklyStats.map((week, wi) => (
                            <tr key={wi}>
                              <td className="py-1.5 pr-2 text-gray-500 font-medium">S{week.weekNum}</td>
                              {HABITS.map(h => {
                                const stat = week.habits[h.type]
                                const light = stat ? (
                                  !stat.weeklyTarget ? '·' :
                                  (stat.full / stat.weeklyTarget * 100) >= 80 ? '🟢' :
                                  (stat.full / stat.weeklyTarget * 100) >= 50 ? '🟡' : '🔴'
                                ) : '·'
                                return (
                                  <td key={h.type} className="text-center py-1.5">
                                    <div>{light}</div>
                                    {stat && stat.weeklyTarget ? (
                                      <div className="text-gray-400 mt-0.5">{stat.full}/{stat.weeklyTarget}</div>
                                    ) : null}
                                  </td>
                                )
                              })}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : (
                      <p className="text-sm text-slate-400 italic">Este ciclo no juntó data suficiente. El próximo va a ser distinto 📊</p>
                    )}
                    {cycle.reflection && (
                      <p className="text-sm text-gray-400 italic mt-3 pt-2 border-t border-gray-100">
                        {cycle.reflection}
                      </p>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
