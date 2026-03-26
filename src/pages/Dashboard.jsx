import { useEffect } from 'react'
import { useFoodStore } from '../stores/foodStore'
import { useHabitStore } from '../stores/habitStore'

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

function HabitCheck({ label, done, emoji }) {
  return (
    <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border ${done ? 'bg-violet-50 border-violet-200' : 'bg-gray-50 border-gray-200'}`}>
      <span className="text-lg">{emoji}</span>
      <span className={`text-sm font-medium ${done ? 'text-violet-700' : 'text-gray-400'}`}>{label}</span>
      {done && <span className="ml-auto text-violet-600 text-sm font-bold">✓</span>}
    </div>
  )
}

export default function Dashboard() {
  const { todayLogs, fetchToday: fetchFood, getTodayMacros } = useFoodStore()
  const { todayHabits, fetchToday: fetchHabits } = useHabitStore()

  useEffect(() => {
    fetchFood()
    fetchHabits()
  }, [])

  const macros = getTodayMacros()
  const targets = { calories: 2100, protein: 150, carbs: 210, fat: 70 }

  const habits = [
    { key: 'water', label: 'Agua', emoji: '💧', target: 2.5 },
    { key: 'steps', label: 'Pasos', emoji: '🚶', target: 10000 },
    { key: 'bjj', label: 'BJJ', emoji: '🥋', target: 1 },
    { key: 'gym', label: 'Gym', emoji: '🏋️', target: 1 },
  ]

  const completedHabits = habits.filter(h => {
    const log = todayHabits[h.key]
    return log && Number(log.value) >= h.target
  }).length
  const score = habits.length > 0 ? Math.round((completedHabits / habits.length) * 100) : 0

  return (
    <div className="px-4 py-5 pb-24 space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-gray-900">Hoy</h1>
        <p className="text-sm text-gray-500">
          {new Date().toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })}
        </p>
      </div>

      {/* Score */}
      <div className="bg-violet-600 rounded-2xl p-5 text-center text-white">
        <div className="text-4xl font-bold">{score}%</div>
        <div className="text-sm text-violet-200 mt-1">{completedHabits} de {habits.length} hábitos completados</div>
      </div>

      {/* Macros */}
      <div className="bg-white rounded-2xl p-4 border border-gray-100 space-y-3">
        <h2 className="text-sm font-semibold text-gray-700">Macros del día</h2>
        <MacroBar label="Calorías" current={macros.calories} target={targets.calories} color="bg-violet-500" />
        <MacroBar label="Proteína" current={Math.round(macros.protein)} target={targets.protein} color="bg-blue-500" />
        <MacroBar label="Carbs" current={Math.round(macros.carbs)} target={targets.carbs} color="bg-amber-500" />
        <MacroBar label="Grasa" current={Math.round(macros.fat)} target={targets.fat} color="bg-red-400" />
      </div>

      {/* Habits */}
      <div className="bg-white rounded-2xl p-4 border border-gray-100 space-y-2">
        <h2 className="text-sm font-semibold text-gray-700 mb-2">Hábitos</h2>
        {habits.map(h => (
          <HabitCheck
            key={h.key}
            label={h.label}
            emoji={h.emoji}
            done={todayHabits[h.key] && Number(todayHabits[h.key].value) >= h.target}
          />
        ))}
      </div>

      {/* Last meal */}
      {todayLogs.length > 0 && (
        <div className="bg-white rounded-2xl p-4 border border-gray-100">
          <h2 className="text-sm font-semibold text-gray-700 mb-2">Última comida</h2>
          <p className="text-sm text-gray-600">{todayLogs[todayLogs.length - 1].description}</p>
          <p className="text-xs text-gray-400 mt-1">
            {todayLogs[todayLogs.length - 1].calories} kcal ·
            {todayLogs[todayLogs.length - 1].protein}g prot
          </p>
        </div>
      )}
    </div>
  )
}
