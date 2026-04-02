import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useFoodStore } from '../stores/foodStore'
import { useHabitStore } from '../stores/habitStore'
import { usePointsStore } from '../stores/pointsStore'
import { useCycleStore } from '../stores/cycleStore'
import { HABITS } from '../lib/constants'
import { useTargetsStore } from '../stores/targetsStore'
import ShareButton from '../components/ShareButton'
import WeeklyDigest from '../components/digest/WeeklyDigest'
import MicroJournal from '../components/journal/MicroJournal'
import { track } from '../lib/analytics'
import { useBJJTheme } from '../hooks/useBJJTheme'
import { useInsightsStore } from '../stores/insightsStore'

function MacroRing({ label, current, target, color, textColor }) {
  const pct = target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 0
  return (
    <div className="flex-1 text-center">
      <div className="relative w-14 h-14 mx-auto mb-1">
        <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
          <circle cx="18" cy="18" r="15.5" fill="none" stroke="#f1f5f9" strokeWidth="3" />
          <circle cx="18" cy="18" r="15.5" fill="none" stroke={color} strokeWidth="3"
            strokeDasharray={`${pct} 100`} strokeLinecap="round" className="transition-all duration-1000" />
        </svg>
        <span className={`absolute inset-0 flex items-center justify-center text-xs font-bold ${textColor}`}>{pct}%</span>
      </div>
      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">{label}</p>
      <p className="text-xs font-semibold text-slate-600">{current}/{target}</p>
    </div>
  )
}

function HabitRow({ label, done, emoji, cue, identity }) {
  return (
    <div className={`flex items-center p-4 rounded-3xl border transition-all duration-300 ${
      done
        ? 'bg-slate-100 border-transparent opacity-60 scale-[0.98]'
        : 'bg-white border-slate-100 shadow-sm'
    }`}>
      <span className="text-3xl mr-4">{emoji}</span>
      <div className="flex-1 min-w-0">
        <h4 className="font-bold text-slate-800 leading-tight">{label}</h4>
        <p className="text-[10px] text-slate-400 font-medium truncate">
          {done ? identity : cue}
        </p>
      </div>
      {done && (
        <span className="ml-auto w-8 h-8 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center text-sm font-bold flex-shrink-0">✓</span>
      )}
    </div>
  )
}

