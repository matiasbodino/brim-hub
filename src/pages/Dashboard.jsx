import { useEffect, useState } from 'react'
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
import { usePlanStore } from '../stores/planStore'
import { useEnergyStore } from '../stores/energyStore'
import { useSync } from '../hooks/useSync'
import VitalityRing from '../components/plan/VitalityRing'
import DailyPlan from '../components/plan/DailyPlan'
import PredictiveGhost from '../components/plan/PredictiveGhost'
import { getTodayBurn } from '../lib/activeBurn'
import DamageControl, { DamageControlButton } from '../components/plan/DamageControl'
import { useDamageStore } from '../stores/damageStore'

function MacroRing({ label, current, target, color, textColor, showRemaining }) {
  const pct = target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 0
  const remaining = Math.max(0, target - current)
  return (
    <div className="flex-1 text-center">
      <div className="relative w-14 h-14 mx-auto mb-1">
        <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
          <circle cx="18" cy="18" r="15.5" fill="none" stroke="#f1f5f9" strokeWidth="3" />
          <circle cx="18" cy="18" r="15.5" fill="none" stroke={color} strokeWidth="3"
            strokeDasharray={`${pct} 100`} strokeLinecap="round" className="transition-all duration-1000" />
        </svg>
        <span className={`absolute inset-0 flex items-center justify-center text-[10px] font-black ${textColor}`}>
          {showRemaining ? remaining : pct + '%'}
        </span>
      </div>
      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">{label}</p>
      <p className="text-[10px] text-slate-500">{showRemaining ? `faltan` : `${current}/${target}`}</p>
    </div>
  )
}

