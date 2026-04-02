import { useEffect, useState, useMemo } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useHabitStore } from '../stores/habitStore'
import { usePointsStore } from '../stores/pointsStore'
import { useFoodStore } from '../stores/foodStore'
import { HABITS, HABIT_GROUPS, POINTS, MATI_ID, TARGETS, WATER_UNITS } from '../lib/constants'
import { useEnergyStore } from '../stores/energyStore'
import { useTargetsStore } from '../stores/targetsStore'
import { track } from '../lib/analytics'
import { hapticLight, hapticMedium, hapticHeartbeat } from '../lib/haptics'
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
      <div className="flex justify-between items-center bg-white/5 backdrop-blur-sm p-4 rounded-3xl border border-white/10">
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
      <div className="bg-green-500/10 backdrop-blur-sm rounded-2xl p-4 border border-green-500/20 cursor-pointer" onClick={() => setEditing(true)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl">⚖️</span>
            <span className="font-semibold text-gray-200">Peso</span>
          </div>
          <span className="text-violet-600 font-bold text-sm">{todayWeight} kg ✓</span>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-4 border border-white/10">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-xl">⚖️</span>
        <span className="font-semibold text-gray-200">Peso</span>
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

function HabitTracker({ type, label, emoji, value, target, unit, onUpdate, collapsed, onToggle, waterBreakdown, onAddMate }) {
  const [stepsInput, setStepsInput] = useState('')
  const pct = target > 0 ? Math.min(100, Math.round((value / target) * 100)) : 0
  const done = value >= target

  // Collapsed view for completed habits
  if (done && collapsed) {
    return (
      <div
        className="bg-white/5 backdrop-blur-sm rounded-2xl px-4 py-3 border border-white/10 opacity-50 cursor-pointer transition-all"
        onClick={onToggle}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg">{emoji}</span>
            <span className="font-semibold text-gray-200">{label}</span>
            <span className="text-sm text-gray-500">— {value}{unit ? ' ' + unit : ''}</span>
          </div>
          <span className="text-violet-600 font-bold text-sm">✓ +{POINTS[type]}pts</span>
        </div>
      </div>
    )
  }

  return (
    <div
      className={`rounded-2xl p-4 border transition-all ${done ? 'bg-white/5 border-white/10 opacity-50' : 'bg-white/5 backdrop-blur-sm border-white/10'}`}
      onClick={done ? onToggle : undefined}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-xl">{emoji}</span>
          <span className="font-semibold text-gray-200">{label}</span>
        </div>
        {done && <span className="text-violet-600 font-bold text-sm">✓ +{POINTS[type]}pts</span>}
      </div>

      <div className="text-2xl font-bold text-white mb-1">
        {value} <span className="text-sm font-normal text-gray-400">/ {target} {unit}</span>
      </div>

      {/* Progress bar — water uses custom stacked bar below */}
      {type !== 'water' && (
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden mb-3">
          <div className={`h-full rounded-full transition-all ${done ? 'bg-violet-500' : 'bg-violet-300'}`} style={{ width: pct + '%' }} />
        </div>
      )}

      <div className="flex gap-2 flex-wrap">
        {type === 'water' && (() => {
          const remaining = Math.max(0, target - value)
          const vasosLeft = Math.ceil(remaining / WATER_UNITS.VASO)
          const wb = waterBreakdown || { pure: 0, mate: 0, total: value, isMateOnly: false }
          const purePct = target > 0 ? Math.min(100, Math.round((wb.pure / target) * 100)) : 0
          const matePct = target > 0 ? Math.min(100 - purePct, Math.round((wb.mate / target) * 100)) : 0

          const handleWater = (e, amount) => {
            e.stopPropagation()
            if (window.navigator.vibrate) window.navigator.vibrate(10)
            useHabitStore.getState().addWater(amount, target)
          }
          return (
            <>
              {/* Stacked progress: pure water (blue) + mate (green) */}
              {(wb.pure > 0 || wb.mate > 0) && (
                <div className="w-full mb-2">
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden flex">
                    <div className="h-full bg-blue-400 transition-all animate-water-fill" style={{ width: purePct + '%' }} />
                    <div className="h-full bg-emerald-400 transition-all animate-water-fill" style={{ width: matePct + '%' }} />
                  </div>
                  <div className="flex justify-between mt-1">
                    <div className="flex gap-3 text-[10px] text-slate-400">
                      {wb.pure > 0 && <span><span className="inline-block w-2 h-2 rounded-full bg-blue-400 mr-1" />Agua {wb.pure.toFixed(1)}L</span>}
                      {wb.mate > 0 && <span><span className="inline-block w-2 h-2 rounded-full bg-emerald-400 mr-1" />Mate {wb.mate.toFixed(1)}L</span>}
                    </div>
                  </div>
                </div>
              )}

              {remaining > 0 && (
                <p className="text-[10px] text-blue-500 font-bold w-full mb-1">
                  Te faltan {vasosLeft} vasos para el target ({remaining.toFixed(2)}L)
                </p>
              )}

              {/* Mate-only warning */}
              {wb.isMateOnly && value >= target && (
                <p className="text-[10px] text-amber-600 bg-amber-50 rounded-lg px-2 py-1 w-full mb-1">
                  🧉 Llegaste al target con mate. Mandale un par de vasos de agua pura para limpiar el sistema. Oss!
                </p>
              )}

              <div className="flex gap-2 w-full">
                {value > 0 && (
                  <button onClick={(e) => { e.stopPropagation(); onUpdate(Math.max(0, value - WATER_UNITS.VASO)) }}
                    className="min-h-[44px] min-w-[44px] py-2 px-3 text-sm font-semibold rounded-full border border-red-200 text-red-400 active:bg-red-50">−</button>
                )}
                <button onClick={(e) => handleWater(e, WATER_UNITS.VASO)}
                  className="flex-1 min-h-[44px] py-2.5 text-[11px] font-bold rounded-full border border-blue-200 text-blue-600 active:bg-blue-50 active:scale-95 transition-all">
                  💧 Vaso
                </button>
                <button onClick={(e) => handleWater(e, WATER_UNITS.BOTELLA)}
                  className="flex-1 min-h-[44px] py-2.5 text-[11px] font-bold rounded-full border border-blue-200 text-blue-600 active:bg-blue-50 active:scale-95 transition-all">
                  🍾 Botella
                </button>
                <button onClick={(e) => { e.stopPropagation(); if (onAddMate) onAddMate() }}
                  className="flex-1 py-2.5 text-[11px] font-bold rounded-xl border border-emerald-200 text-emerald-600 active:bg-emerald-50 active:scale-95 transition-all">
                  🧉 Mate
                </button>
              </div>
            </>
          )
        })()}
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
            {value > 0 && <button onClick={(e) => { e.stopPropagation(); onUpdate(Math.max(0, value - 1000)) }} className="min-h-[44px] min-w-[44px] py-2 px-3 text-sm font-semibold rounded-full border border-red-200 text-red-400 active:bg-red-50">−</button>}
            <button onClick={(e) => { e.stopPropagation(); onUpdate(value + 1000) }} className="flex-1 min-h-[44px] py-2 text-sm font-semibold rounded-full border border-gray-200 active:bg-gray-50">+1000</button>
            <button onClick={(e) => { e.stopPropagation(); onUpdate(value + 5000) }} className="flex-1 min-h-[44px] py-2 text-sm font-semibold rounded-full border border-gray-200 active:bg-gray-50">+5000</button>
          </>
        )}
        {type === 'bjj' && (
          <button
            onClick={(e) => { e.stopPropagation(); onUpdate(value >= 1 ? 0 : 1) }}
            className={`flex-1 min-h-[44px] py-2 text-sm font-semibold rounded-full transition ${
              value >= 1 ? 'bg-violet-600 text-white' : 'border border-gray-200 text-gray-600'
            }`}
          >
            {value >= 1 ? 'Hecho ✓' : 'Marcar BJJ'}
          </button>
        )}
        {type === 'gym' && (
          <button
            onClick={(e) => { e.stopPropagation(); onUpdate(value >= 1 ? 0 : 1) }}
            className={`flex-1 min-h-[44px] py-2 text-sm font-semibold rounded-full transition ${
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
  const [duracion, setDuracion] = useState(90)
  const [tecnicas, setTecnicas] = useState('')

  const handleSave = () => {
    if (window.navigator.vibrate) window.navigator.vibrate([10, 50, 10])
    onSubmit({ tipo, duracion, tecnicas, notas: '' })
  }

  return (
    <div className="space-y-8">
      {/* Gi / No-Gi Toggle */}
      <div className="flex bg-slate-100 p-1.5 rounded-[2rem]">
        {['Gi', 'No-Gi'].map(t => (
          <button
            key={t}
            onClick={() => setTipo(t)}
            className={`flex-1 py-4 rounded-[1.5rem] font-bold text-sm transition-all ${
              tipo === t ? 'bg-white shadow-md text-indigo-600' : 'text-slate-500'
            }`}
          >
            {t === 'Gi' ? '🥋 Gi' : '🤼 No-Gi'}
          </button>
        ))}
      </div>

      {/* Duración */}
      <div className="space-y-4">
        <div className="flex justify-between text-xs font-black text-slate-400 uppercase tracking-widest">
          <div className="flex items-center gap-1">🕐 Duración</div>
          <span className="text-indigo-600">{duracion} min</span>
        </div>
        <div className="flex justify-between gap-2">
          {[60, 90, 120].map(m => (
            <button
              key={m}
              onClick={() => setDuracion(m)}
              className={`flex-1 py-3 rounded-2xl border-2 font-bold transition-all ${
                duracion === m ? 'border-indigo-600 bg-indigo-50 text-indigo-700' : 'border-slate-100 text-slate-400'
              }`}
            >
              {m}'
            </button>
          ))}
        </div>
      </div>

      {/* Técnica */}
      <div className="space-y-4">
        <div className="flex items-center gap-1 text-xs font-black text-slate-400 uppercase tracking-widest">
          📖 Técnica del día
        </div>
        <textarea
          value={tecnicas}
          onChange={e => setTecnicas(e.target.value)}
          placeholder="Ej: Paso de guardia De La Riva, Armbar desde Close Guard..."
          className="w-full bg-gray-900 border-gray-800 rounded-2xl p-5 text-sm focus:ring-2 focus:ring-indigo-100 min-h-[100px] resize-none"
        />
      </div>

      <button
        onClick={handleSave}
        className="w-full bg-green-500 text-black py-5 rounded-[2rem] font-black text-lg flex items-center justify-center gap-3 active:scale-[0.98] transition-transform"
      >
        ✅ Oss! Guardar Treino
      </button>
    </div>
  )
}

function TodayFoodList({ logs, onDelete }) {
  if (logs.length === 0) {
    return (
      <p className="text-xs text-slate-400 py-2 italic">Che, ¿todavía no comiste nada? Loggeá la primera comida y arrancamos 🍽</p>
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
        // Skeleton entry while AI is parsing
        if (log._skeleton) {
          return (
            <div key={log.id} className="flex items-center gap-2 py-2 px-1 animate-pulse">
              <div className="flex-1 min-w-0 flex items-center gap-2">
                <div className="w-4 h-4 bg-violet-200 rounded" />
                <span className="text-xs text-slate-400 truncate">{log.description}</span>
                <span className="text-[10px] bg-violet-100 text-violet-500 px-2 py-0.5 rounded-full font-bold">Analizando...</span>
              </div>
            </div>
          )
        }

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

function FoodSection({ onManualSubmit, store, targets, prefill }) {
  const defaultMeal = useMemo(() => getMealTypeByHour(), [])
  const [mode, setMode] = useState(prefill ? 'manual' : 'ai')
  const [aiText, setAiText] = useState(prefill?.description || '')
  const [tipo, setTipo] = useState(prefill?.meal_type || defaultMeal)
  const [desc, setDesc] = useState(prefill?.description || '')
  const [kcal, setKcal] = useState(prefill?.calories ? String(prefill.calories) : '')
  const [prot, setProt] = useState(prefill?.protein ? String(prefill.protein) : '')
  const [carbs, setCarbs] = useState('')
  const [fat, setFat] = useState('')
  const [editing, setEditing] = useState(false)
  const [portionSize, setPortionSize] = useState(1.0)

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
    setPortionSize(1.0)
  }

  const handleConfirmWithPortion = async (adjusted) => {
    if (!aiEstimate) return
    if (portionSize === 1.0) {
      await confirmAIEstimate(aiEstimate)
    } else {
      await store.confirmWithOverride(aiEstimate, adjusted)
    }
    setAiText('')
    setPortionSize(1.0)
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

  // "Same as yesterday" — last meal logged
  const lastMeal = todayLogs.length === 0 && store.todayLogs
    ? null // will be populated from yesterday's logs if we had them
    : null

  return (
    <div className="space-y-4">
      {/* "Same as yesterday" quick-log */}
      {todayLogs.length > 0 && todayLogs.length <= 2 && (() => {
        const last = todayLogs[todayLogs.length - 1]
        return (
          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-4 border-l-4 border-l-blue-500 flex justify-between items-center">
            <div>
              <h3 className="text-[10px] font-black text-blue-400 uppercase tracking-wider">Repetir última</h3>
              <p className="text-sm text-white font-medium">{last.description}</p>
              <p className="text-[10px] text-gray-500 italic">{last.calories} kcal · {last.protein}g prot</p>
            </div>
            <button
              onClick={() => onManualSubmit({ ...last, id: undefined, logged_at: undefined })}
              className="bg-blue-600 text-white px-4 py-2 rounded-xl text-[10px] font-black active:scale-95 transition flex-shrink-0"
            >
              LOG
            </button>
          </div>
        )
      })()}

      {/* Macros del día */}
      <div className="flex items-center justify-between px-1">
        <p className="text-xs text-gray-400">
          Hoy: {macros.calories} kcal · {macros.protein}g prot
        </p>
        {targets.calories > 0 && macros.calories < targets.calories && (
          <span className="text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-bold">
            Faltan {targets.calories - macros.calories} kcal
          </span>
        )}
      </div>

      {/* Tabs AI / Manual */}
      <div className="flex bg-white/5 p-1 rounded-2xl">
        <button onClick={() => { setMode('ai'); setEditing(false) }}
          className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all ${
            mode === 'ai' ? 'bg-white/10 shadow-sm text-blue-400' : 'text-slate-500'
          }`}>
          ✨ Carga con AI
        </button>
        <button onClick={() => setMode('manual')}
          className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all ${
            mode === 'manual' ? 'bg-white/10 shadow-sm text-blue-400' : 'text-slate-500'
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
          <div className="bg-white/5 backdrop-blur-sm p-5 rounded-[2rem] border border-white/10">
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
              className="w-full bg-gray-900 border-gray-800 rounded-2xl p-4 text-sm focus:ring-2 focus:ring-indigo-100 min-h-[100px] transition-all resize-none"
            />

            <button
              onClick={handleAISend}
              disabled={!aiText.trim() || aiLoading}
              className="w-full mt-4 bg-green-500 text-black py-4 rounded-2xl font-bold active:scale-95 transition-all disabled:opacity-50"
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

          {/* AI Estimate - Premium card with portion size */}
          {aiEstimate && !aiLoading && (() => {
            const portionSizes = [
              { label: 'Chico (0.7x)', val: 0.7, emoji: '☕' },
              { label: 'Normal (1.0x)', val: 1.0, emoji: '🍽️' },
              { label: 'XL (1.3x)', val: 1.3, emoji: '🏔️' },
            ]
            const adjusted = {
              calories: Math.round(aiEstimate.calories * portionSize),
              protein: Math.round(aiEstimate.protein * portionSize),
              carbs: Math.round((aiEstimate.carbs || 0) * portionSize),
              fat: Math.round((aiEstimate.fat || 0) * portionSize),
            }
            return (
            <div className="bg-indigo-600 rounded-[2rem] p-6 text-white shadow-xl">
              <div className="flex justify-between items-start mb-2">
                <span className="text-[10px] font-black bg-white/20 px-2 py-1 rounded-full uppercase tracking-widest">Resultado AI</span>
                <span className="text-xs">{({ high: '🟢', medium: '🟡', low: '🔴' })[aiEstimate.confidence] || '🟡'} {aiEstimate.confidence}</span>
              </div>
              <p className="text-sm font-medium text-indigo-100 mb-2">{aiEstimate.description}</p>
              {aiEstimate.query_adjustment && (
                <div className="flex items-start gap-2 bg-white/10 rounded-xl px-3 py-2 mb-3">
                  <span className="text-sm mt-0.5">ℹ️</span>
                  <p className="text-[10px] text-indigo-200 leading-relaxed">{aiEstimate.query_adjustment}</p>
                </div>
              )}

              {/* Portion size selector */}
              <div className="mb-4">
                <p className="text-[10px] font-bold opacity-70 uppercase mb-2">¿Qué tan grande era la porción?</p>
                <div className="flex gap-2">
                  {portionSizes.map(p => (
                    <button
                      key={p.label}
                      onClick={() => setPortionSize(p.val)}
                      className={`flex-1 py-2 rounded-xl text-[10px] font-black transition-all ${
                        portionSize === p.val ? 'bg-white text-indigo-600' : 'bg-white/10 text-white'
                      }`}
                    >
                      {p.emoji} {p.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-4 gap-2 text-center mb-4 border-t border-white/10 pt-4">
                <div><p className="text-2xl font-black">{adjusted.calories}</p><p className="text-[10px] opacity-70">kcal</p></div>
                <div><p className="text-2xl font-black">{adjusted.protein}g</p><p className="text-[10px] opacity-70">Prot</p></div>
                <div><p className="text-2xl font-black">{adjusted.carbs}g</p><p className="text-[10px] opacity-70">Carbs</p></div>
                <div><p className="text-2xl font-black">{adjusted.fat}g</p><p className="text-[10px] opacity-70">Fat</p></div>
              </div>

              {/* Portion control warning */}
              {adjusted.calories > 900 && (
                <div className="bg-red-500/20 rounded-xl px-3 py-2 mb-3 flex items-start gap-2">
                  <span className="text-sm">⚠️</span>
                  <p className="text-[10px] text-red-100">Mati, esta porción es enorme ({adjusted.calories} kcal). ¿Seguro que querés loggear esto? Oss!</p>
                </div>
              )}

              {/* Impact summary inline */}
              {targets.calories > 0 && (() => {
                const newTotal = macros.calories + adjusted.calories
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
                      <span className="font-bold">{Math.round(item.calories * portionSize)} kcal</span>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex gap-2">
                <button onClick={() => handleConfirmWithPortion(adjusted)}
                  className="flex-1 bg-white text-indigo-600 py-3 rounded-xl font-bold text-sm active:scale-95 transition">
                  Confirmar {portionSize !== 1 ? Math.round(portionSize * 100) + '%' : ''}
                </button>
                <button onClick={handleEdit}
                  className="p-3 bg-indigo-500 rounded-xl active:scale-95 transition text-sm">✏️</button>
                <button onClick={handleRetry}
                  className="p-3 bg-indigo-500 rounded-xl active:scale-95 transition text-sm">🔄</button>
                <button onClick={clearAIEstimate}
                  className="p-3 bg-indigo-500 rounded-xl active:scale-95 transition text-sm">🗑</button>
              </div>
            </div>
            )
          })()}
        </div>
      ) : (
        <div className="bg-white/5 backdrop-blur-sm p-5 rounded-[2rem] border border-white/10 space-y-3">
          <input type="text" value={desc} onChange={e => setDesc(e.target.value)}
            placeholder="Qué comiste..."
            className="w-full bg-gray-900 border-gray-800 rounded-2xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-100 transition-all" />
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase">Calorías</label>
              <input type="number" value={kcal} onChange={e => setKcal(e.target.value)}
                placeholder="500"
                className="w-full bg-gray-900 border-gray-800 rounded-xl px-3 py-2 text-sm mt-1 focus:ring-2 focus:ring-indigo-100" />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase">Proteína (g)</label>
              <input type="number" value={prot} onChange={e => setProt(e.target.value)}
                placeholder="30"
                className="w-full bg-gray-900 border-gray-800 rounded-xl px-3 py-2 text-sm mt-1 focus:ring-2 focus:ring-indigo-100" />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase">Carbos (g)</label>
              <input type="number" value={carbs} onChange={e => setCarbs(e.target.value)}
                placeholder="50"
                className="w-full bg-gray-900 border-gray-800 rounded-xl px-3 py-2 text-sm mt-1 focus:ring-2 focus:ring-indigo-100" />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase">Grasa (g)</label>
              <input type="number" value={fat} onChange={e => setFat(e.target.value)}
                placeholder="15"
                className="w-full bg-gray-900 border-gray-800 rounded-xl px-3 py-2 text-sm mt-1 focus:ring-2 focus:ring-indigo-100" />
            </div>
          </div>
          <button onClick={handleManualSubmit} disabled={!desc.trim() || !kcal}
            className="w-full bg-green-500 text-black py-3.5 rounded-2xl font-bold active:scale-95 transition-all disabled:opacity-50">
            Guardar comida
          </button>
        </div>
      )}

      {/* Today's food list */}
      <div className="bg-white/5 backdrop-blur-sm rounded-[2rem] p-5 border border-white/10">
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
  const location = useLocation()
  const navigate = useNavigate()

  useEffect(() => { fetchToday(); fetchEnergy(); fetchFood() }, [])

  // Handle prefill from Daily Plan
  useEffect(() => {
    const prefill = location.state?.prefill
    if (prefill) {
      setActiveTab('food')
      // Clear navigation state so it doesn't persist
      navigate(location.pathname, { replace: true, state: {} })
    }
  }, [location.state?.prefill])

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
      hapticMedium()
      showToast('\u2713 +' + POINTS[type] + ' pts')
      track('habit_completed', { habit_type: type, completion_type: 'full' })
    } else if (prev === 0 && val > 0 && val < runtimeTarget) {
      await awardPoints(type, POINTS[type], 0.5)
      hapticLight()
      track('habit_completed', { habit_type: type, completion_type: 'partial' })
    }
  }

  const handleBJJ = async (meta) => {
    const habit = HABITS.find(h => h.type === 'bjj')
    await upsertHabit('bjj', 1, habit.target, meta)
    await awardPoints('bjj', POINTS.bjj)
    await checkPerfectDay()
    showIdentity('bjj')
    hapticMedium()
    showToast('🥋 +' + POINTS.bjj + ' pts')
    track('habit_completed', { habit_type: 'bjj', completion_type: 'full' })
    setShowBJJ(false)
  }

  const handleFood = async (log) => {
    await addLog(log)
    fetchFood()
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] pb-32 pt-6 max-w-lg mx-auto px-4 space-y-6">
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
      <div className="flex bg-white/5 p-1 rounded-2xl">
        <button
          onClick={() => setActiveTab('tracking')}
          className={`flex-1 py-3 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'tracking' ? 'bg-white/10 shadow-sm text-blue-400' : 'text-slate-500'
          }`}
        >
          💪 Actividad
        </button>
        <button
          onClick={() => setActiveTab('food')}
          className={`flex-1 py-3 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'food' ? 'bg-white/10 shadow-sm text-blue-400' : 'text-slate-500'
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
                      waterBreakdown={h.type === 'water' ? useHabitStore.getState().getWaterBreakdown() : null}
                      onAddMate={h.type === 'water' ? () => { useHabitStore.getState().addMate(1, targets.water || 2.5); hapticMedium() } : null}
                    />
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="space-y-4">
          <FoodSection onManualSubmit={handleFood} store={foodStore} targets={targets} prefill={location.state?.prefill} />
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
