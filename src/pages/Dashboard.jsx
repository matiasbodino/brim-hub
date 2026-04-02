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
import { track } from '../lib/analytics'
import { useBJJTheme } from '../hooks/useBJJTheme'
import { useInsightsStore } from '../stores/insightsStore'
import { usePlanStore } from '../stores/planStore'
import { useEnergyStore } from '../stores/energyStore'
import { useSync } from '../hooks/useSync'
import VitalityRing from '../components/plan/VitalityRing'
// DailyPlan and PredictiveGhost moved to /habits — Home is read-only
import StatusRings from '../components/dashboard/StatusRings'
import MacroArcs from '../components/dashboard/MacroArcs'
import { getTodayBurn } from '../lib/activeBurn'
// DamageControl interaction moved to /habits — Home shows read-only progress
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
  const { todayEntry: journalEntry, fetchToday: fetchJournal } = useJournalStore()
  const [showJournal, setShowJournal] = useState(false)
  const [showMore, setShowMore] = useState(false)

  // Background sync: rehydrate from Supabase, flush pending writes
  useSync()

  const refreshAll = useCallback(() => {
    fetchFood()
    fetchHabits()
    fetchAll()
    fetchActive()
    fetchTargets()
    fetchUserModel()
    fetchTodayPlan()
    fetchEnergy()
    fetchDamage()
    fetchJournal()
  }, [])

  // Fetch on mount + re-fetch when user navigates back (visibilitychange)
  useEffect(() => {
    refreshAll()
    track('app_open')
    const onVisible = () => {
      if (document.visibilityState === 'visible') refreshAll()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [refreshAll])

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

    // Priority 0: Post high-strain recovery
    const bjjRpe = todayHabits.bjj?.metadata?.rpe || 0
    const gymRpe = todayHabits.gym?.metadata?.rpe || 0
    const highStrain = bjjRpe >= 8 || gymRpe >= 8
    if (highStrain && h > 18) {
      return `🧘 Esfuerzo alto detectado (RPE ${Math.max(bjjRpe, gymRpe)}). Priorizá recuperación profunda: Respiración 4-7-8 sedante + 20g proteína extra en la cena.`
    }

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

  // Build timeline items
  const timelineItems = []

  // Completed food logs
  todayLogs.forEach(log => {
    timelineItems.push({
      type: 'done',
      emoji: '✓',
      title: log.description,
      subtitle: `${log.meal_type} · ${log.calories} kcal · ${log.protein}g prot`,
      key: 'food-' + log.id,
    })
  })

  // Completed habits
  HABITS.forEach(h => {
    const val = Number(todayHabits[h.type]?.value || 0)
    if (val >= h.target) {
      timelineItems.push({
        type: 'done',
        emoji: '✓',
        title: `${h.label} completado`,
        subtitle: h.type === 'water' ? `${val}L` : h.type === 'steps' ? `${val.toLocaleString()} pasos` : 'Hecho',
        key: 'habit-' + h.type,
      })
    }
  })

  // Current action (the "now" item)
  const commandLine = getCommandLine()

  // Pending habits
  const pendingHabits = HABITS.filter(h => {
    const val = Number(todayHabits[h.type]?.value || 0)
    return val < h.target
  })

  // Vitality score — nutrition dominant (50%)
  const nutritionPct = macros.calories > 0 ? Math.min(100, Math.round((macros.calories / (targets.calories || 2100)) * 100)) : 0
  const movementPct = Math.min(100, Math.round(((Number(todayHabits.steps?.value || 0) / (targets.steps || 10000)) * 60 + ((Number(todayHabits.gym?.value || 0) >= 1 || Number(todayHabits.bjj?.value || 0) >= 1) ? 40 : 0))))
  const hydrationPct = Math.min(100, Math.round(((Number(todayHabits.water?.value || 0)) / (targets.water || 2.5)) * 100))
  const vitalityPct = Math.min(100, Math.round(nutritionPct * 0.50 + movementPct * 0.20 + hydrationPct * 0.15 + ((todayEnergy || 3) / 5 * 100 * 0.15)))

  return (
    <div className="min-h-screen bg-[#0a0a0a] pb-28 px-4 pt-6 max-w-lg mx-auto">

      {/* ═══ HEADER ═══ */}
      <header className="flex justify-between items-start mb-6 px-1">
        <div>
          <h1 className="text-xl font-black text-white tracking-tight">Hola, Mati</h1>
          <p className="text-[10px] text-gray-500 tracking-wide">
            {new Date().toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <ShareButton cardProps={{
            score, streak, level, credits: balance,
            cycleName: activeCycle?.name ?? null,
            cycleWeek: currentWeekIndex !== null ? currentWeekIndex + 1 : null,
            habits: HABITS.map(h => ({ label: h.label, emoji: h.emoji, done: todayHabits[h.type] && Number(todayHabits[h.type].value) >= h.target })),
            date: new Date().toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' }),
          }} />
          <span className="text-lg">{level.badge}</span>
        </div>
      </header>

      {/* ═══ WELLNESS RING ═══ */}
      <div className="flex flex-col items-center mb-6">
        <div className="relative w-44 h-44 flex items-center justify-center rounded-full"
          style={{ background: `conic-gradient(#22c55e ${vitalityPct}%, #1f2937 0)` }}>
          <div className="absolute inset-2 bg-[#0a0a0a] rounded-full flex flex-col items-center justify-center">
            <span className="text-4xl font-black text-white">{vitalityPct}%</span>
            <span className="text-[9px] text-gray-500 uppercase tracking-[0.2em]">Wellness Score</span>
          </div>
        </div>
        <div className="flex gap-3 mt-4 w-full">
          <div className="flex-1 bg-white/5 backdrop-blur-sm border border-white/10 p-3 rounded-2xl text-center">
            <span className="block text-[9px] text-gray-500 uppercase tracking-wider">Nutrición</span>
            <span className={`font-black text-sm ${calOver ? 'text-red-500' : 'text-green-500'}`}>{Math.min(100, Math.round((macros.calories / (targets.calories || 2100)) * 100))}%</span>
          </div>
          <div className="flex-1 bg-white/5 backdrop-blur-sm border border-white/10 p-3 rounded-2xl text-center">
            <span className="block text-[9px] text-gray-500 uppercase tracking-wider">Esfuerzo</span>
            <span className={`font-black text-sm ${(Number(todayHabits.gym?.value || 0) >= 1 || Number(todayHabits.bjj?.value || 0) >= 1) ? 'text-green-500' : 'text-orange-500'}`}>
              {Math.min(100, Math.round(((Number(todayHabits.steps?.value || 0) / (targets.steps || 10000)) * 60 + ((Number(todayHabits.gym?.value || 0) >= 1 || Number(todayHabits.bjj?.value || 0) >= 1) ? 40 : 0))))}%
            </span>
          </div>
          <div className="flex-1 bg-white/5 backdrop-blur-sm border border-white/10 p-3 rounded-2xl text-center">
            <span className="block text-[9px] text-gray-500 uppercase tracking-wider">Hidratación</span>
            <span className={`font-black text-sm ${Number(todayHabits.water?.value || 0) >= (targets.water || 2.5) ? 'text-green-500' : 'text-blue-400'}`}>
              {Math.min(100, Math.round(((Number(todayHabits.water?.value || 0)) / (targets.water || 2.5)) * 100))}%
            </span>
          </div>
        </div>
      </div>

      {/* ═══ MACROS ═══ */}
      <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-4 mb-6">
        <div className="flex items-baseline gap-2 mb-2">
          <p className={`text-2xl font-black ${calOver ? 'text-red-500' : 'text-white'}`}>{calOver ? '-' + (macros.calories - (targets.calories || 2100)) : calRemaining}</p>
          <p className="text-[10px] text-gray-500 font-bold tracking-wider">{calOver ? 'KCAL EXCESO' : 'KCAL DISPONIBLES'}</p>
        </div>
        <p className="text-[9px] text-gray-600 mb-3">Vas {macros.calories} de {targets.calories || 2100}</p>
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Prot', current: Math.round(macros.protein), target: targets.protein || 150, color: 'bg-indigo-500' },
            { label: 'Carbs', current: Math.round(macros.carbs), target: targets.carbs || 210, color: 'bg-amber-500' },
            { label: 'Grasa', current: Math.round(macros.fat), target: targets.fat || 70, color: 'bg-red-500' },
          ].map(m => {
            const pct = m.target > 0 ? Math.min(100, Math.round((m.current / m.target) * 100)) : 0
            const over = m.current > m.target
            return (
              <div key={m.label}>
                <p className={`text-xs font-black ${over ? 'text-red-400' : 'text-gray-300'}`}>{m.current}/{m.target}g</p>
                <p className="text-[8px] text-gray-600 uppercase">{m.label}</p>
                <div className="h-1 bg-gray-800 rounded-full overflow-hidden mt-1">
                  <div className={`h-full rounded-full transition-all duration-500 ${over ? 'bg-red-500' : m.color}`} style={{ width: pct + '%' }} />
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* ═══ NEXT ACTION (read-only suggestion → tap goes to /habits) ═══ */}
      <Link to={commandLine.includes('caminata') ? '/walk' : '/habits'}
        className="bg-white/5 backdrop-blur-sm border border-blue-500/20 rounded-2xl p-4 mb-4 flex items-center gap-3 active:bg-white/10 transition block">
        <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0">
          <span className="text-lg">{mealWindow.emoji}</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[9px] font-black text-blue-400 uppercase tracking-widest">Próximo paso</p>
          <p className="text-xs text-gray-300 leading-snug line-clamp-2 mt-0.5">{commandLine}</p>
        </div>
        <span className="text-gray-600 text-xs flex-shrink-0">→</span>
      </Link>

      {/* ═══ HABITS SUMMARY (read-only, tap → /habits) ═══ */}
      <Link to="/habits" className="block mb-4">
        <div className="grid grid-cols-4 gap-2">
          {HABITS.map(h => {
            const val = Number(todayHabits[h.type]?.value || 0)
            const done = val >= h.target
            return (
              <div key={h.type} className={`bg-white/5 border border-white/10 rounded-2xl p-3 text-center transition ${done ? 'opacity-40' : ''}`}>
                <span className="text-lg block">{h.emoji}</span>
                <p className="text-[8px] text-gray-500 font-bold uppercase mt-1">{h.label}</p>
                {done && <span className="text-emerald-500 text-[10px] font-black">✓</span>}
              </div>
            )
          })}
        </div>
      </Link>

      {/* ═══ FOOD LOG PREVIEW (read-only) ═══ */}
      {todayLogs.length === 0 ? (
        <Link to="/habits" className="block mb-4">
          <div className="text-center py-6 px-4 bg-white/5 border border-white/5 rounded-2xl">
            <p className="text-gray-500 text-sm">No logueaste comida todavía. Abrí Registrar para empezar 🍽️</p>
          </div>
        </Link>
      ) : (
        <div className="bg-white/5 border border-white/10 rounded-2xl p-3 mb-4">
          <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-2">Comidas de hoy</p>
          {todayLogs.slice(-3).map(log => (
            <div key={log.id} className="flex justify-between py-1.5 border-b border-white/5 last:border-0">
              <span className="text-[10px] text-gray-400 truncate flex-1">{log.description}</span>
              <span className="text-[10px] text-gray-500 ml-2">{log.calories} kcal</span>
            </div>
          ))}
          {todayLogs.length > 3 && <p className="text-[9px] text-gray-600 mt-1">+{todayLogs.length - 3} más</p>}
        </div>
      )}

      {/* ═══ DAILY INSIGHT ═══ */}
      {!todayPlan && macros.calories === 0 && (
        <div className="text-center py-4 px-4 mb-4">
          <p className="text-gray-600 text-xs">Tu plan del día se genera cuando logueás tu primera comida</p>
        </div>
      )}
      {todayPlan && (todayPlan.morning_brief || todayPlan.midday_adjust || todayPlan.evening_wrap) && (
        <div className="bg-white/5 border border-white/10 rounded-2xl px-4 py-3 mb-4">
          <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Daily Insight</p>
          <p className="text-xs text-gray-400 line-clamp-2 mt-0.5 leading-snug">
            {todayPlan.morning_brief || todayPlan.midday_adjust || todayPlan.evening_wrap}
          </p>
        </div>
      )}

      {/* ═══ JOURNAL (always visible, read-only) ═══ */}
      <Link to="/habits" className="block mb-4">
        <div className="bg-slate-900/50 border border-white/5 rounded-2xl p-4">
          {journalEntry ? (
            <div className="flex items-center gap-3">
              <span className="text-xl">{journalEntry.mood ? ['', '😫', '😕', '😐', '😊', '🔥'][journalEntry.mood] : '📝'}</span>
              <div className="flex-1 min-w-0">
                <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Journal de hoy</p>
                <p className="text-xs text-gray-300 truncate mt-0.5">{journalEntry.content}</p>
              </div>
              <span className="text-gray-600 text-xs">→</span>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <span className="text-xl">📝</span>
              <div className="flex-1">
                <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Journal</p>
                <p className="text-xs text-gray-400 mt-0.5">¿Cómo estuvo tu día? Registrá cómo te sentís →</p>
              </div>
            </div>
          )}
        </div>
      </Link>

      {/* Damage Control (read-only progress if active) */}
      {damagePlan && (
        <div className="bg-white/5 border border-white/10 rounded-2xl px-4 py-3 mb-4">
          <div className="flex items-center justify-between mb-1">
            <p className="text-[9px] font-black text-amber-400 uppercase tracking-widest">🔄 Compensación</p>
            <span className="text-[9px] text-gray-600">{damagePlan.days_completed}/{damagePlan.spread_days} días</span>
          </div>
          <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-amber-500 to-emerald-500 rounded-full transition-all" style={{ width: Math.round((damagePlan.days_completed / damagePlan.spread_days) * 100) + '%' }} />
          </div>
        </div>
      )}

      {/* ═══ VER MÁS (secondary content) ═══ */}
      <button
        onClick={() => setShowMore(!showMore)}
        className="w-full text-center py-3 text-[10px] font-black text-gray-500 uppercase tracking-widest active:text-gray-300 transition"
      >
        {showMore ? '△ Menos' : '▽ Ver más'}
      </button>

      {showMore && (
        <div className="space-y-3 animate-fade-in">
          {/* Stats row */}
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
            {nextLevel && (
              <div className="bg-white/5 border border-white/10 rounded-2xl p-3 text-center">
                <p className="text-lg font-black text-violet-400">{totalPoints}</p>
                <p className="text-[8px] text-gray-600 uppercase">{level.badge} pts</p>
              </div>
            )}
          </div>

          {/* Level bar */}
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

          {/* Cycle */}
          {activeCycle && currentWeekStats && (
            <Link to="/progress" className="block">
              <div className="bg-white/5 border border-white/10 rounded-2xl p-3 flex items-center justify-between">
                <div className="flex gap-3">
                  {HABITS.map(h => {
                    const stat = currentWeekStats.habits[h.type]
                    return <span key={h.type} className="text-sm">{stat ? getLight(stat.full, stat.weeklyTarget) : '·'}</span>
                  })}
                </div>
                <span className="text-[10px] text-gray-600">S{currentWeekIndex + 1}/4 →</span>
              </div>
            </Link>
          )}

          <WeeklyDigest />

          {/* Journal prompt — links to /habits at night */}
          {new Date().getHours() >= 21 && (
            <Link to="/habits" className="block bg-white/5 border border-violet-500/20 rounded-2xl p-3 active:bg-white/10 transition">
              <p className="text-[9px] font-black text-violet-400 uppercase tracking-widest">📝 ¿Cómo fue tu día?</p>
              <p className="text-xs text-gray-500 mt-0.5">Tocá para escribir en tu diario →</p>
            </Link>
          )}
        </div>
      )}

      {/* Coach AI floating pill */}
      {commandLine && commandLine !== 'Seguí así. Cada hábito suma.' && (
        <div className="fixed bottom-24 right-4 bg-white/5 backdrop-blur-xl border border-blue-500/30 p-3 rounded-full flex items-center gap-2 z-40 max-w-[260px]">
          <div className="w-2 h-2 bg-blue-500 rounded-full animate-ping flex-shrink-0" />
          <span className="text-[9px] font-bold text-blue-400 uppercase truncate">Brim: "{commandLine.slice(0, 60)}..."</span>
        </div>
      )}
    </div>
  )
}
