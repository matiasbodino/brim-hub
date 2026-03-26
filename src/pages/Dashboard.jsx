import { useEffect } from 'react'
import { useFoodStore } from '../stores/foodStore'
import { useHabitStore } from '../stores/habitStore'
import { usePointsStore } from '../stores/pointsStore'
import { HABITS, TARGETS } from '../lib/constants'

function MacroBar({ label, current, target, color }) {
  const pct = target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 0
  return (
    <div className="flex-1">
      <div className="flex justify-between text-xs mb-1">
        <span className="text-gray-500">{label}</span>
        <span className="font-semibold text-gray-700">{current}/{target}</span>
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: pct + '%' }} />
      </div>
    </div>
  )
}

function HabitCheck({ label, done, emoji, cue, identity }) {
  return (
    <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border ${done ? 'bg-violet-50 border-violet-200' : 'bg-gray-50 border-gray-200'}`}>
      <span className="text-lg">{emoji}</span>
      <div className="flex-1 min-w-0">
        <span className={`text-sm font-medium ${done ? 'text-violet-700' : 'text-gray-400'}`}>{label}</span>
        {done
          ? <div className="text-xs text-violet-400 mt-0.5 truncate">{identity}</div>
          : <div className="text-xs text-zinc-400 mt-0.5 truncate">{cue}</div>
        }
      </div>
      {done && <span className="ml-auto text-violet-600 text-sm font-bold flex-shrink-0">✓</span>}
    </div>
  )
}

export default function Dashboard() {
  const { todayLogs, fetchToday: fetchFood, getTodayMacros } = useFoodStore()
  const { todayHabits, fetchToday: fetchHabits } = useHabitStore()
  const { totalPoints, spentPoints, streak, loading: pointsLoading, fetchAll, getLevel } = usePointsStore()

  useEffect(() => {
    fetchFood()
    fetchHabits()
    fetchAll()
  }, [])

  const macros = getTodayMacros()
  const balance = totalPoints - spentPoints
  const { current: level, next: nextLevel } = getLevel()

  const completedHabits = HABITS.filter(h => {
    const log = todayHabits[h.type]
    return log && Number(log.value) >= h.target
  }).length
  const score = HABITS.length > 0 ? Math.round((completedHabits / HABITS.length) * 100) : 0

  return (
    <div className="px-4 py-5 pb-24 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Hoy</h1>
          <p className="text-sm text-gray-500">
            {new Date().toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
        </div>
        <div className="text-right">
          <div className="text-2xl">{level.badge}</div>
          <div className="text-xs text-gray-500">{level.name}</div>
        </div>
      </div>

      {/* Score + Points + Streak */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-violet-600 rounded-2xl p-4 text-center text-white">
          <div className="text-2xl font-bold">{score}%</div>
          <div className="text-xs text-violet-200">score</div>
        </div>
        <div className="bg-amber-500 rounded-2xl p-4 text-center text-white">
          <div className="text-2xl font-bold">{balance}</div>
          <div className="text-xs text-amber-100">créditos</div>
        </div>
        <div className="bg-emerald-500 rounded-2xl p-4 text-center text-white">
          <div className="text-2xl font-bold">{streak}</div>
          <div className="text-xs text-emerald-100">racha 🔥</div>
        </div>
      </div>

      {/* Level progress */}
      {nextLevel && (
        <div className="bg-white rounded-2xl p-4 border border-gray-100">
          <div className="flex justify-between text-xs mb-1">
            <span className="text-gray-500">{level.badge} → {nextLevel.badge}</span>
            <span className="font-semibold text-gray-700">{totalPoints} / {nextLevel.min} pts</span>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full rounded-full bg-violet-400" style={{
              width: Math.min(100, Math.round(((totalPoints - level.min) / (nextLevel.min - level.min)) * 100)) + '%'
            }} />
          </div>
        </div>
      )}

      {/* Macros */}
      <div className="bg-white rounded-2xl p-4 border border-gray-100 space-y-3">
        <h2 className="text-sm font-semibold text-gray-700">Macros del día</h2>
        <MacroBar label="Calorías" current={macros.calories} target={TARGETS.calories} color="bg-violet-500" />
        <MacroBar label="Proteína" current={Math.round(macros.protein)} target={TARGETS.protein} color="bg-blue-500" />
        <MacroBar label="Carbs" current={Math.round(macros.carbs)} target={TARGETS.carbs} color="bg-amber-500" />
        <MacroBar label="Grasa" current={Math.round(macros.fat)} target={TARGETS.fat} color="bg-red-400" />
      </div>

      {/* Habits */}
      <div className="bg-white rounded-2xl p-4 border border-gray-100 space-y-2">
        <h2 className="text-sm font-semibold text-gray-700 mb-2">Hábitos</h2>
        {HABITS.map(h => (
          <HabitCheck
            key={h.type}
            label={h.label}
            emoji={h.emoji}
            cue={h.cue}
            identity={h.identity}
            done={todayHabits[h.type] && Number(todayHabits[h.type].value) >= h.target}
          />
        ))}
      </div>

      {/* Last meal */}
      {todayLogs.length > 0 && (
        <div className="bg-white rounded-2xl p-4 border border-gray-100">
          <h2 className="text-sm font-semibold text-gray-700 mb-2">Última comida</h2>
          <p className="text-sm text-gray-600">{todayLogs[todayLogs.length - 1].description}</p>
          <p className="text-xs text-gray-400 mt-1">
            {todayLogs[todayLogs.length - 1].calories} kcal · {todayLogs[todayLogs.length - 1].protein}g prot
          </p>
        </div>
      )}
    </div>
  )
}
