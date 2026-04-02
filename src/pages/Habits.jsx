import { useEffect, useState, useMemo } from 'react'
import { useHabitStore } from '../stores/habitStore'
import { usePointsStore } from '../stores/pointsStore'
import { useFoodStore } from '../stores/foodStore'
import { HABITS, HABIT_GROUPS, POINTS, MATI_ID, TARGETS } from '../lib/constants'
import { useEnergyStore } from '../stores/energyStore'
import { useTargetsStore } from '../stores/targetsStore'
import { track } from '../lib/analytics'
import { haptic } from '../lib/haptics'
import { useToast } from '../components/Toast'
import { supabase } from '../lib/supabase'
import BottomSheet from '../components/ui/BottomSheet'

const ENERGY_LEVELS = [
  { val: 1, emoji: '😴', color: 'bg-red-100 text-red-600', label: 'Agotado' },
  { val: 2, emoji: '😕', color: 'bg-orange-100 text-orange-600', label: 'Bajo' },
  { val: 3, emoji: '😐', color: 'bg-yellow-100 text-yellow-600', label: 'Ok' },
  { val: 4, emoji: '😊', color: 'bg-green-100 text-green-600', label: 'Bien' },
  { val: 5, emoji: '🔥', color: 'bg-emerald-100 text-emerald-600', label: 'Explosivo' },
]

const MEAL_EMOJIS = {
  desayuno: '☕',
  almuerzo: '🍽',
  merienda: '🧉',
  cena: '🌙',
  snack: '🍎',
}

function getMealTypeByHour() {
  const h = new Date().getHours()
  if (h >= 6 && h <= 10) return 'desayuno'
  if (h >= 11 && h <= 15) return 'almuerzo'
  if (h >= 16 && h <= 18) return 'merienda'
  if (h >= 19 && h <= 23) return 'cena'
  return 'almuerzo'
}

function ProgressDots({ todayHabits, todayEnergy, todayFoodLogs, targets }) {
  const items = [
    { key: 'energy', label: 'Energía', done: todayEnergy != null },
    { key: 'water', label: 'Agua', done: Number(todayHabits.water?.value || 0) >= (targets.water || TARGETS.water) },
    { key: 'steps', label: 'Pasos', done: Number(todayHabits.steps?.value || 0) >= (targets.steps || TARGETS.steps) },
    { key: 'gym', label: 'Gym', done: Number(todayHabits.gym?.value || 0) >= 1 },
    { key: 'bjj', label: 'BJJ', done: Number(todayHabits.bjj?.value || 0) >= 1 },
    { key: 'food', label: 'Comida', done: todayFoodLogs.length > 0 },
  ]
  const completed = items.filter(i => i.done).length

  return (
    <div className="flex items-center justify-between bg-zinc-900 rounded-2xl px-4 py-3 mb-4">
      <span className="text-sm text-zinc-300 font-medium">{completed}/{items.length} completados</span>
      <div className="flex gap-1.5">
        {items.map(i => (
          <span key={i.key} className={`text-base ${i.done ? 'text-violet-400' : 'text-zinc-700'}`}>●</span>
        ))}
      </div>
    </div>
  )
}

function EnergyPicker({ current, onSelect }) {
  const [toast, setToast] = useState(false)

  const handleSelect = (val) => {
    if (window.navigator.vibrate) window.navigator.vibrate(15)
    onSelect(val)
    setToast(true)
    setTimeout(() => setToast(false), 1500)
  }

  return (
    <div className="relative mb-4">
      <div className="flex justify-between items-center bg-white p-4 rounded-3xl shadow-sm border border-gray-50">
        {ENERGY_LEVELS.map((l) => (
          <button
            key={l.val}
            onClick={() => handleSelect(l.val)}
            className={`flex flex-col items-center p-2 rounded-2xl transition-all duration-300 ${
              current === l.val ? `${l.color} scale-110 shadow-md` : 'opacity-40 grayscale'
            }`}
          >
            <span className="text-2xl">{l.emoji}</span>
            <span className="text-[10px] font-bold mt-1 uppercase tracking-tighter">{l.label}</span>
          </button>
        ))}
      </div>
      {toast && (
        <div className="absolute -bottom-6 left-0 right-0 text-center text-xs text-green-500 font-medium animate-pulse">
          Energía guardada ✓
        </div>
      )}
    </div>
  )
}

