import { useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { useFoodStore } from '../stores/foodStore'
import { useHabitStore } from '../stores/habitStore'
import { usePointsStore } from '../stores/pointsStore'
import { useCycleStore } from '../stores/cycleStore'
import { HABITS } from '../lib/constants'
import { useTargetsStore } from '../stores/targetsStore'
import ShareButton from '../components/ShareButton'
import WeeklyDigest from '../components/digest/WeeklyDigest'
import { useJournalStore } from '../stores/journalStore'
import { useRoutineStore } from '../stores/routineStore'
import BottomSheet from '../components/ui/BottomSheet'
import { track } from '../lib/analytics'
import { useInsightsStore } from '../stores/insightsStore'
import { usePlanStore } from '../stores/planStore'
import { useEnergyStore } from '../stores/energyStore'
import { useSync } from '../hooks/useSync'
import { getTodayBurn } from '../lib/activeBurn'
import { useDamageStore } from '../stores/damageStore'
import { getSuggestedActions } from '../lib/suggestions'
import ActivityFeed from '../components/dashboard/ActivityFeed'
import MicroJournal from '../components/journal/MicroJournal'

export default function Dashboard() {
  const { todayLogs, fetchToday: fetchFood, getTodayMacros } = useFoodStore()
  const { todayHabits, fetchToday: fetchHabits } = useHabitStore()
  const { totalPoints, spentPoints, streak, shieldsCount, fetchAll, getLevel } = usePointsStore()
  const { activeCycle, weeklyStats, fetchActive } = useCycleStore()
  const { targets, fetchTargets } = useTargetsStore()
  const { userModel, lastGenerated, fetchUserModel } = useInsightsStore()
  const { todayPlan, fetchTodayPlan } = usePlanStore()
  const { todayEnergy, fetchToday: fetchEnergy } = useEnergyStore()
  const { activePlan: damagePlan, fetchActive: fetchDamage } = useDamageStore()
  const { todayEntry: journalEntry, fetchToday: fetchJournal } = useJournalStore()
  const { routine } = useRoutineStore()

  const [showMore, setShowMore] = useState(false)
  const [insightSheet, setInsightSheet] = useState(false)

  useSync()

  const refreshAll = useCallback(() => {
    fetchFood(); fetchHabits(); fetchAll(); fetchActive(); fetchTargets()
    fetchUserModel(); fetchTodayPlan(); fetchEnergy(); fetchDamage(); fetchJournal()
    track('app_open')
  }, [])

  useEffect(() => { refreshAll() }, [])

  useEffect(() => {
    const handler = () => { if (document.visibilityState === 'visible') refreshAll() }
    document.addEventListener('visibilitychange', handler)
    return () => document.removeEventListener('visibilitychange', handler)
  }, [refreshAll])

  const macros = getTodayMacros()
  const balance = totalPoints - spentPoints
  const { current: level, next: nextLevel } = getLevel()
  const burn = getTodayBurn(todayHabits)

  const calTarget = targets.calories || 2100
  const calEaten = macros.calories || 0
  const calBurned = burn.total
  const calAvailable = Math.max(0, calTarget - calEaten + calBurned)
  const calOver = calEaten > calTarget + calBurned
  const calPct = calTarget > 0 ? Math.min(100, Math.round((calEaten / calTarget) * 100)) : 0
  const calBarColor = calPct > 100 ? 'bg-red-500' : calPct > 80 ? 'bg-amber-500' : 'bg-emerald-500'

  const suggestedActions = getSuggestedActions(todayHabits, todayLogs, todayPlan, targets, routine)

  return (
    <div className="min-h-screen bg-[#0a0a0a] pb-28 px-4 pt-6 max-w-lg mx-auto">

      {/* ═══ 2.1 HEADER ═══ */}
      <header className="flex justify-between items-start mb-5 px-1">
        <div>
          <h1 className="text-xl font-black text-white tracking-tight">Hola, Mati</h1>
          <p className="text-[10px] text-gray-500 tracking-wide">
            {new Date().toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <ShareButton cardProps={{
            score: calPct, streak, level, credits: balance,
            habits: HABITS.map(h => ({ label: h.label, emoji: h.emoji, done: todayHabits[h.type] && Number(todayHabits[h.type].value) >= h.target })),
            date: new Date().toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' }),
          }} />
          <span className="text-lg">{level.badge}</span>
        </div>
      </header>

      {/* ═══ 2.2 CALORIE WALLET ═══ */}
      <div className="bg-gradient-to-br from-violet-600/20 to-blue-600/20 border border-white/10 rounded-2xl p-5 mb-3">
        <div className="flex items-baseline gap-2 mb-1">
          <p className={`text-4xl font-black ${calOver ? 'text-red-500' : 'text-white'}`}>{calOver ? '-' + (calEaten - calTarget - calBurned) : calAvailable}</p>
          <p className="text-[10px] text-gray-400 font-bold tracking-wider">{calOver ? 'KCAL EXCESO' : 'KCAL DISPONIBLES'}</p>
        </div>
        <div className="h-2 bg-gray-800 rounded-full overflow-hidden mb-2">
          <div className={`h-full rounded-full transition-all duration-700 ${calBarColor}`} style={{ width: calPct + '%' }} />
        </div>
        <div className="flex justify-between text-[10px] text-gray-500">
          <span>Comido: {calEaten}</span>
          <span>{calPct}%</span>
          {calBurned > 0 && <span>Quemado: {calBurned} 🔥</span>}
        </div>
      </div>

      {/* Macro bars inline */}
      <div className="grid grid-cols-3 gap-3 mb-5 px-1">
        {[
          { label: 'prot', current: Math.round(macros.protein), target: targets.protein || 150, color: 'bg-indigo-500' },
          { label: 'carb', current: Math.round(macros.carbs), target: targets.carbs || 210, color: 'bg-amber-500' },
          { label: 'fat', current: Math.round(macros.fat), target: targets.fat || 70, color: 'bg-red-500' },
        ].map(m => {
          const pct = m.target > 0 ? Math.min(100, Math.round((m.current / m.target) * 100)) : 0
          const over = m.current > m.target
          return (
            <div key={m.label}>
              <p className={`text-[10px] font-black ${over ? 'text-red-400' : 'text-gray-400'}`}>{m.current}/{m.target}g {m.label}</p>
              <div className="h-1 bg-gray-800 rounded-full overflow-hidden mt-0.5">
                <div className={`h-full rounded-full transition-all duration-500 ${over ? 'bg-red-500' : m.color}`} style={{ width: pct + '%' }} />
              </div>
            </div>
          )
        })}
      </div>

      {/* ═══ 2.3 HABIT CHIPS ═══ */}
      <Link to="/activity" className="block mb-4">
        <div className="flex gap-2">
          {HABITS.map(h => {
            const val = Number(todayHabits[h.type]?.value || 0)
            const done = val >= h.target
            return (
              <div key={h.type} className={`flex-1 bg-white/5 border border-white/10 rounded-xl py-2 text-center transition ${done ? 'opacity-40' : ''}`}>
                <span className="text-sm">{h.emoji}</span>
                <p className="text-[9px] text-gray-500 font-bold mt-0.5">
                  {done ? '✓' : h.type === 'water' ? `${val.toFixed(1)}L` : h.type === 'steps' ? (val > 0 ? (val / 1000).toFixed(1) + 'k' : '—') : '—'}
                </p>
              </div>
            )
          })}
        </div>
      </Link>

      {/* ═══ 2.4 AI CHAT INLINE ═══ */}
      <Link to="/chat" className="block mb-4">
        <div className="bg-white/5 border border-white/10 rounded-2xl p-3">
          <p className="text-xs text-gray-600">💬 Preguntale a Brim...</p>
          {todayPlan?.morning_brief && (
            <p className="text-[10px] text-gray-500 mt-1 line-clamp-1 italic">{todayPlan.morning_brief.slice(0, 80)}...</p>
          )}
        </div>
      </Link>

      {/* ═══ 2.5 SUGGESTED ACTIONS ═══ */}
      {suggestedActions.length > 0 && (
        <div className="space-y-2 mb-4">
          {suggestedActions.map(action => (
            <Link key={action.id} to={action.to} state={action.state}
              className={`block bg-white/5 border border-${action.color}-500/20 rounded-2xl p-3 active:bg-white/10 transition`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{action.emoji}</span>
                  <p className="text-xs text-gray-300">{action.text}</p>
                </div>
                {action.cta && <span className={`text-[10px] font-black text-${action.color}-400`}>{action.cta} →</span>}
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* ═══ 2.6 DAILY INSIGHT ═══ */}
      {todayPlan && (todayPlan.morning_brief || todayPlan.midday_adjust || todayPlan.evening_wrap) && (
        <button onClick={() => setInsightSheet(true)}
          className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 mb-4 text-left active:bg-white/10 transition">
          <p className="text-[9px] font-black text-blue-400 uppercase tracking-widest">Daily Insight ▾</p>
          <p className="text-xs text-gray-400 line-clamp-2 mt-0.5 leading-snug">
            {todayPlan.morning_brief || todayPlan.midday_adjust || todayPlan.evening_wrap}
          </p>
        </button>
      )}

      {/* ═══ 2.7 ACTIVITY FEED ═══ */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-3 mb-4">
        <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-2">Actividad de hoy</p>
        <ActivityFeed todayLogs={todayLogs} todayHabits={todayHabits} />
      </div>

      {/* ═══ 2.8 REFLECTION (>21h) ═══ */}
      {new Date().getHours() >= 21 && (
        <div className="bg-white/5 border border-violet-500/20 rounded-2xl p-4 mb-4">
          <p className="text-[9px] font-black text-violet-400 uppercase tracking-widest mb-3">🌙 Reflexión del día</p>
          {/* Mini bento stats */}
          <div className="grid grid-cols-4 gap-2 mb-3">
            <div className="bg-white/5 rounded-lg p-1.5 text-center">
              <p className="text-[10px] font-black text-blue-400">💧{Number(todayHabits.water?.value || 0).toFixed(1)}L</p>
            </div>
            <div className="bg-white/5 rounded-lg p-1.5 text-center">
              <p className="text-[10px] font-black text-gray-300">🚶{(Number(todayHabits.steps?.value || 0) / 1000).toFixed(0)}k</p>
            </div>
            <div className="bg-white/5 rounded-lg p-1.5 text-center">
              <p className="text-[10px] font-black text-white">🔥{calEaten} kcal</p>
            </div>
            <div className="bg-white/5 rounded-lg p-1.5 text-center">
              <p className="text-[10px] font-black text-indigo-400">💪{Math.round(macros.protein)}g</p>
            </div>
          </div>
          <MicroJournal />
        </div>
      )}

      {/* Damage Control */}
      {damagePlan && (
        <div className="bg-white/5 border border-amber-500/20 rounded-2xl px-4 py-3 mb-4">
          <div className="flex items-center justify-between mb-1">
            <p className="text-[9px] font-black text-amber-400 uppercase tracking-widest">🔄 Compensación</p>
            <span className="text-[9px] text-gray-600">{damagePlan.days_completed}/{damagePlan.spread_days}</span>
          </div>
          <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-amber-500 to-emerald-500 rounded-full transition-all" style={{ width: Math.round((damagePlan.days_completed / damagePlan.spread_days) * 100) + '%' }} />
          </div>
        </div>
      )}

      {/* ═══ 2.9 VER MÁS ═══ */}
      <button onClick={() => setShowMore(!showMore)}
        className="w-full text-center py-3 text-[10px] font-black text-gray-600 uppercase tracking-widest">
        {showMore ? '△ Menos' : '▽ Ver más'}
      </button>

      {showMore && (
        <div className="space-y-3 animate-fade-in">
          <div className="grid grid-cols-3 gap-2">
            <Link to="/permitidos" className="block">
              <div className="bg-white/5 border border-white/10 rounded-2xl p-3 text-center">
                <p className="text-lg font-black text-amber-400">{balance}</p>
                <p className="text-[8px] text-gray-600 uppercase">créditos</p>
              </div>
            </Link>
            <div className="bg-white/5 border border-white/10 rounded-2xl p-3 text-center">
              <p className="text-lg font-black text-emerald-400">{streak} 🔥</p>
              <p className="text-[8px] text-gray-600 uppercase">racha</p>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-2xl p-3 text-center">
              <p className="text-lg font-black text-violet-400">{totalPoints}</p>
              <p className="text-[8px] text-gray-600 uppercase">{level.badge} pts</p>
            </div>
          </div>

          {nextLevel && (
            <div className="bg-white/5 border border-white/10 rounded-xl px-3 py-2">
              <div className="h-1 bg-gray-800 rounded-full overflow-hidden">
                <div className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-all" style={{
                  width: Math.min(100, Math.round(((totalPoints - level.min) / (nextLevel.min - level.min)) * 100)) + '%'
                }} />
              </div>
              <p className="text-[8px] text-gray-600 text-right mt-1">{nextLevel.badge} en {nextLevel.min - totalPoints} pts</p>
            </div>
          )}

          <WeeklyDigest />
        </div>
      )}

      {/* ═══ BOTTOM SHEETS ═══ */}
      <BottomSheet isOpen={insightSheet} onClose={() => setInsightSheet(false)} title="🧠 Daily Insight">
        <div className="space-y-4">
          {todayPlan?.morning_brief && (
            <div>
              <p className="text-[9px] font-black text-gray-500 uppercase mb-1">Brief</p>
              <p className="text-sm text-gray-300 leading-relaxed">{todayPlan.morning_brief}</p>
            </div>
          )}
          {todayPlan?.midday_adjust && (
            <div>
              <p className="text-[9px] font-black text-gray-500 uppercase mb-1">Recálculo</p>
              <p className="text-sm text-gray-300 leading-relaxed">{todayPlan.midday_adjust}</p>
            </div>
          )}
          {todayPlan?.evening_wrap && (
            <div>
              <p className="text-[9px] font-black text-gray-500 uppercase mb-1">Cierre</p>
              <p className="text-sm text-gray-300 leading-relaxed">{todayPlan.evening_wrap}</p>
            </div>
          )}
          {todayPlan?.adjusted_targets?.reason && (
            <div className="bg-white/5 rounded-xl p-3">
              <p className="text-xs text-gray-400">{todayPlan.adjusted_targets.reason}</p>
            </div>
          )}
        </div>
      </BottomSheet>
    </div>
  )
}
