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
import StatusRings from '../components/dashboard/StatusRings'
import MacroArcs from '../components/dashboard/MacroArcs'
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

  // Computed values for calorie wallet
  const calRemaining = Math.max(0, (targets.calories || 2100) - macros.calories)
  const protRemaining = Math.max(0, (targets.protein || 150) - Math.round(macros.protein))
  const carbsRemaining = Math.max(0, (targets.carbs || 210) - Math.round(macros.carbs))
  const fatRemaining = Math.max(0, (targets.fat || 70) - Math.round(macros.fat))
  const calOver = macros.calories > (targets.calories || 2100)
  const protOver = macros.protein > (targets.protein || 150)

  // ── Intake Windows (time-aware) ──
  const getMealWindow = () => {
    const h = new Date().getHours()
    if (h >= 6 && h < 10) return { slot: 'desayuno', label: 'Desayuno', maxKcal: 600, maxProt: 40, emoji: '☕' }
    if (h >= 10 && h < 12) return { slot: 'snack_am', label: 'Snack mañana', maxKcal: 250, maxProt: 20, emoji: '🥜', nearMeal: h >= 11 }
    if (h >= 12 && h < 15) return { slot: 'almuerzo', label: 'Almuerzo', maxKcal: 800, maxProt: 50, emoji: '🍽' }
    if (h >= 15 && h < 19) return { slot: 'snack_pm', label: 'Snack tarde', maxKcal: 250, maxProt: 20, emoji: '🧉', nearMeal: h >= 18 }
    if (h >= 19) return { slot: 'cena', label: 'Cena', maxKcal: 700, maxProt: 50, emoji: '🌙' }
    return { slot: 'desayuno', label: 'Desayuno', maxKcal: 600, maxProt: 40, emoji: '☕' }
  }
  const mealWindow = getMealWindow()

  // ── Target Ahora (unified, time + macro aware) ──
  const getCommandLine = () => {
    const waterVal = Number(todayHabits.water?.value || 0)
    const waterTarget = targets.water || 2.5
    const stepsVal = Number(todayHabits.steps?.value || 0)
    const gymDone = todayHabits.gym && Number(todayHabits.gym.value) >= 1
    const bjjDone = todayHabits.bjj && Number(todayHabits.bjj.value) >= 1
    const h = new Date().getHours()
    const isSnack = mealWindow.slot.startsWith('snack')
    const protForThisMeal = Math.min(protRemaining, mealWindow.maxProt)
    const calForThisMeal = Math.min(calRemaining, mealWindow.maxKcal)

    // Priority 1: Hydration if very low
    if (waterVal === 0 && h < 12) return `Arrancá con un vaso de agua. El cuerpo te lo pide.`

    // Priority 2: Near-meal transition
    if (mealWindow.nearMeal && isSnack) {
      const nextMeal = mealWindow.slot === 'snack_am' ? 'almorzar' : 'cenar'
      const minLeft = mealWindow.slot === 'snack_am' ? (12 - h) * 60 - new Date().getMinutes() : (19 - h) * 60 - new Date().getMinutes()
      return `🍱 ${nextMeal === 'almorzar' ? 'Almuerzo' : 'Cena'} en el horizonte (~${minLeft} min). Objetivo: ${Math.min(calForThisMeal + 300, mealWindow.slot === 'snack_am' ? 800 : 700)} kcal con foco en proteína para llegar a tu meta.`
    }

    // Priority 3: Food suggestion based on window
    if (macros.calories === 0 && h < 11) return `${mealWindow.emoji} Hora de desayuno. Mandate algo con ~${Math.min(calForThisMeal, 500)} kcal. Opción A: tostadas con huevo. Opción B: yogurt con granola.`

    if (isSnack && protRemaining > 20) {
      return `${mealWindow.emoji} Momento de snack: sumá ${protForThisMeal}g de prota ahora (ej: yogurt griego o 3 fetas de lomo) y reservá el resto para ${mealWindow.slot === 'snack_am' ? 'el almuerzo' : 'la cena'}.`
    }

    if (isSnack && protRemaining <= 20 && calRemaining > 200) {
      return `${mealWindow.emoji} Snack liviano: fruta o un puñado de frutos secos (~${Math.min(calForThisMeal, 200)} kcal).`
    }

    if (mealWindow.slot === 'almuerzo') {
      return `${mealWindow.emoji} Hora de almorzar. Target: ${calForThisMeal} kcal, ${protForThisMeal}g prota. Opción A: pollo con arroz. Opción B: milanesa con ensalada.`
    }

    if (mealWindow.slot === 'cena') {
      if (calRemaining < 400) return `🌙 Cena liviana y cerrás perfecto. Te quedan ${calRemaining} kcal.`
      return `🌙 Cena: ${calForThisMeal} kcal, ${protForThisMeal}g prota. Opción A: omelette con verduras. Opción B: ensalada con atún.`
    }

    // Priority 4: Habits
    const parts = []
    if (waterVal < waterTarget * 0.5) parts.push(`${Math.ceil((waterTarget - waterVal) / 0.25)} vasos de agua`)
    if (stepsVal < 5000 && h > 13) parts.push('caminata de 15 min')
    if (!gymDone && !bjjDone && h > 16) parts.push('mover el cuerpo')

    if (parts.length > 0) return parts.join(' + ') + ' para quedar en verde.'
    if (completedHabits === HABITS.length && calRemaining < 300) return 'Día casi perfecto. Cerralo y a dormir. Oss!'
    return 'Seguí así. Cada hábito suma.'
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-100 via-slate-50 to-violet-50/30 pb-28 px-4 pt-5 max-w-lg mx-auto">

      {/* ═══ 1. HEADER ═══ */}
      <header className="flex justify-between items-start mb-4 px-1">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Hola, Mati</h1>
          <p className="text-[10px] text-slate-400 tracking-wide">
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
            <div className="text-lg">{level.badge}</div>
          </div>
        </div>
      </header>

      {/* ═══ STATUS RINGS (The Status Trio) ═══ */}
      <div className="mb-4">
        <StatusRings macros={macros} targets={targets} todayHabits={todayHabits} todayEnergy={todayEnergy} />
      </div>

      {/* ═══ CALORIE WALLET (compact) ═══ */}
      <div className="bg-white/60 backdrop-blur-xl rounded-[2rem] px-5 py-3 border border-white/30 shadow-[0_4px_30px_-5px_rgba(0,0,0,0.06)] mb-4">
        <div className="flex items-baseline gap-2">
          <p className={`text-2xl font-black tracking-tight ${calOver ? 'text-red-500' : 'text-slate-800'}`}>
            {calOver ? '-' + (macros.calories - (targets.calories || 2100)) : calRemaining}
          </p>
          <p className="text-[10px] text-slate-400 font-bold tracking-wider">{calOver ? 'KCAL EXCESO' : 'KCAL DISPONIBLES'}</p>
        </div>
        <p className="text-[9px] text-slate-300 tracking-wide">Vas {macros.calories} de {targets.calories || 2100}</p>
      </div>

      {/* ═══ MACRO ARCS (half-circle) ═══ */}
      <div className="mb-4">
        <MacroArcs macros={macros} targets={targets} />
      </div>

      {/* ═══ 2. HABITS COMPACT (Action Center) ═══ */}
      <div className="grid grid-cols-2 gap-2 mb-4">
        {HABITS.map(h => {
          const val = Number(todayHabits[h.type]?.value || 0)
          const done = val >= h.target
          return (
            <Link key={h.type} to="/habits"
              className={`flex items-center gap-2 px-3 py-3 rounded-2xl border transition-all min-h-[52px] ${
                done
                  ? 'bg-white/40 backdrop-blur-sm border-white/20 opacity-50'
                  : 'bg-white/80 backdrop-blur-md border-white/20 shadow-[0_2px_10px_-3px_rgba(0,0,0,0.05)]'
              }`}
            >
              <span className="text-lg">{h.emoji}</span>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-slate-800 truncate">{h.label}</p>
                <p className="text-[10px] text-slate-400">
                  {h.type === 'water' ? `${val}/${h.target}L` :
                   h.type === 'steps' ? `${val.toLocaleString()}` :
                   done ? 'Hecho' : h.cue.split(' ').slice(0, 3).join(' ')}
                </p>
              </div>
              {done && <span className="text-emerald-500 font-black text-xs">✓</span>}
            </Link>
          )
        })}
      </div>

      {/* ═══ 3. AI COMMAND LINE (gradient card) ═══ */}
      {(() => {
        const avgPct = Math.round((calRemaining > 0 ? (1 - calRemaining / (targets.calories || 2100)) * 100 : 100 + activityPct + recoveryPct) / 3)
        const isGood = completedHabits >= 2 && !calOver
        const gradientClass = isGood
          ? 'bg-gradient-to-r from-emerald-50 to-teal-50 border-emerald-200/30'
          : calOver ? 'bg-gradient-to-r from-red-50 to-orange-50 border-red-200/30'
          : 'bg-gradient-to-r from-violet-50 to-indigo-50 border-violet-200/30'
        const textColor = isGood ? 'text-emerald-600' : calOver ? 'text-red-500' : 'text-violet-500'
        return (
          <div className={`backdrop-blur-xl rounded-[2rem] px-5 py-4 border shadow-[0_4px_30px_-5px_rgba(0,0,0,0.04)] mb-4 ${gradientClass}`}>
            <p className={`text-[9px] font-black uppercase tracking-[0.15em] mb-1 ${textColor}`}>{mealWindow.emoji} {mealWindow.label} — Target ahora</p>
            <p className="text-[13px] font-bold text-slate-700 leading-snug tracking-tight">{getCommandLine()}</p>
          </div>
        )
      })()}

      {/* Sunday check-in */}
      {isSunday && (
        <Link to="/checkin" className="block mb-4">
          <div className="bg-violet-950 border border-violet-700 rounded-[1.5rem] p-3 flex items-center justify-between">
            <p className="text-white font-semibold text-xs">📋 Check-in semanal</p>
            <span className="text-violet-400 text-xs">→</span>
          </div>
        </Link>
      )}

      {/* ═══ 4. DAILY PLAN (collapsible) ═══ */}
      <div className="mb-4">
        <DailyPlan />
      </div>

      {/* Damage Control */}
      {(showDamageForm || damagePlan) ? (
        <div className="mb-4"><DamageControl /></div>
      ) : (
        <div className="flex justify-end mb-3">
          <DamageControlButton onOpen={() => setShowDamageForm(true)} />
        </div>
      )}

      {/* Predictive Ghost */}
      <PredictiveGhost todayHabits={todayHabits} />

      {/* Stats row: Credits + Streak */}
      <div className="grid grid-cols-2 gap-2 mt-4 mb-3">
        <Link to="/permitidos" className="block">
          <div className="bg-gradient-to-br from-amber-400 to-orange-500 rounded-[1.5rem] p-3 text-white shadow-md h-full">
            <p className="text-xl font-black">{balance}</p>
            <p className="text-[10px] opacity-80">💰 créditos</p>
          </div>
        </Link>
        <div className="bg-gradient-to-br from-emerald-400 to-teal-600 rounded-[1.5rem] p-3 text-white shadow-md">
          <p className="text-xl font-black">{streak} 🔥</p>
          <p className="text-[10px] opacity-80">{shieldsCount > 0 ? `🛡️${shieldsCount} ` : ''}racha</p>
        </div>
      </div>

      {/* Level + Cycle */}
      {nextLevel && (
        <div className="bg-white/80 backdrop-blur-md rounded-[1.5rem] px-4 py-2 border border-white/20 mb-3">
          <div className="flex items-center justify-between text-[10px]">
            <span className="text-slate-400 font-bold">{level.badge} → {nextLevel.badge}</span>
            <span className="font-bold text-slate-500">{totalPoints}/{nextLevel.min}</span>
          </div>
          <div className="h-1 bg-slate-100 rounded-full overflow-hidden mt-1">
            <div className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-all" style={{
              width: Math.min(100, Math.round(((totalPoints - level.min) / (nextLevel.min - level.min)) * 100)) + '%'
            }} />
          </div>
        </div>
      )}

      {activeCycle && currentWeekStats && (
        <Link to="/progress" className="block mb-3">
          <div className="bg-zinc-900 border border-zinc-700 rounded-[1.5rem] p-3 flex items-center justify-between">
            <div className="flex gap-3">
              {HABITS.map(h => {
                const stat = currentWeekStats.habits[h.type]
                return <span key={h.type} className="text-sm">{stat ? getLight(stat.full, stat.weeklyTarget) : '·'}</span>
              })}
            </div>
            <span className="text-[10px] text-zinc-500">S{currentWeekIndex + 1}/4 →</span>
          </div>
        </Link>
      )}

      {/* Digest + Journal */}
      <div className="space-y-3 mb-4">
        <WeeklyDigest />
        <MicroJournal />
      </div>

      {/* ═══ 5. VITALITY SCORE (Footer Insight) ═══ */}
      <div
        className="rounded-[2rem] p-5 shadow-lg relative overflow-hidden transition-colors duration-1000"
        style={{ backgroundColor: themeColors.primary, color: themeColors.text }}
      >
        <div className="relative z-10">
          <VitalityRing todayHabits={todayHabits} macros={macros} targets={targets} todayEnergy={todayEnergy} damageActive={!!damagePlan} />
          {(() => {
            const burn = getTodayBurn(todayHabits)
            if (burn.total === 0) return null
            return (
              <div className="mt-2 pt-2 border-t border-white/10 flex items-center justify-between text-[10px]">
                <span className="opacity-50">Gasto activo</span>
                <span className="font-black">🔥 {burn.total} kcal</span>
              </div>
            )
          })()}
        </div>
        <div className="absolute -right-4 -bottom-4 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
      </div>

      {/* Old habits section removed — now in compact grid above */}
      <section className="mt-4 space-y-4 hidden">
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
