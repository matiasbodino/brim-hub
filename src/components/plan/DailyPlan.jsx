import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { usePlanStore } from '../../stores/planStore'

const MEAL_EMOJIS = { breakfast: '☕', lunch: '🍽', snack: '🧉', dinner: '🌙' }
const MEAL_LABELS = { breakfast: 'Desayuno', lunch: 'Almuerzo', snack: 'Merienda', dinner: 'Cena' }

function MealSuggestion({ type, meal, onLog }) {
  const [expanded, setExpanded] = useState(false)
  return (
    <div
      className="bg-violet-50 rounded-2xl p-3 cursor-pointer transition-all"
      onClick={() => setExpanded(!expanded)}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-base">{MEAL_EMOJIS[type] || '🍽'}</span>
          <span className="text-xs font-bold text-slate-700">{MEAL_LABELS[type] || type}</span>
          <span className="text-xs text-slate-400">~{meal.estimated_calories} kcal</span>
        </div>
        <span className="text-[10px] text-slate-400">{expanded ? '▲' : '▼'}</span>
      </div>
      {expanded && (
        <div className="mt-2 space-y-2 animate-fade-in">
          <p className="text-sm text-slate-700 font-medium">{meal.name}</p>
          <p className="text-xs text-slate-500">{meal.description}</p>
          <p className="text-xs text-slate-400">{meal.estimated_calories} kcal · {meal.estimated_protein}g prot</p>
          <button
            onClick={(e) => { e.stopPropagation(); onLog(type, meal) }}
            className="text-xs font-bold text-violet-600 flex items-center gap-1"
          >
            Loggear esto →
          </button>
        </div>
      )}
    </div>
  )
}

export default function DailyPlan() {
  const { todayPlan, loading, generatePlan } = usePlanStore()
  const timeOfDay = usePlanStore.getState().getTimeOfDay()
  const navigate = useNavigate()

  const handleLogMeal = (type, meal) => {
    const mealTypeMap = { breakfast: 'desayuno', lunch: 'almuerzo', snack: 'merienda', dinner: 'cena' }
    navigate('/habits', {
      state: {
        prefill: {
          meal_type: mealTypeMap[type] || 'almuerzo',
          description: meal.name + ' - ' + meal.description,
          calories: meal.estimated_calories,
          protein: meal.estimated_protein,
        }
      }
    })
  }

  if (!todayPlan && !loading) {
    return (
      <button
        onClick={generatePlan}
        className="w-full bg-white rounded-[2rem] p-6 border border-slate-100 shadow-sm text-center active:scale-[0.98] transition"
      >
        <span className="text-2xl block mb-2">🎯</span>
        <span className="text-sm font-bold text-slate-800">Generar plan del día</span>
        <p className="text-[10px] text-slate-400 mt-1">Targets ajustados + comidas sugeridas</p>
      </button>
    )
  }

  if (loading) {
    return (
      <div className="bg-white rounded-[2rem] p-6 border border-slate-100 shadow-sm text-center">
        <div className="w-6 h-6 bg-violet-600 rounded-lg animate-pulse mx-auto mb-2" />
        <p className="text-xs text-slate-400">Generando tu plan...</p>
      </div>
    )
  }

  const plan = todayPlan
  const targets = plan.adjusted_targets || {}
  const consumed = plan.consumed_so_far || {}
  const remaining = plan.remaining_budget || {}
  const week = plan.week_progress || {}
  const meals = plan.meal_suggestions || {}
  const calPct = targets.calories > 0 ? Math.round((consumed.calories / targets.calories) * 100) : 0

  // Pick narrative by time of day
  const narrative = timeOfDay === 'morning' ? plan.morning_brief
    : timeOfDay === 'midday' ? (plan.midday_adjust || plan.morning_brief)
    : (plan.evening_wrap || plan.midday_adjust || plan.morning_brief)

  const isEvening = timeOfDay === 'evening'
  const calOk = consumed.calories <= targets.calories
  const protLow = consumed.protein < targets.protein * 0.5

  return (
    <div className={`bg-white rounded-[2rem] p-5 shadow-sm border-l-4 ${
      isEvening ? (calOk ? 'border-emerald-500' : 'border-amber-500') : 'border-violet-600'
    } border border-slate-100`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">
          {isEvening ? '📊 Resumen del día' : timeOfDay === 'midday' ? '⚡ Recálculo del día' : '🎯 Tu plan para hoy'}
        </h3>
        <span className="text-[10px] text-slate-400">v{plan.plan_version}</span>
      </div>

      {/* Narrative */}
      {narrative && (
        <p className="text-sm text-slate-700 leading-relaxed mb-4">{narrative}</p>
      )}

      {/* Targets + Progress */}
      <div className="space-y-3 mb-4">
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-500">
            {isEvening ? 'Consumido' : 'Consumido hasta ahora'}: <strong>{consumed.calories} kcal</strong> · <strong>{consumed.protein}g prot</strong>
          </span>
        </div>
        <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-1000 ${calPct > 100 ? 'bg-red-500' : 'bg-violet-600'}`}
            style={{ width: `${Math.min(calPct, 100)}%` }}
          />
        </div>
        <div className="flex justify-between text-[10px] text-slate-400">
          <span>{calPct}% del target</span>
          <span>{targets.calories} kcal · {targets.protein}g prot</span>
        </div>
      </div>

      {/* Adjusted target reason */}
      {targets.reason && (
        <p className="text-xs text-slate-500 bg-slate-50 rounded-xl px-3 py-2 mb-4">
          📝 {targets.reason}
        </p>
      )}

      {/* Protein warning */}
      {protLow && !isEvening && (
        <div className="text-xs text-amber-600 bg-amber-50 rounded-xl px-3 py-2 mb-4">
          ⚠️ Proteína viene baja — te faltan {remaining.protein}g
        </div>
      )}

      {/* Remaining budget (midday/morning) */}
      {!isEvening && remaining.calories > 0 && (
        <div className="text-xs text-slate-500 mb-4">
          Te quedan: <strong>{remaining.calories} kcal</strong> · <strong>{remaining.protein}g prot</strong>
        </div>
      )}

      {/* Meal suggestions */}
      {!isEvening && meals && Object.keys(meals).length > 0 && (
        <div className="space-y-2 mb-3">
          {Object.entries(meals).map(([type, meal]) => (
            <MealSuggestion key={type} type={type} meal={meal} onLog={handleLogMeal} />
          ))}
        </div>
      )}

      {/* Evening: final stats */}
      {isEvening && (
        <div className="grid grid-cols-3 gap-2 text-center py-3 border-t border-slate-100">
          <div>
            <p className="text-lg font-black text-slate-800">{consumed.calories}/{targets.calories}</p>
            <p className="text-[8px] text-slate-400 font-bold uppercase">kcal {calOk ? '✅' : '⚠️'}</p>
          </div>
          <div>
            <p className="text-lg font-black text-slate-800">{consumed.protein}/{targets.protein}</p>
            <p className="text-[8px] text-slate-400 font-bold uppercase">prot {consumed.protein >= targets.protein ? '✅' : '⚠️'}</p>
          </div>
          <div>
            <p className="text-lg font-black text-slate-800">{week.pct}%</p>
            <p className="text-[8px] text-slate-400 font-bold uppercase">semana</p>
          </div>
        </div>
      )}
    </div>
  )
}