function HabitRow({ label, done, emoji, cue, identity }) {
  return (
    <div className={`flex items-center p-4 rounded-3xl border transition-all duration-300 parallax-card ${
      done
        ? 'bg-white/40 backdrop-blur-sm border-white/20 opacity-50 scale-[0.98]'
        : 'bg-white/80 backdrop-blur-md border-white/20 shadow-[0_2px_15px_-3px_rgba(0,0,0,0.05)]'
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
  const { totalPoints, spentPoints, streak, shieldsCount, loading: pointsLoading, fetchAll, getLevel } = usePointsStore()
  const { activeCycle, weeklyStats, fetchActive } = useCycleStore()
  const { targets, fetchTargets } = useTargetsStore()

  const { userModel, lastGenerated, fetchUserModel } = useInsightsStore()
  const { todayPlan, fetchTodayPlan, generatePlan } = usePlanStore()
  const { todayEnergy, fetchToday: fetchEnergy } = useEnergyStore()
  const { activePlan: damagePlan, fetchActive: fetchDamage } = useDamageStore()
  const [showDamageForm, setShowDamageForm] = useState(false)

  // Background sync: rehydrate from Supabase, flush pending writes
  useSync()

  useEffect(() => {
    fetchFood()
    fetchHabits()
    fetchAll()
    fetchActive()
    fetchTargets()
    fetchUserModel()
    fetchTodayPlan()
    fetchEnergy()
    fetchDamage()
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

  // ── "Tu jugada ahora" — AI next step based on what's missing ──
  const getNextMove = () => {
    const waterVal = Number(todayHabits.water?.value || 0)
    const waterTarget = targets.water || 2.5
    const protRemaining = Math.max(0, (targets.protein || 150) - Math.round(macros.protein))
    const calRemaining = Math.max(0, (targets.calories || 2100) - macros.calories)
    const gymDone = todayHabits.gym && Number(todayHabits.gym.value) >= 1
    const bjjDone = todayHabits.bjj && Number(todayHabits.bjj.value) >= 1
    const stepsVal = Number(todayHabits.steps?.value || 0)

    if (waterVal === 0) return { emoji: '💧', text: 'Arrancá con un vaso de agua. El cuerpo te lo pide.' }
    if (!todayEnergy) return { emoji: '⚡', text: 'Registrá tu energía de hoy para que Brim calibre el plan.' }
    if (protRemaining > 30 && macros.calories > 0) return { emoji: '🥩', text: `Faltan ${protRemaining}g de prota. Mandate un snack de yogurt o frutos secos.` }
    if (calRemaining > 800 && macros.calories === 0) return { emoji: '🍽', text: 'Todavía no comiste nada. Arrancá con un desayuno potente.' }
    if (waterVal < waterTarget * 0.5) return { emoji: '💧', text: `Vas ${waterVal.toFixed(1)}L de ${waterTarget}L. Llená el vaso.` }
    if (stepsVal < 3000 && new Date().getHours() > 14) return { emoji: '🚶', text: 'Metele una caminata post-almuerzo. Los pasos están flojos.' }
    if (!gymDone && !bjjDone && new Date().getHours() > 16) return { emoji: '🏋️', text: '¿Hoy toca mover el cuerpo? Gym o tatami, vos elegís.' }
    if (calRemaining > 0 && calRemaining < 500) return { emoji: '🎯', text: `Te quedan ${calRemaining} kcal. Una cena liviana y cerrás perfecto.` }
    if (completedHabits === HABITS.length) return { emoji: '🏆', text: 'Día perfecto. Disfrutalo, Mati. Mañana seguimos.' }
    return { emoji: '💪', text: 'Seguí así. Cada hábito suma.' }
  }
  const nextMove = getNextMove()

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-100 via-slate-50 to-violet-50/30 pb-28 px-4 pt-6 max-w-lg mx-auto">

      {/* ═══ 1. HEADER + VITALITY ═══ */}
      <div
        className="rounded-[2.5rem] p-6 shadow-xl relative overflow-hidden transition-colors duration-1000 mb-6"
        style={{ backgroundColor: themeColors.primary, color: themeColors.text }}
      >
        <div className="relative z-10">
          {/* Header inside the ring card */}
          <div className="flex justify-between items-start mb-4">
            <div>
              <p className="text-xs font-black uppercase tracking-widest opacity-60">Brim Hub</p>
              <h1 className="text-2xl font-black">Hola, Mati</h1>
              <p className="text-[10px] opacity-50 mt-0.5">
                {new Date().toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <ShareButton cardProps={{
                score, streak, level, credits: balance,
                cycleName: activeCycle?.name ?? null,
                cycleWeek: currentWeekIndex !== null ? currentWeekIndex + 1 : null,
                habits: HABITS.map(h => ({ label: h.label, emoji: h.emoji, done: todayHabits[h.type] && Number(todayHabits[h.type].value) >= h.target })),
                date: new Date().toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' }),
              }} />
              <div className="text-center">
                <div className="text-xl">{level.badge}</div>
                <div className="text-[8px] opacity-50 font-bold">{level.name.split(' ')[1]}</div>
              </div>
            </div>
          </div>

          {/* Vitality Ring */}
          <VitalityRing todayHabits={todayHabits} macros={macros} targets={targets} todayEnergy={todayEnergy} damageActive={!!damagePlan} />

          {/* Active Burn */}
          {(() => {
            const burn = getTodayBurn(todayHabits)
            if (burn.total === 0) return null
            return (
              <div className="mt-3 pt-2 border-t border-white/10 flex items-center justify-between">
                <span className="text-[10px] font-bold opacity-50">Gasto activo</span>
                <div className="flex items-center gap-2">
                  {burn.breakdown.map(b => (
                    <span key={b.source} className="text-[10px] opacity-50 bg-white/10 px-2 py-0.5 rounded-full">{b.emoji} {b.burn}</span>
                  ))}
                  <span className="text-xs font-black">🔥 {burn.total} kcal</span>
                </div>
              </div>
            )
          })()}
        </div>
        <div className="absolute -right-4 -bottom-4 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
      </div>

      {/* ═══ 2. TU JUGADA AHORA ═══ */}
      <div className="bg-white/80 backdrop-blur-md rounded-[2rem] p-4 border border-violet-200/30 shadow-[0_0_15px_-3px_rgba(124,58,237,0.1)] mb-4">
        <div className="flex items-start gap-3">
          <span className="text-2xl">{nextMove.emoji}</span>
          <div className="flex-1">
            <p className="text-[10px] font-black text-violet-500 uppercase tracking-widest mb-0.5">Tu jugada ahora</p>
            <p className="text-sm font-bold text-slate-800 leading-snug">{nextMove.text}</p>
          </div>
        </div>
      </div>

      {/* ═══ 3. MACROS COMPACTOS (Restante) ═══ */}
      <div className="bg-white/80 backdrop-blur-md rounded-[2rem] p-4 border border-white/20 shadow-[0_2px_15px_-3px_rgba(0,0,0,0.05)] mb-4">
        <div className="flex gap-2">
          <MacroRing label="Kcal" current={macros.calories} target={targets.calories} color="#8b5cf6" textColor="text-violet-600" showRemaining />
          <MacroRing label="Prot" current={Math.round(macros.protein)} target={targets.protein} color="#3b82f6" textColor="text-blue-600" showRemaining />
          <MacroRing label="Carbs" current={Math.round(macros.carbs)} target={targets.carbs} color="#f59e0b" textColor="text-amber-600" showRemaining />
          <MacroRing label="Grasa" current={Math.round(macros.fat)} target={targets.fat} color="#ef4444" textColor="text-red-500" showRemaining />
        </div>
      </div>

      {/* Sunday check-in banner */}
      {isSunday && (
        <Link to="/checkin" className="block mb-4">
          <div className="bg-violet-950 border border-violet-700 rounded-[2rem] p-4 flex items-center justify-between">
            <div>
              <p className="text-violet-300 text-xs font-medium">Domingo 📋</p>
              <p className="text-white font-semibold text-sm">Hacé tu check-in semanal</p>
            </div>
            <span className="text-violet-400">→</span>
          </div>
        </Link>
      )}

      {/* Daily Plan (collapsible) */}
      <div className="mb-4">
        <DailyPlan />
      </div>

      {/* Damage Control */}
      {(showDamageForm || damagePlan) ? (
        <div className="mb-4"><DamageControl /></div>
      ) : (
        <div className="flex justify-end mb-4">
          <DamageControlButton onOpen={() => setShowDamageForm(true)} />
        </div>
      )}

      {/* Stats row: Credits + Streak */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <Link to="/permitidos" className="block">
          <div className="bg-gradient-to-br from-amber-400 to-orange-500 rounded-[1.5rem] p-4 text-white shadow-md h-full">
            <p className="text-2xl font-black">{balance}</p>
            <p className="text-[10px] opacity-80 font-medium">💰 créditos</p>
          </div>
        </Link>
        <div className="bg-gradient-to-br from-emerald-400 to-teal-600 rounded-[1.5rem] p-4 text-white shadow-md">
          <p className="text-2xl font-black">{streak} <span className="text-base">🔥</span></p>
          <p className="text-[10px] opacity-80 font-medium">
            {shieldsCount > 0 ? `racha · 🛡️${shieldsCount}` : 'racha'}
          </p>
        </div>
      </div>

      {/* Level progress (compact) */}
      {nextLevel && (
        <div className="bg-white/80 backdrop-blur-md rounded-[1.5rem] px-4 py-3 border border-white/20 mb-4">
          <div className="flex items-center justify-between text-[10px] mb-1">
            <span className="text-slate-400 font-bold">{level.badge} → {nextLevel.badge}</span>
            <span className="font-bold text-slate-600">{totalPoints}/{nextLevel.min} pts</span>
          </div>
          <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-all duration-1000" style={{
              width: Math.min(100, Math.round(((totalPoints - level.min) / (nextLevel.min - level.min)) * 100)) + '%'
            }} />
          </div>
        </div>
      )}

      {/* Predictive Ghost */}
      <PredictiveGhost todayHabits={todayHabits} />

      {/* Cycle card */}
      {activeCycle && currentWeekStats && (
        <Link to="/progress" className="block mt-4">
          <div className="bg-zinc-900 border border-zinc-700 rounded-[2rem] p-4">
            <div className="flex justify-between items-center mb-2">
              <p className="text-xs text-zinc-500 uppercase tracking-widest">Ciclo · S{currentWeekIndex + 1}/4</p>
              <span className="text-zinc-400 text-xs">→</span>
            </div>
            <div className="flex gap-4 justify-center">
              {HABITS.map(h => {
                const stat = currentWeekStats.habits[h.type]
                const light = stat ? getLight(stat.full, stat.weeklyTarget) : '·'
                return (
                  <div key={h.type} className="flex flex-col items-center gap-0.5">
                    <span className="text-sm">{light}</span>
                    <span className="text-[10px] text-zinc-500">{h.emoji}</span>
                  </div>
                )
              })}
            </div>
          </div>
        </Link>
      )}

      {/* Weekly Digest + Journal + AI Indicator */}
      <div className="mt-4 space-y-3">
        <WeeklyDigest />
        <MicroJournal />
      </div>

      {/* Habits */}
      <section className="mt-4 space-y-4">
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
        <div className="bg-white/80 backdrop-blur-md rounded-3xl p-5 border border-white/20 shadow-[0_2px_15px_-3px_rgba(0,0,0,0.05)] mt-6">
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