export default function Dashboard() {
  const { todayLogs, fetchToday: fetchFood, getTodayMacros, deleteLog } = useFoodStore()
  const { todayHabits, fetchToday: fetchHabits } = useHabitStore()
  const { totalPoints, spentPoints, streak, loading: pointsLoading, fetchAll, getLevel } = usePointsStore()
  const { activeCycle, weeklyStats, fetchActive } = useCycleStore()
  const { targets, fetchTargets } = useTargetsStore()

  const { userModel, lastGenerated, fetchUserModel } = useInsightsStore()

  useEffect(() => {
    fetchFood()
    fetchHabits()
    fetchAll()
    fetchActive()
    fetchTargets()
    fetchUserModel()
    track('app_open')
  }, [])

  const macros = getTodayMacros()
  const balance = totalPoints - spentPoints
  const { colors: themeColors } = useBJJTheme()
  const { current: level, next: nextLevel } = getLevel()

  const completedHabits = HABITS.filter(h => {
    const log = todayHabits[h.type]
    return log && Number(log.value) >= h.target
  }).length
  const score = HABITS.length > 0 ? Math.round((completedHabits / HABITS.length) * 100) : 0
  const isSunday = new Date().getDay() === 0

  const currentWeekIndex = activeCycle ? (() => {
    const today = new Date()
    const started = new Date(activeCycle.started_at + 'T12:00:00')
    const diffDays = Math.floor((today - started) / (1000 * 60 * 60 * 24))
    return Math.min(Math.floor(diffDays / 7), 3)
  })() : null
  const currentWeekStats = weeklyStats?.[currentWeekIndex] ?? null

  const getLight = (full, target) => {
    if (!target) return '·'
    const pct = (full / target) * 100
    if (pct >= 80) return '🟢'
    if (pct >= 50) return '🟡'
    return '🔴'
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-28 px-4 pt-6 max-w-lg mx-auto">
      {/* Header */}
      <header className="flex justify-between items-end mb-8 px-1">
        <div>
          <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Brim Hub</p>
          <h1 className="text-3xl font-bold text-slate-900">Hola, Mati</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            {new Date().toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ShareButton cardProps={{
            score,
            streak,
            level,
            credits: balance,
            cycleName: activeCycle?.name ?? null,
            cycleWeek: currentWeekIndex !== null ? currentWeekIndex + 1 : null,
            habits: HABITS.map(h => ({
              label: h.label,
              emoji: h.emoji,
              done: todayHabits[h.type] && Number(todayHabits[h.type].value) >= h.target,
            })),
            date: new Date().toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' }),
          }} />
          <div className="text-right">
            <div className="text-2xl">{level.badge}</div>
            <div className="text-[10px] text-slate-400 font-medium">{level.name}</div>
          </div>
        </div>
      </header>

      {/* Sunday check-in banner */}
      {isSunday && (
        <Link to="/checkin" className="block mb-6">
          <div className="bg-violet-950 border border-violet-700 rounded-3xl p-5 flex items-center justify-between">
            <div>
              <p className="text-violet-300 text-sm font-medium">Domingo 📋</p>
              <p className="text-white font-semibold">Hacé tu check-in semanal</p>
              <p className="text-zinc-400 text-xs mt-0.5">Peso · reflexión · cómo fue la semana</p>
            </div>
            <span className="text-violet-400 text-xl">→</span>
          </div>
        </Link>
      )}

      {/* Bento Grid de Stats */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        {/* Card Principal: Score — themed by BJJ belt */}
        <div
          className="col-span-2 rounded-[2.5rem] p-6 shadow-xl relative overflow-hidden transition-colors duration-1000"
          style={{ backgroundColor: themeColors.primary, color: themeColors.text }}
        >
          <div className="relative z-10">
            <p className="text-xs font-bold uppercase tracking-widest opacity-70 mb-3">Nivel Actual</p>
            <div className="flex items-center gap-2 mb-4">
              <h2 className="text-3xl font-black">{level.badge} {level.name}</h2>
            </div>
            <div className="flex items-baseline gap-2">
              <h2 className="text-6xl font-black">{score}%</h2>
              <span className="text-xs font-bold uppercase opacity-60">completado</span>
            </div>
            <div className="mt-4 flex items-center gap-2">
              <div className="h-2 flex-1 rounded-full overflow-hidden" style={{ backgroundColor: themeColors.accent + '40' }}>
                <div className="h-full bg-white rounded-full transition-all duration-1000" style={{ width: `${score}%` }} />
              </div>
              <span className="text-xs font-semibold opacity-70">{completedHabits}/{HABITS.length}</span>
            </div>
          </div>
          <div className="absolute -right-4 -bottom-4 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
        </div>

        {/* Card de Créditos */}
        <Link to="/permitidos" className="block">
          <div className="bg-gradient-to-br from-amber-400 to-orange-500 rounded-[2rem] p-5 text-white shadow-lg shadow-orange-100 h-full">
            <div className="flex justify-between items-start mb-2">
              <span className="text-lg">💰</span>
              <span className="text-[10px] font-black bg-white/20 px-2 py-0.5 rounded-full uppercase">Balance</span>
            </div>
            <p className="text-3xl font-black">{balance}</p>
            <p className="text-[10px] opacity-90 mt-1 font-medium">créditos disponibles</p>
          </div>
        </Link>

        {/* Card de Racha */}
        <div className="bg-gradient-to-br from-emerald-400 to-teal-600 rounded-[2rem] p-5 text-white shadow-lg shadow-emerald-100">
          <div className="flex justify-between items-start mb-2">
            <span className="text-lg">🔥</span>
            <span className="text-[10px] font-black bg-white/20 px-2 py-0.5 rounded-full uppercase">Streak</span>
          </div>
          <p className="text-3xl font-black">{streak} días</p>
          <p className="text-[10px] opacity-90 mt-1 font-medium">Never miss twice!</p>
        </div>
      </div>

      {/* Level progress */}
      {nextLevel && (
        <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm mb-6">
          <div className="flex justify-between text-xs mb-2">
            <span className="text-slate-400 font-medium">{level.badge} {level.name}</span>
            <span className="font-bold text-slate-600">{totalPoints} / {nextLevel.min} pts</span>
          </div>
          <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-all duration-1000" style={{
              width: Math.min(100, Math.round(((totalPoints - level.min) / (nextLevel.min - level.min)) * 100)) + '%'
            }} />
          </div>
          <p className="text-[10px] text-slate-400 mt-1.5 text-right">
            {nextLevel.badge} {nextLevel.name} en {nextLevel.min - totalPoints} pts
          </p>
        </div>
      )}

      {/* Active cycle card */}
      {activeCycle && currentWeekStats && (
        <Link to="/progress" className="block mb-6">
          <div className="bg-zinc-900 border border-zinc-700 rounded-3xl p-5">
            <div className="flex justify-between items-center mb-3">
              <div>
                <p className="text-xs text-zinc-500 uppercase tracking-widest">
                  Ciclo activo · Semana {currentWeekIndex + 1}/4
                </p>
                <p className="text-white font-semibold">{activeCycle.name}</p>
              </div>
              <span className="text-zinc-400 text-sm">→</span>
            </div>
            <div className="flex gap-4">
              {HABITS.map(h => {
                const stat = currentWeekStats.habits[h.type]
                const light = stat ? getLight(stat.full, stat.weeklyTarget) : '·'
                return (
                  <div key={h.type} className="flex flex-col items-center gap-0.5">
                    <span className="text-lg">{light}</span>
                    <span className="text-xs text-zinc-500">{h.emoji}</span>
                    {stat && (
                      <span className="text-xs text-zinc-600">
                        {stat.full}/{stat.weeklyTarget}
                      </span>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </Link>
      )}

      {/* Weekly Digest */}
      <WeeklyDigest />

      {/* AI Indicator */}
      <Link to="/progress" className="block">
        {userModel ? (
          <div className="bg-violet-50 rounded-xl p-3 flex items-center justify-between">
            <span className="text-xs font-medium text-violet-600">
              🧠 AI actualizada · {(() => {
                if (!lastGenerated) return ''
                const diff = Math.round((Date.now() - new Date(lastGenerated).getTime()) / 86400000)
                return diff === 0 ? 'hoy' : diff === 1 ? 'ayer' : `hace ${diff} días`
              })()}
            </span>
            <span className="text-violet-400 text-xs">→</span>
          </div>
        ) : (
          <div className="bg-violet-50 rounded-xl p-3 flex items-center justify-between">
            <span className="text-xs font-medium text-violet-600">🧠 Activá tu AI personalizada</span>
            <span className="text-violet-400 text-xs">→</span>
          </div>
        )}
      </Link>

      {/* Macros - Ring Style */}
      <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm mt-6 mb-6">
        <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 px-1">Macros del día</h2>
        <div className="flex gap-2">
          <MacroRing label="Kcal" current={macros.calories} target={targets.calories} color="#8b5cf6" textColor="text-violet-600" />
          <MacroRing label="Prot" current={Math.round(macros.protein)} target={targets.protein} color="#3b82f6" textColor="text-blue-600" />
          <MacroRing label="Carbs" current={Math.round(macros.carbs)} target={targets.carbs} color="#f59e0b" textColor="text-amber-600" />
          <MacroRing label="Grasa" current={Math.round(macros.fat)} target={targets.fat} color="#ef4444" textColor="text-red-500" />
        </div>
      </div>

      {/* Micro-Journal */}
      <MicroJournal />

      {/* Habits */}
      <section className="mt-6 space-y-4">
        <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest px-1">Hábitos de Hoy</h3>
        <div className="grid gap-3">
          {HABITS.map(h => (
            <HabitRow
              key={h.type}
              label={h.label}
              emoji={h.emoji}
              cue={h.cue}
              identity={h.identity}
              done={todayHabits[h.type] && Number(todayHabits[h.type].value) >= h.target}
            />
          ))}
        </div>
      </section>

      {/* Food logs */}
      {todayLogs.length > 0 && (
        <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm mt-6">
          <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3 px-1">Comidas de hoy</h2>
          <div className="space-y-1">
            {todayLogs.map(log => (
              <div key={log.id} className="flex items-center justify-between py-2.5 border-b border-slate-50 last:border-0">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-700 truncate">{log.description}</p>
                  <p className="text-xs text-slate-400">{log.meal_type} · {log.calories} kcal · {log.protein}g prot</p>
                </div>
                <button
                  onClick={() => { if (confirm('¿Borrar "' + log.description + '"?')) deleteLog(log.id) }}
                  className="ml-2 text-slate-300 hover:text-red-400 text-sm flex-shrink-0 p-1.5 rounded-xl hover:bg-red-50 transition-colors"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
