import { useEffect } from 'react'
import { useHabitStore } from '../stores/habitStore'

function HabitTracker({ type, label, emoji, value, target, unit, onUpdate }) {
  const pct = target > 0 ? Math.min(100, Math.round((value / target) * 100)) : 0
  const done = value >= target

  return (
    <div className={`bg-white rounded-2xl p-4 border ${done ? 'border-violet-200 bg-violet-50' : 'border-gray-100'}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-xl">{emoji}</span>
          <span className="font-semibold text-gray-800">{label}</span>
        </div>
        {done && <span className="text-violet-600 font-bold text-sm">✓</span>}
      </div>

      <div className="text-2xl font-bold text-gray-900 mb-1">
        {value} <span className="text-sm font-normal text-gray-400">/ {target} {unit}</span>
      </div>

      <div className="h-2 bg-gray-100 rounded-full overflow-hidden mb-3">
        <div className={`h-full rounded-full transition-all ${done ? 'bg-violet-500' : 'bg-violet-300'}`} style={{ width: pct + '%' }} />
      </div>

      <div className="flex gap-2">
        {type === 'water' && (
          <>
            <button onClick={() => onUpdate(value + 0.25)} className="flex-1 py-2 text-sm font-semibold rounded-xl border border-gray-200 active:bg-gray-50">+250ml</button>
            <button onClick={() => onUpdate(value + 0.5)} className="flex-1 py-2 text-sm font-semibold rounded-xl border border-gray-200 active:bg-gray-50">+500ml</button>
          </>
        )}
        {type === 'steps' && (
          <>
            <button onClick={() => onUpdate(value + 1000)} className="flex-1 py-2 text-sm font-semibold rounded-xl border border-gray-200 active:bg-gray-50">+1000</button>
            <button onClick={() => onUpdate(value + 5000)} className="flex-1 py-2 text-sm font-semibold rounded-xl border border-gray-200 active:bg-gray-50">+5000</button>
          </>
        )}
        {(type === 'bjj' || type === 'gym') && (
          <button
            onClick={() => onUpdate(value >= 1 ? 0 : 1)}
            className={`flex-1 py-2 text-sm font-semibold rounded-xl transition ${
              value >= 1
                ? 'bg-violet-600 text-white'
                : 'border border-gray-200 text-gray-600'
            }`}
          >
            {value >= 1 ? 'Hecho ✓' : 'Marcar como hecho'}
          </button>
        )}
      </div>
    </div>
  )
}

export default function Habits() {
  const { todayHabits, fetchToday, upsertHabit } = useHabitStore()

  useEffect(() => { fetchToday() }, [])

  const habits = [
    { type: 'water', label: 'Agua', emoji: '💧', target: 2.5, unit: 'L' },
    { type: 'steps', label: 'Pasos', emoji: '🚶', target: 10000, unit: '' },
    { type: 'bjj', label: 'BJJ', emoji: '🥋', target: 1, unit: '' },
    { type: 'gym', label: 'Gym', emoji: '🏋️', target: 1, unit: '' },
  ]

  return (
    <div className="px-4 py-5 pb-24 space-y-4">
      <h1 className="text-xl font-bold text-gray-900">Hábitos</h1>
      {habits.map(h => (
        <HabitTracker
          key={h.type}
          type={h.type}
          label={h.label}
          emoji={h.emoji}
          value={Number(todayHabits[h.type]?.value || 0)}
          target={h.target}
          unit={h.unit}
          onUpdate={(val) => upsertHabit(h.type, val, h.target)}
        />
      ))}
    </div>
  )
}