function WeightCard() {
  const [weight, setWeight] = useState('')
  const [todayWeight, setTodayWeight] = useState(null)
  const [lastWeight, setLastWeight] = useState(null)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10)
    supabase.from('weight_logs').select('weight').eq('user_id', MATI_ID).eq('date', today).maybeSingle()
      .then(({ data }) => {
        if (data) setTodayWeight(data.weight)
      })
    supabase.from('weight_logs').select('weight').eq('user_id', MATI_ID).order('date', { ascending: false }).limit(1).maybeSingle()
      .then(({ data }) => {
        if (data) setLastWeight(data.weight)
      })
  }, [])

  const handleSave = async () => {
    if (!weight) return
    setSaving(true)
    const today = new Date().toISOString().slice(0, 10)
    const { error } = await supabase
      .from('weight_logs')
      .upsert({ user_id: MATI_ID, date: today, weight: Number(weight) }, { onConflict: 'user_id,date' })
    setSaving(false)
    if (error) return
    setTodayWeight(Number(weight))
    setWeight('')
    setEditing(false)
  }

  if (todayWeight && !editing) {
    return (
      <div className="bg-white rounded-2xl p-4 border border-violet-200 bg-violet-50 cursor-pointer" onClick={() => setEditing(true)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl">⚖️</span>
            <span className="font-semibold text-gray-800">Peso</span>
          </div>
          <span className="text-violet-600 font-bold text-sm">{todayWeight} kg ✓</span>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl p-4 border border-gray-100">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-xl">⚖️</span>
        <span className="font-semibold text-gray-800">Peso</span>
      </div>
      <div className="flex gap-2">
        <input
          type="number"
          step="0.1"
          value={weight}
          onChange={e => setWeight(e.target.value)}
          placeholder={lastWeight ? `${lastWeight} kg` : 'ej: 85.0'}
          className="flex-1 px-3 py-2 rounded-xl border border-gray-200 text-base"
        />
        <button
          onClick={handleSave}
          disabled={!weight || saving}
          className="px-4 py-2 text-sm font-semibold rounded-xl bg-violet-600 text-white disabled:opacity-40"
        >
          {saving ? '...' : 'Guardar'}
        </button>
      </div>
    </div>
  )
}

function HabitTracker({ type, label, emoji, value, target, unit, onUpdate, collapsed, onToggle }) {
  const [stepsInput, setStepsInput] = useState('')
  const pct = target > 0 ? Math.min(100, Math.round((value / target) * 100)) : 0
  const done = value >= target

  // Collapsed view for completed habits
  if (done && collapsed) {
    return (
      <div
        className="bg-white rounded-2xl px-4 py-3 border border-violet-200 bg-violet-50 opacity-60 cursor-pointer transition-all"
        onClick={onToggle}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg">{emoji}</span>
            <span className="font-semibold text-gray-800">{label}</span>
            <span className="text-sm text-gray-500">— {value}{unit ? ' ' + unit : ''}</span>
          </div>
          <span className="text-violet-600 font-bold text-sm">✓ +{POINTS[type]}pts</span>
        </div>
      </div>
    )
  }

  return (
    <div
      className={`bg-white rounded-2xl p-4 border ${done ? 'border-violet-200 bg-violet-50' : 'border-gray-100'}`}
      onClick={done ? onToggle : undefined}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-xl">{emoji}</span>
          <span className="font-semibold text-gray-800">{label}</span>
        </div>
        {done && <span className="text-violet-600 font-bold text-sm">✓ +{POINTS[type]}pts</span>}
      </div>

      <div className="text-2xl font-bold text-gray-900 mb-1">
        {value} <span className="text-sm font-normal text-gray-400">/ {target} {unit}</span>
      </div>

      <div className="h-2 bg-gray-100 rounded-full overflow-hidden mb-3">
        <div className={`h-full rounded-full transition-all ${done ? 'bg-violet-500' : 'bg-violet-300'}`} style={{ width: pct + '%' }} />
      </div>

      <div className="flex gap-2 flex-wrap">
        {type === 'water' && (
          <>
            {value > 0 && <button onClick={(e) => { e.stopPropagation(); onUpdate(Math.max(0, value - 0.25)) }} className="py-2 px-3 text-sm font-semibold rounded-xl border border-red-200 text-red-400 active:bg-red-50">−</button>}
            <button onClick={(e) => { e.stopPropagation(); onUpdate(value + 0.25) }} className="flex-1 py-2 text-sm font-semibold rounded-xl border border-gray-200 active:bg-gray-50">+250ml</button>
            <button onClick={(e) => { e.stopPropagation(); onUpdate(value + 0.5) }} className="flex-1 py-2 text-sm font-semibold rounded-xl border border-gray-200 active:bg-gray-50">+500ml</button>
          </>
        )}
        {type === 'steps' && (
          <>
            <div className="flex gap-2 w-full mb-2">
              <input
                type="number"
                value={stepsInput}
                onChange={e => setStepsInput(e.target.value)}
                placeholder={value > 0 ? String(value) : 'ej: 7200'}
                className="flex-1 px-3 py-2 rounded-xl border border-gray-200 text-base"
                onClick={e => e.stopPropagation()}
              />
              <button
                onClick={(e) => { e.stopPropagation(); if (stepsInput) { onUpdate(Number(stepsInput)); setStepsInput('') } }}
                disabled={!stepsInput}
                className="px-4 py-2 text-sm font-semibold rounded-xl bg-violet-600 text-white disabled:opacity-40"
              >
                Guardar
              </button>
            </div>
            {value > 0 && <button onClick={(e) => { e.stopPropagation(); onUpdate(Math.max(0, value - 1000)) }} className="py-2 px-3 text-sm font-semibold rounded-xl border border-red-200 text-red-400 active:bg-red-50">−</button>}
            <button onClick={(e) => { e.stopPropagation(); onUpdate(value + 1000) }} className="flex-1 py-2 text-sm font-semibold rounded-xl border border-gray-200 active:bg-gray-50">+1000</button>
            <button onClick={(e) => { e.stopPropagation(); onUpdate(value + 5000) }} className="flex-1 py-2 text-sm font-semibold rounded-xl border border-gray-200 active:bg-gray-50">+5000</button>
          </>
        )}
        {type === 'bjj' && (
          <button
            onClick={(e) => { e.stopPropagation(); onUpdate(value >= 1 ? 0 : 1) }}
            className={`flex-1 py-2 text-sm font-semibold rounded-xl transition ${
              value >= 1 ? 'bg-violet-600 text-white' : 'border border-gray-200 text-gray-600'
            }`}
          >
            {value >= 1 ? 'Hecho ✓' : 'Marcar BJJ'}
          </button>
        )}
        {type === 'gym' && (
          <button
            onClick={(e) => { e.stopPropagation(); onUpdate(value >= 1 ? 0 : 1) }}
            className={`flex-1 py-2 text-sm font-semibold rounded-xl transition ${
              value >= 1 ? 'bg-violet-600 text-white' : 'border border-gray-200 text-gray-600'
            }`}
          >
            {value >= 1 ? 'Hecho ✓' : 'Marcar Gym'}
          </button>
        )}
      </div>
    </div>
  )
}

function BJJFormContent({ onSubmit, onCancel }) {
  const [tipo, setTipo] = useState('Gi')
  const [duracion, setDuracion] = useState(60)
  const [tecnicas, setTecnicas] = useState('')
  const [notas, setNotas] = useState('')

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        {['Gi', 'No-Gi'].map(t => (
          <button key={t} onClick={() => setTipo(t)}
            className={`flex-1 py-2 text-sm font-semibold rounded-xl transition ${
              tipo === t ? 'bg-violet-600 text-white' : 'border border-gray-200 text-gray-600'
            }`}>{t}</button>
        ))}
      </div>
      <div>
        <label className="text-xs text-gray-500">Duración (min)</label>
        <input type="number" value={duracion} onChange={e => setDuracion(Number(e.target.value))}
          className="w-full px-3 py-2 rounded-xl border border-gray-200 text-base mt-1" />
      </div>
      <div>
        <label className="text-xs text-gray-500">Técnicas trabajadas</label>
        <input type="text" value={tecnicas} onChange={e => setTecnicas(e.target.value)}
          placeholder="Guard pass, sweep, armbar..."
          className="w-full px-3 py-2 rounded-xl border border-gray-200 text-base mt-1" />
      </div>
      <div>
        <label className="text-xs text-gray-500">Notas</label>
        <textarea value={notas} onChange={e => setNotas(e.target.value)}
          placeholder="Cómo te sentiste, con quién roleaste..."
          className="w-full px-3 py-2 rounded-xl border border-gray-200 text-base mt-1 h-20 resize-none" />
      </div>
      <div className="flex gap-2">
        <button onClick={onCancel} className="flex-1 py-2 text-sm font-semibold rounded-xl border border-gray-200">Cancelar</button>
        <button onClick={() => onSubmit({ tipo, duracion, tecnicas, notas })}
          className="flex-1 py-2 text-sm font-semibold rounded-xl bg-violet-600 text-white">Guardar</button>
      </div>
    </div>
  )
}

