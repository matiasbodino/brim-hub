import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { usePlanStore } from '../../stores/planStore'
import { useFoodStore } from '../../stores/foodStore'
import { MATI_ID } from '../../lib/constants'

import { useHabitStore } from '../../stores/habitStore'
import { getTodayBurn } from '../../lib/activeBurn'

const EDGE_URL = 'https://birpqzahbtfbxxtaqeth.supabase.co/functions/v1'
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJpcnBxemFoYnRmYnh4dGFxZXRoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ0OTExODMsImV4cCI6MjA5MDA2NzE4M30.f85JKwllPo1dLRvzFphPkLL8bEMts0IYjqCnTLDrA_c'

const MEAL_EMOJIS = { breakfast: '☕', lunch: '🍽', snack: '🧉', dinner: '🌙' }
const MEAL_LABELS = { breakfast: 'Desayuno', lunch: 'Almuerzo', snack: 'Merienda', dinner: 'Cena' }

function MealOption({ option, type, label, onLog }) {
  return (
    <div className="bg-white rounded-xl p-3 border border-slate-100">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-bold text-slate-700">{option.name}</span>
        <span className="text-[10px] text-slate-400">{option.estimated_calories} kcal · {option.estimated_protein}g prot</span>
      </div>
      <p className="text-xs text-slate-500 mb-2">{option.description}</p>
      <button
        onClick={() => onLog(type, option)}
        className="text-xs font-bold text-violet-600 active:text-violet-800"
      >
        Loggear esto →
      </button>
    </div>
  )
}

function SmartSuggestion({ remaining, onLog }) {
  const [suggestion, setSuggestion] = useState(null)
  const [loading, setLoading] = useState(false)
  const [showRecipe, setShowRecipe] = useState(false)

  const handleGenerate = async () => {
    setLoading(true)
    try {
      const todayHabits = useHabitStore.getState().todayHabits
      const burn = getTodayBurn(todayHabits)
      const context = burn.total > 600
        ? `post-entrenamiento (quemó ${burn.total} kcal hoy: ${burn.breakdown.map(b => b.source).join(' + ')})`
        : burn.total > 300 ? `día activo (${burn.total} kcal quemadas)` : ''

      const res = await fetch(EDGE_URL + '/chef-suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + ANON_KEY },
        body: JSON.stringify({
          remaining_macros: remaining,
          context,
        }),
      })
      const data = await res.json()
      if (!data.error) setSuggestion(data)
    } catch { /* silent */ }
    setLoading(false)
  }

  const handleLog = () => {
    if (!suggestion) return
    onLog({
      meal_type: suggestion.meal_type || 'cena',
      description: suggestion.meal_name,
      calories: suggestion.macros?.kcal || 0,
      protein: suggestion.macros?.protein || 0,
      carbs: suggestion.macros?.carbs || 0,
      fat: suggestion.macros?.fat || 0,
    })
    setSuggestion(null)
  }

  if (suggestion) {
    return (
      <div className="bg-emerald-50 rounded-[2rem] p-5 border border-emerald-100 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-black text-emerald-700">👨‍🍳 Chef Bio-Analítico</span>
          <button onClick={() => setSuggestion(null)} className="text-[10px] text-slate-400">✕</button>
        </div>

        {/* Brim says */}
        {suggestion.brim_says && (
          <p className="text-sm text-slate-700 italic">"{suggestion.brim_says}"</p>
        )}

        {/* Meal name */}
        <h4 className="text-base font-black text-slate-800">{suggestion.meal_name}</h4>

        {/* Macros */}
        <div className="grid grid-cols-4 gap-2 text-center py-2 bg-white rounded-xl">
          <div><p className="text-sm font-black text-emerald-700">{suggestion.macros?.kcal}</p><p className="text-[8px] text-slate-400">kcal</p></div>
          <div><p className="text-sm font-black text-blue-600">{suggestion.macros?.protein}g</p><p className="text-[8px] text-slate-400">prot</p></div>
          <div><p className="text-sm font-black text-amber-600">{suggestion.macros?.carbs}g</p><p className="text-[8px] text-slate-400">carbs</p></div>
          <div><p className="text-sm font-black text-red-500">{suggestion.macros?.fat}g</p><p className="text-[8px] text-slate-400">fat</p></div>
        </div>

        {/* Why */}
        {suggestion.why && (
          <p className="text-[10px] text-emerald-600">{suggestion.why}</p>
        )}
        {suggestion.overflow_note && (
          <p className="text-[10px] text-amber-600 bg-amber-50 rounded-lg px-2 py-1 mt-1">{suggestion.overflow_note}</p>
        )}

        {/* Expandable recipe */}
        <button onClick={() => setShowRecipe(!showRecipe)} className="text-[10px] font-bold text-emerald-700">
          {showRecipe ? '▲ Ocultar receta' : '▼ Ver ingredientes y pasos'}
        </button>
        {showRecipe && (
          <div className="space-y-2 animate-fade-in">
            {suggestion.ingredients && (
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase">Ingredientes</p>
                <ul className="text-xs text-slate-600 mt-1 space-y-0.5">
                  {suggestion.ingredients.map((ing, i) => <li key={i}>• {ing}</li>)}
                </ul>
              </div>
            )}
            {suggestion.instructions && (
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase">Pasos</p>
                <p className="text-xs text-slate-600 mt-1">{suggestion.instructions}</p>
              </div>
            )}
          </div>
        )}

        <button
          onClick={handleLog}
          className="w-full bg-emerald-600 text-white py-3.5 rounded-xl font-black text-sm active:scale-95 transition"
        >
          ✅ Loggear esta comida
        </button>
      </div>
    )
  }

  return (
    <button
      onClick={handleGenerate}
      disabled={loading}
      className="w-full bg-emerald-50 text-emerald-700 py-3.5 rounded-2xl text-xs font-bold border border-emerald-100 active:bg-emerald-100 transition disabled:opacity-50"
    >
      {loading ? '👨‍🍳 El Chef está pensando...' : `🎯 ¿Qué como para clavar ${remaining.calories} kcal y ${remaining.protein}g prot?`}
    </button>
  )
}