function TodayFoodList({ logs, onDelete }) {
  if (logs.length === 0) {
    return (
      <p className="text-xs text-gray-400 py-2">No registraste comidas todavía</p>
    )
  }

  const handleDelete = (log) => {
    if (window.confirm('¿Eliminar esta comida?')) {
      onDelete(log.id)
    }
  }

  return (
    <div className="space-y-1.5">
      {logs.map(log => {
        const time = log.logged_at
          ? new Date(log.logged_at).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false })
          : ''
        const mealEmoji = MEAL_EMOJIS[log.meal_type] || '🍽'
        const isAI = log.ai_estimate || false

        return (
          <div key={log.id} className="flex items-center justify-between gap-2 py-1.5 px-1 group">
            <div className="flex-1 min-w-0">
              <span className="text-xs text-gray-400">{time}</span>
              <span className="text-xs text-gray-400"> · {mealEmoji} </span>
              <span className="text-xs text-gray-700 truncate">{log.description}</span>
              <span className="text-xs text-gray-400"> · {log.calories} kcal · {log.protein}g prot</span>
              {isAI && <span className="text-xs ml-1">🤖</span>}
            </div>
            <button
              onClick={() => handleDelete(log)}
              className="flex-shrink-0 w-7 h-7 flex items-center justify-center rounded-lg text-gray-300 hover:text-red-400 hover:bg-red-50 transition-colors text-xs"
            >
              🗑
            </button>
          </div>
        )
      })}
    </div>
  )
}

function FoodSection({ onManualSubmit, store, targets }) {
  const defaultMeal = useMemo(() => getMealTypeByHour(), [])
  const [mode, setMode] = useState('ai') // 'ai' | 'manual'
  const [aiText, setAiText] = useState('')
  const [tipo, setTipo] = useState(defaultMeal)
  const [desc, setDesc] = useState('')
  const [kcal, setKcal] = useState('')
  const [prot, setProt] = useState('')
  const [carbs, setCarbs] = useState('')
  const [fat, setFat] = useState('')
  const [editing, setEditing] = useState(false)

  const { aiEstimate, aiLoading, aiError, parseWithAI, confirmAIEstimate, clearAIEstimate, todayLogs, deleteLog } = store
  const macros = store.getTodayMacros()

  const handleAISend = async () => {
    if (!aiText.trim()) return
    await parseWithAI(aiText.trim(), tipo)
  }

  const handleConfirm = async () => {
    if (!aiEstimate) return
    await confirmAIEstimate(aiEstimate)
    setAiText('')
  }

  const handleEdit = () => {
    if (!aiEstimate) return
    setDesc(aiEstimate.description)
    setKcal(String(aiEstimate.calories))
    setProt(String(aiEstimate.protein))
    setCarbs(String(aiEstimate.carbs || ''))
    setFat(String(aiEstimate.fat || ''))
    setTipo(aiEstimate.meal_type || defaultMeal)
    setEditing(true)
    setMode('manual')
  }

  const handleRetry = () => {
    clearAIEstimate()
    parseWithAI(aiText.trim(), tipo)
  }

  const handleManualSubmit = () => {
    if (!desc.trim() || !kcal) return
    const carbsVal = carbs ? Number(carbs) : null
    const fatVal = fat ? Number(fat) : null
    if (editing && aiEstimate) {
      store.confirmWithOverride(aiEstimate, {
        calories: Number(kcal),
        protein: Number(prot) || 0,
        carbs: carbsVal ?? 0,
        fat: fatVal ?? 0,
      })
    } else {
      onManualSubmit({
        meal_type: tipo,
        description: desc.trim(),
        calories: Number(kcal),
        protein: Number(prot) || 0,
        carbs: carbsVal,
        fat: fatVal,
        confirmed: true,
        user_id: MATI_ID,
      })
    }
    setDesc('')
    setKcal('')
    setProt('')
    setCarbs('')
    setFat('')
    setEditing(false)
  }

  return (
    <div className="space-y-4">
      {/* Macros del día - mini banner */}
      <div className="flex items-center justify-between px-1">
        <p className="text-xs text-slate-400">
          Hoy: {macros.calories} kcal · {macros.protein}g prot
        </p>
        {targets.calories > 0 && macros.calories < targets.calories && (
          <span className="text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-bold">
            Faltan {targets.calories - macros.calories} kcal
          </span>
        )}
      </div>

      {/* Tabs AI / Manual */}
      <div className="flex bg-slate-200/50 p-1 rounded-2xl">
        <button onClick={() => { setMode('ai'); setEditing(false) }}
          className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all ${
            mode === 'ai' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500'
          }`}>
          ✨ Carga con AI
        </button>
        <button onClick={() => setMode('manual')}
          className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all ${
            mode === 'manual' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500'
          }`}>
          ✏️ Manual
        </button>
      </div>

      {/* Meal type pills */}
      <div className="flex gap-1.5 flex-wrap">
        {['desayuno', 'almuerzo', 'merienda', 'cena', 'snack'].map(t => (
          <button key={t} onClick={() => setTipo(t)}
            className={`px-3 py-1.5 text-xs font-bold rounded-full transition-all ${
              tipo === t ? 'bg-indigo-600 text-white shadow-sm' : 'bg-white text-slate-500 border border-slate-100'
            }`}>{MEAL_EMOJIS[t] || '🍽'} {t}</button>
        ))}
      </div>

      {mode === 'ai' ? (
        <div className="space-y-4">
          {/* AI input card */}
          <div className="bg-white p-5 rounded-[2rem] shadow-sm border border-slate-100">
            <div className="flex items-center gap-2 mb-4">
              <div className="p-2 bg-indigo-100 rounded-xl">
                <span className="text-base">✨</span>
              </div>
              <h4 className="font-bold text-slate-800">Carga con AI</h4>
            </div>

            <textarea
              value={aiText}
              onChange={e => setAiText(e.target.value)}
              placeholder="Ej: Dos empanadas de carne y una coca zero..."
              className="w-full bg-slate-50 border-none rounded-2xl p-4 text-sm focus:ring-2 focus:ring-indigo-100 min-h-[100px] transition-all resize-none"
            />

            <button
              onClick={handleAISend}
              disabled={!aiText.trim() || aiLoading}
              className="w-full mt-4 bg-slate-900 text-white py-4 rounded-2xl font-bold active:scale-95 transition-all disabled:opacity-50"
            >
              {aiLoading ? 'Calculando macros...' : 'Analizar comida'}
            </button>
          </div>

          {/* Error */}
          {aiError && (
            <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-sm text-red-600">
              {aiError}
            </div>
          )}

          {/* AI Estimate - Premium card */}
          {aiEstimate && !aiLoading && (
            <div className="bg-indigo-600 rounded-[2rem] p-6 text-white shadow-xl">
              <div className="flex justify-between items-start mb-2">
                <span className="text-[10px] font-black bg-white/20 px-2 py-1 rounded-full uppercase tracking-widest">Resultado AI</span>
                <span className="text-xs">{({ high: '🟢', medium: '🟡', low: '🔴' })[aiEstimate.confidence] || '🟡'} {aiEstimate.confidence}</span>
              </div>
              <p className="text-sm font-medium text-indigo-100 mb-4">{aiEstimate.description}</p>

              <div className="grid grid-cols-4 gap-2 text-center mb-4">
                <div><p className="text-2xl font-black">{aiEstimate.calories}</p><p className="text-[10px] opacity-70">kcal</p></div>
                <div><p className="text-2xl font-black">{aiEstimate.protein}g</p><p className="text-[10px] opacity-70">Prot</p></div>
                <div><p className="text-2xl font-black">{aiEstimate.carbs}g</p><p className="text-[10px] opacity-70">Carbs</p></div>
                <div><p className="text-2xl font-black">{aiEstimate.fat}g</p><p className="text-[10px] opacity-70">Fat</p></div>
              </div>

              {/* Impact summary inline */}
              {targets.calories > 0 && (() => {
                const newTotal = macros.calories + aiEstimate.calories
                const pct = Math.round((newTotal / targets.calories) * 100)
                return (
                  <div className="mb-4">
                    <div className="flex justify-between text-[10px] font-bold opacity-80 mb-1">
                      <span>Impacto en tu día</span>
                      <span>{pct}%</span>
                    </div>
                    <div className="w-full bg-white/20 h-1.5 rounded-full overflow-hidden">
                      <div className="bg-white h-full rounded-full transition-all duration-1000" style={{ width: `${Math.min(pct, 100)}%` }} />
                    </div>
                    <p className="text-[10px] opacity-60 mt-1">{newTotal} / {targets.calories} kcal</p>
                  </div>
                )
              })()}

              {/* Breakdown */}
              {aiEstimate.breakdown && aiEstimate.breakdown.length > 0 && (
                <div className="mb-4 space-y-1">
                  {aiEstimate.breakdown.map((item, i) => (
                    <div key={i} className="flex justify-between text-xs bg-white/10 rounded-xl px-3 py-1.5">
                      <span className="opacity-80">{item.item}</span>
                      <span className="font-bold">{item.calories} kcal</span>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex gap-2">
                <button onClick={handleConfirm}
                  className="flex-1 bg-white text-indigo-600 py-3 rounded-xl font-bold text-sm active:scale-95 transition">
                  Confirmar
                </button>
                <button onClick={handleEdit}
                  className="p-3 bg-indigo-500 rounded-xl active:scale-95 transition text-sm">✏️</button>
                <button onClick={handleRetry}
                  className="p-3 bg-indigo-500 rounded-xl active:scale-95 transition text-sm">🔄</button>
                <button onClick={clearAIEstimate}
                  className="p-3 bg-indigo-500 rounded-xl active:scale-95 transition text-sm">🗑</button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white p-5 rounded-[2rem] shadow-sm border border-slate-100 space-y-3">
          <input type="text" value={desc} onChange={e => setDesc(e.target.value)}
            placeholder="Qué comiste..."
            className="w-full bg-slate-50 border-none rounded-2xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-100 transition-all" />
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase">Calorías</label>
              <input type="number" value={kcal} onChange={e => setKcal(e.target.value)}
                placeholder="500"
                className="w-full bg-slate-50 border-none rounded-xl px-3 py-2 text-sm mt-1 focus:ring-2 focus:ring-indigo-100" />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase">Proteína (g)</label>
              <input type="number" value={prot} onChange={e => setProt(e.target.value)}
                placeholder="30"
                className="w-full bg-slate-50 border-none rounded-xl px-3 py-2 text-sm mt-1 focus:ring-2 focus:ring-indigo-100" />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase">Carbos (g)</label>
              <input type="number" value={carbs} onChange={e => setCarbs(e.target.value)}
                placeholder="50"
                className="w-full bg-slate-50 border-none rounded-xl px-3 py-2 text-sm mt-1 focus:ring-2 focus:ring-indigo-100" />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase">Grasa (g)</label>
              <input type="number" value={fat} onChange={e => setFat(e.target.value)}
                placeholder="15"
                className="w-full bg-slate-50 border-none rounded-xl px-3 py-2 text-sm mt-1 focus:ring-2 focus:ring-indigo-100" />
            </div>
          </div>
          <button onClick={handleManualSubmit} disabled={!desc.trim() || !kcal}
            className="w-full bg-slate-900 text-white py-3.5 rounded-2xl font-bold active:scale-95 transition-all disabled:opacity-50">
            Guardar comida
          </button>
        </div>
      )}

      {/* Today's food list */}
      <div className="bg-white rounded-[2rem] p-5 shadow-sm border border-slate-100">
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Comidas de hoy</p>
        <TodayFoodList logs={todayLogs} onDelete={deleteLog} />
      </div>
    </div>
  )
}

export default function Habits() {
  const { todayHabits, fetchToday, upsertHabit } = useHabitStore()
  const { awardPoints, checkPerfectDay } = usePointsStore()
  const foodStore = useFoodStore()
  const { addLog, fetchToday: fetchFood, todayLogs } = foodStore
  const { todayEnergy, fetchToday: fetchEnergy, saveEnergy } = useEnergyStore()
  const { targets } = useTargetsStore()
  const [showBJJ, setShowBJJ] = useState(false)
  const [identityMsg, setIdentityMsg] = useState(null)
  const [expanded, setExpanded] = useState({})
  const [activeTab, setActiveTab] = useState('tracking')
  const showToast = useToast()

  useEffect(() => { fetchToday(); fetchEnergy(); fetchFood() }, [])

  const isHabitDone = (type) => {
    const val = Number(todayHabits[type]?.value || 0)
    const habit = HABITS.find(h => h.type === type)
    if (!habit) return false
    const runtimeTarget = type === 'water' ? targets.water
      : type === 'steps' ? targets.steps
      : habit.target
    return val >= runtimeTarget
  }

  const isCollapsed = (type) => {
    if (expanded[type] === true) return false
    if (expanded[type] === false) return true
    return isHabitDone(type)
  }

  const toggleExpanded = (type) => {
    setExpanded(prev => ({ ...prev, [type]: isCollapsed(type) }))
  }

  const showIdentity = (type) => {
    const habit = HABITS.find(h => h.type === type)
    setIdentityMsg(habit?.identity ?? null)
    setTimeout(() => setIdentityMsg(null), 2000)
  }

  const handleUpdate = async (type, val) => {
    const habit = HABITS.find(h => h.type === type)
    if (!habit) return

    if (type === 'bjj' && val >= 1 && !showBJJ) {
      setShowBJJ(true)
      return
    }

    const runtimeTarget = type === 'water' ? targets.water
      : type === 'steps' ? targets.steps
      : habit.target
    await upsertHabit(type, val, runtimeTarget)
    const prev = Number(todayHabits[type]?.value || 0)
    if (prev < runtimeTarget && val >= runtimeTarget) {
      await awardPoints(type, POINTS[type], 1)
      await checkPerfectDay()
      showIdentity(type)
      haptic(10)
      showToast('\u2713 +' + POINTS[type] + ' pts')
      track('habit_completed', { habit_type: type, completion_type: 'full' })
    } else if (prev === 0 && val > 0 && val < runtimeTarget) {
      await awardPoints(type, POINTS[type], 0.5)
      haptic(5)
      track('habit_completed', { habit_type: type, completion_type: 'partial' })
    }
  }

  const handleBJJ = async (meta) => {
    const habit = HABITS.find(h => h.type === 'bjj')
    await upsertHabit('bjj', 1, habit.target, meta)
    await awardPoints('bjj', POINTS.bjj)
    await checkPerfectDay()
    showIdentity('bjj')
    haptic(10)
    showToast('🥋 +' + POINTS.bjj + ' pts')
    track('habit_completed', { habit_type: 'bjj', completion_type: 'full' })
    setShowBJJ(false)
  }

  const handleFood = async (log) => {
    await addLog(log)
    fetchFood()
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-32 pt-6 max-w-lg mx-auto px-4 space-y-6">
      {/* Estado Vital */}
      <section>
        <div className="flex justify-between items-center px-1 mb-3">
          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Estado Vital</h3>
          <span className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-bold">HOY</span>
        </div>
        <EnergyPicker current={todayEnergy} onSelect={saveEnergy} />
      </section>

      {/* Progress Dots */}
      <ProgressDots
        todayHabits={todayHabits}
        todayEnergy={todayEnergy}
        todayFoodLogs={todayLogs}
        targets={targets}
      />

      {/* Tabs: Actividad / Nutrición */}
      <div className="flex bg-slate-200/50 p-1 rounded-2xl">
        <button
          onClick={() => setActiveTab('tracking')}
          className={`flex-1 py-3 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'tracking' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500'
          }`}
        >
          💪 Actividad
        </button>
        <button
          onClick={() => setActiveTab('food')}
          className={`flex-1 py-3 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'food' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500'
          }`}
        >
          🍽 Nutrición
        </button>
      </div>

      {activeTab === 'tracking' ? (
        <div className="space-y-6">
          {/* Peso del día */}
          <WeightCard />

          {/* Bloques de Tiempo */}
          {Object.entries(HABIT_GROUPS).map(([key, group]) => {
            if (group.habits.length === 0) return null
            return (
              <div key={key}>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 px-1">
                  {group.emoji} {group.label}
                </p>
                <div className="space-y-3">
                  {group.habits.map(h => (
                    <HabitTracker
                      key={h.type}
                      type={h.type}
                      label={h.label}
                      emoji={h.emoji}
                      value={Number(todayHabits[h.type]?.value || 0)}
                      target={h.target}
                      unit={h.unit}
                      onUpdate={(val) => handleUpdate(h.type, val)}
                      collapsed={isCollapsed(h.type)}
                      onToggle={() => toggleExpanded(h.type)}
                    />
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="space-y-4">
          <FoodSection onManualSubmit={handleFood} store={foodStore} targets={targets} />
        </div>
      )}

      {/* BJJ Bottom Sheet */}
      <BottomSheet isOpen={showBJJ} onClose={() => setShowBJJ(false)} title="🥋 Sesión de BJJ">
        <BJJFormContent onSubmit={handleBJJ} onCancel={() => setShowBJJ(false)} />
      </BottomSheet>

      {identityMsg && (
        <div className="fixed bottom-20 left-0 right-0 flex justify-center z-50 px-4">
          <div className="bg-violet-600 text-white text-sm font-medium px-4 py-2 rounded-full shadow-lg animate-pulse max-w-xs text-center">
            {identityMsg}
          </div>
        </div>
      )}
    </div>
  )
}