function MealSlot({ type, data, onLog }) {
  const [expanded, setExpanded] = useState(false)

  // Support both formats: { options: [...] } (new) and { name, ... } (old)
  const options = data.options || [data]
  const firstOption = options[0]

  return (
    <div className="bg-violet-50 rounded-2xl p-3 transition-all">
      <div className="flex items-center justify-between cursor-pointer" onClick={() => setExpanded(!expanded)}>
        <div className="flex items-center gap-2">
          <span className="text-base">{MEAL_EMOJIS[type] || '🍽'}</span>
          <span className="text-xs font-bold text-slate-700">{MEAL_LABELS[type] || type}</span>
          <span className="text-xs text-slate-400">~{firstOption.estimated_calories} kcal</span>
        </div>
        <div className="flex items-center gap-1">
          {options.length > 1 && <span className="text-[10px] bg-violet-200 text-violet-700 px-1.5 py-0.5 rounded-full font-bold">{options.length} opciones</span>}
          <span className="text-[10px] text-slate-400">{expanded ? '▲' : '▼'}</span>
        </div>
      </div>
      {expanded && (
        <div className="mt-3 space-y-2 animate-fade-in">
          {options.map((opt, i) => (
            <MealOption
              key={i}
              option={opt}
              type={type}
              label={options.length > 1 ? (i === 0 ? 'Opción A' : 'Opción B') : null}
              onLog={onLog}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export default function DailyPlan() {
  const { todayPlan, loading, generatePlan } = usePlanStore()
  const timeOfDay = usePlanStore.getState().getTimeOfDay()
  const navigate = useNavigate()
  const [expanded, setExpanded] = useState(false)

  const handleLogMeal = (type, meal) => {
    const mealTypeMap = { breakfast: 'desayuno', lunch: 'almuerzo', snack: 'merienda', dinner: 'cena' }
    navigate('/habits', {
      state: {
        prefill: {
          meal_type: mealTypeMap[type] || 'almuerzo',
          description: meal.name + (meal.description ? ' - ' + meal.description : ''),
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

  const narrative = timeOfDay === 'morning' ? plan.morning_brief
    : timeOfDay === 'midday' ? (plan.midday_adjust || plan.morning_brief)
    : (plan.evening_wrap || plan.midday_adjust || plan.morning_brief)

  const isEvening = timeOfDay === 'evening'
  const calOk = consumed.calories <= targets.calories
  const protLow = consumed.protein < targets.protein * 0.5

  const isFatigued = targets.fatigue_detected
  const isRecovery = targets.recovery_mode
  const trainingLoad = targets.training_load

  return (
    <div className={`bg-white rounded-[2rem] p-5 shadow-sm border-l-4 ${
      isFatigued ? 'border-blue-400'
      : isEvening ? (calOk ? 'border-emerald-500' : 'border-amber-500')
      : 'border-violet-600'
    } border border-slate-100`}>

      {/* Fatigue banner */}
      {isFatigued && (
        <div className="bg-blue-50 rounded-xl px-4 py-3 mb-4 flex items-start gap-2">
          <span className="text-lg">🧘</span>
          <div>
            <p className="text-xs font-black text-blue-700">Día de Recuperación Activa</p>
            <p className="text-[10px] text-blue-600 mt-0.5">Energía baja detectada. Hoy bajamos intensidad, subimos agua y prioridad: descansar bien. Mañana volvemos con todo.</p>
          </div>
        </div>
      )}

      {/* Training load spike banner */}
      {trainingLoad?.spike && !isFatigued && (
        <div className="bg-red-50 rounded-xl px-4 py-3 mb-4 flex items-start gap-2">
          <span className="text-lg">🔴</span>
          <div>
            <p className="text-xs font-black text-red-700">Carga de entrenamiento alta</p>
            <p className="text-[10px] text-red-600 mt-0.5">
              Últimos 3 días: {trainingLoad.last3Days} puntos vs promedio {trainingLoad.weeklyAvg} (+{Math.round((trainingLoad.last3Days / trainingLoad.weeklyAvg - 1) * 100)}%).
              Hoy bajamos intensidad para recuperar.
            </p>
          </div>
        </div>
      )}

      {/* Collapsible header zone — tap anywhere here to toggle */}
      <div className="cursor-pointer" onClick={() => setExpanded(!expanded)}>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">
            {isFatigued ? '🧘 Recuperación' : trainingLoad?.spike ? '🔴 Recovery Mode' : isEvening ? '📊 Resumen del día' : timeOfDay === 'midday' ? '⚡ Recálculo del día' : '🎯 Tu plan para hoy'}
          </h3>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-slate-400">
              {new Date().toLocaleDateString('es-AR', { weekday: 'short', day: 'numeric' })}
            </span>
            <span className={`text-slate-400 text-xs transition-transform duration-300 ${expanded ? 'rotate-180' : ''}`}>▼</span>
          </div>
        </div>

        {/* Narrative — truncated when collapsed, full when expanded */}
        {narrative && (
          <p className={`text-sm text-slate-700 leading-relaxed ${expanded ? 'mb-3' : 'mb-1 line-clamp-2'}`}>{narrative}</p>
        )}

        {/* Collapsed summary */}
        {!expanded && (
          <div className="flex items-center gap-3 text-xs text-slate-400 mt-1">
            <span>{consumed.calories}/{targets.calories} kcal</span>
            <span>·</span>
            <span>{consumed.protein}/{targets.protein}g prot</span>
            {calPct > 0 && <span>· {calPct}%</span>}
          </div>
        )}
      </div>

      {expanded && <>
      {/* Targets + Progress */}
      <div className="space-y-3 mb-4">
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-500">
            Consumido: <strong>{consumed.calories} kcal</strong> · <strong>{consumed.protein}g prot</strong>
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

      {/* Remaining budget + smart suggestion */}
      {!isEvening && remaining.calories > 0 && (
        <div className="space-y-3 mb-4">
          <div className="text-xs text-slate-500">
            Te quedan: <strong>{remaining.calories} kcal</strong> · <strong>{remaining.protein}g prot</strong> para repartir
          </div>
          <SmartSuggestion
            remaining={remaining}
            onLog={(suggestion) => {
              const { addLog } = useFoodStore.getState()
              addLog({
                meal_type: suggestion.meal_type || 'cena',
                description: suggestion.description,
                calories: suggestion.calories,
                protein: suggestion.protein,
                carbs: suggestion.carbs || 0,
                fat: suggestion.fat || 0,
                confirmed: true,
                user_id: MATI_ID,
              })
            }}
          />
        </div>
      )}

      {/* Meal suggestions - 2 options per slot */}
      {!isEvening && meals && Object.keys(meals).length > 0 && (
        <div className="space-y-2 mb-3">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Comidas sugeridas</p>
          {Object.entries(meals).map(([type, data]) => (
            <MealSlot key={type} type={type} data={data} onLog={handleLogMeal} />
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
      </>}
    </div>
  )
}
