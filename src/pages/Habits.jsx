import { useEffect, useState } from 'react'
import { useHabitStore } from '../stores/habitStore'
import { usePointsStore } from '../stores/pointsStore'
import { useFoodStore } from '../stores/foodStore'
import { HABITS, HABIT_GROUPS, POINTS, MATI_ID } from '../lib/constants'
import { useEnergyStore } from '../stores/energyStore'
import { useTargetsStore } from '../stores/targetsStore'
import { track } from '../lib/analytics'

const ENERGY_LABELS = {
  1: { emoji: '😴', label: 'Sin energía' },
  2: { emoji: '😕', label: 'Flojo' },
  3: { emoji: '😐', label: 'Normal' },
  4: { emoji: '😊', label: 'Bien' },
  5: { emoji: '🔥', label: 'En llamas' },
}

function EnergyPicker({ current, onSelect }) {
  return (
    <div className="bg-zinc-900 rounded-2xl p-4 mb-4">
      <p className="text-xs text-zinc-500 uppercase tracking-widest mb-3">
        Energía de hoy
      </p>
      <div className="flex justify-between">
        {[1, 2, 3, 4, 5].map(level => (
          <button
            key={level}
            onClick={() => onSelect(level)}
            className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-colors ${
              current === level
                ? 'bg-violet-600 text-white'
                : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
            }`}
          >
            <span className="text-xl">{ENERGY_LABELS[level].emoji}</span>
            <span className="text-xs">{level}</span>
          </button>
        ))}
      </div>
      {current && (
        <p className="text-center text-zinc-400 text-sm mt-3">
          {ENERGY_LABELS[current].label}
        </p>
      )}
    </div>
  )
}

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
        {done && <span className="text-violet-600 font-bold text-sm">✓ +{POINTS[type]}pts</span>}
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
            {value > 0 && <button onClick={() => onUpdate(Math.max(0, value - 0.25))} className="py-2 px-3 text-sm font-semibold rounded-xl border border-red-200 text-red-400 active:bg-red-50">−</button>}
            <button onClick={() => onUpdate(value + 0.25)} className="flex-1 py-2 text-sm font-semibold rounded-xl border border-gray-200 active:bg-gray-50">+250ml</button>
            <button onClick={() => onUpdate(value + 0.5)} className="flex-1 py-2 text-sm font-semibold rounded-xl border border-gray-200 active:bg-gray-50">+500ml</button>
          </>
        )}
        {type === 'steps' && (
          <>
            {value > 0 && <button onClick={() => onUpdate(Math.max(0, value - 1000))} className="py-2 px-3 text-sm font-semibold rounded-xl border border-red-200 text-red-400 active:bg-red-50">−</button>}
            <button onClick={() => onUpdate(value + 1000)} className="flex-1 py-2 text-sm font-semibold rounded-xl border border-gray-200 active:bg-gray-50">+1000</button>
            <button onClick={() => onUpdate(value + 5000)} className="flex-1 py-2 text-sm font-semibold rounded-xl border border-gray-200 active:bg-gray-50">+5000</button>
          </>
        )}
        {type === 'bjj' && (
          <button
            onClick={() => onUpdate(value >= 1 ? 0 : 1)}
            className={`flex-1 py-2 text-sm font-semibold rounded-xl transition ${
              value >= 1 ? 'bg-violet-600 text-white' : 'border border-gray-200 text-gray-600'
            }`}
          >
            {value >= 1 ? 'Hecho ✓' : 'Marcar BJJ'}
          </button>
        )}
        {type === 'gym' && (
          <button
            onClick={() => onUpdate(value >= 1 ? 0 : 1)}
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

function BJJForm({ onSubmit, onCancel }) {
  const [tipo, setTipo] = useState('Gi')
  const [duracion, setDuracion] = useState(60)
  const [tecnicas, setTecnicas] = useState('')
  const [notas, setNotas] = useState('')

  return (
    <div className="bg-white rounded-2xl p-4 border border-violet-200 space-y-3">
      <h3 className="font-semibold text-gray-800">🥋 Sesión de BJJ</h3>
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

function FoodSection({ onManualSubmit, store }) {
  const [mode, setMode] = useState('ai') // 'ai' | 'manual'
  const [aiText, setAiText] = useState('')
  const [tipo, setTipo] = useState('almuerzo')
  const [desc, setDesc] = useState('')
  const [kcal, setKcal] = useState('')
  const [prot, setProt] = useState('')
  const [editing, setEditing] = useState(false) // editing AI estimate

  const { aiEstimate, aiLoading, aiError, parseWithAI, confirmAIEstimate, clearAIEstimate } = store

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
    setTipo(aiEstimate.meal_type || 'almuerzo')
    setEditing(true)
    setMode('manual')
  }

  const handleRetry = () => {
    clearAIEstimate()
    parseWithAI(aiText.trim(), tipo)
  }

  const handleManualSubmit = () => {
    if (!desc.trim() || !kcal) return
    if (editing && aiEstimate) {
      store.confirmWithOverride(aiEstimate, {
        calories: Number(kcal),
        protein: Number(prot) || 0,
        carbs: 0,
        fat: 0,
      })
    } else {
      onManualSubmit({
        meal_type: tipo,
        description: desc.trim(),
        calories: Number(kcal),
        protein: Number(prot) || 0,
        carbs: 0,
        fat: 0,
        confirmed: true,
        user_id: MATI_ID,
      })
    }
    setDesc('')
    setKcal('')
    setProt('')
    setEditing(false)
  }

  return (
    <div className="bg-white rounded-2xl p-4 border border-gray-100 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-gray-800">🍽 Registrar comida</h3>
        <div className="flex gap-1">
          <button onClick={() => { setMode('ai'); setEditing(false) }}
            className={`px-3 py-1 text-xs font-semibold rounded-lg ${mode === 'ai' ? 'bg-violet-600 text-white' : 'bg-gray-100 text-gray-500'}`}>
            🤖 AI
          </button>
          <button onClick={() => setMode('manual')}
            className={`px-3 py-1 text-xs font-semibold rounded-lg ${mode === 'manual' ? 'bg-violet-600 text-white' : 'bg-gray-100 text-gray-500'}`}>
            ✏️ Manual
          </button>
        </div>
      </div>

      {/* Meal type pills */}
      <div className="flex gap-1 flex-wrap">
        {['desayuno', 'almuerzo', 'merienda', 'cena', 'snack'].map(t => (
          <button key={t} onClick={() => setTipo(t)}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
              tipo === t ? 'bg-violet-600 text-white' : 'bg-gray-100 text-gray-600'
            }`}>{t}</button>
        ))}
      </div>

      {mode === 'ai' ? (
        <>
          {/* AI input */}
          <div className="flex gap-2">
            <input type="text" value={aiText} onChange={e => setAiText(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAISend()}
              placeholder="¿Qué comiste? Ej: milanesa con ensalada"
              className="flex-1 px-3 py-3 rounded-xl border border-gray-200 text-base" />
            <button onClick={handleAISend} disabled={!aiText.trim() || aiLoading}
              className="px-4 py-3 bg-violet-600 text-white rounded-xl font-semibold text-sm disabled:opacity-40 active:scale-95 transition">
              {aiLoading ? '...' : '→'}
            </button>
          </div>

          {/* Loading */}
          {aiLoading && (
            <div className="text-center py-4">
              <div className="w-6 h-6 bg-violet-600 rounded-lg animate-pulse mx-auto mb-2" />
              <p className="text-xs text-gray-400">Estimando macros...</p>
            </div>
          )}

          {/* Error */}
          {aiError && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-600">
              {aiError}
            </div>
          )}

          {/* Estimate card */}
          {aiEstimate && !aiLoading && (
            <FoodEstimateCardInline
              estimate={aiEstimate}
              onConfirm={handleConfirm}
              onEdit={handleEdit}
              onRetry={handleRetry}
              onCancel={clearAIEstimate}
            />
          )}
        </>
      ) : (
        <>
          {/* Manual form */}
          <input type="text" value={desc} onChange={e => setDesc(e.target.value)}
            placeholder="Qué comiste..."
            className="w-full px-3 py-2 rounded-xl border border-gray-200 text-base" />
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-gray-500">Calorías (est.)</label>
              <input type="number" value={kcal} onChange={e => setKcal(e.target.value)}
                placeholder="500"
                className="w-full px-3 py-2 rounded-xl border border-gray-200 text-base mt-1" />
            </div>
            <div>
              <label className="text-xs text-gray-500">Proteína (g)</label>
              <input type="number" value={prot} onChange={e => setProt(e.target.value)}
                placeholder="30"
                className="w-full px-3 py-2 rounded-xl border border-gray-200 text-base mt-1" />
            </div>
          </div>
          <button onClick={handleManualSubmit} disabled={!desc.trim() || !kcal}
            className="w-full py-2.5 text-sm font-semibold rounded-xl bg-violet-600 text-white disabled:opacity-40">
            Guardar comida
          </button>
        </>
      )}
    </div>
  )
}

function FoodEstimateCardInline({ estimate, onConfirm, onEdit, onRetry, onCancel }) {
  const [showBreakdown, setShowBreakdown] = useState(false)
  const conf = { high: '🟢', medium: '🟡', low: '🔴' }

  return (
    <div className="border border-violet-200 rounded-xl overflow-hidden">
      <div className="bg-violet-50 px-3 py-2 flex items-center justify-between">
        <span className="text-xs font-semibold text-violet-700">🤖 Estimación</span>
        <span className="text-xs">{conf[estimate.confidence] || '🟡'} {estimate.confidence}</span>
      </div>
      <div className="px-3 py-2">
        <p className="text-sm font-semibold text-gray-800">{estimate.description}</p>
      </div>
      <div className="grid grid-cols-4 gap-1 px-3 py-2">
        <div className="text-center">
          <div className="text-base font-bold text-violet-600">{estimate.calories}</div>
          <div className="text-xs text-gray-400">kcal</div>
        </div>
        <div className="text-center">
          <div className="text-base font-bold text-blue-600">{estimate.protein}g</div>
          <div className="text-xs text-gray-400">prot</div>
        </div>
        <div className="text-center">
          <div className="text-base font-bold text-amber-600">{estimate.carbs}g</div>
          <div className="text-xs text-gray-400">carbs</div>
        </div>
        <div className="text-center">
          <div className="text-base font-bold text-red-500">{estimate.fat}g</div>
          <div className="text-xs text-gray-400">grasa</div>
        </div>
      </div>
      {estimate.breakdown && estimate.breakdown.length > 0 && (
        <div className="px-3 pb-2">
          <button onClick={() => setShowBreakdown(!showBreakdown)}
            className="text-xs text-violet-500 font-semibold">
            {showBreakdown ? '▲ Ocultar' : '▼ Detalle'}
          </button>
          {showBreakdown && (
            <div className="mt-1 space-y-1">
              {estimate.breakdown.map((item, i) => (
                <div key={i} className="flex justify-between text-xs bg-gray-50 rounded-lg px-2 py-1.5">
                  <span className="text-gray-600">{item.item}</span>
                  <span className="font-semibold">{item.calories} kcal</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      <div className="flex gap-2 px-3 py-2 border-t border-gray-100">
        <button onClick={onConfirm}
          className="flex-1 py-2 text-sm font-semibold rounded-xl bg-violet-600 text-white active:scale-95">✅ Confirmar</button>
        <button onClick={onEdit}
          className="py-2 px-3 text-sm rounded-xl border border-gray-200 active:scale-95">✏️</button>
        <button onClick={onRetry}
          className="py-2 px-3 text-sm rounded-xl border border-gray-200 active:scale-95">🔄</button>
        <button onClick={onCancel}
          className="py-2 px-3 text-sm rounded-xl border border-gray-200 text-gray-400 active:scale-95">✕</button>
      </div>
    </div>
  )
}

export default function Habits() {
  const { todayHabits, fetchToday, upsertHabit } = useHabitStore()
  const { awardPoints, checkPerfectDay } = usePointsStore()
  const foodStore = useFoodStore()
  const { addLog, fetchToday: fetchFood } = foodStore
  const { todayEnergy, fetchToday: fetchEnergy, saveEnergy } = useEnergyStore()
  const { targets } = useTargetsStore()
  const [showBJJ, setShowBJJ] = useState(false)
  const [identityMsg, setIdentityMsg] = useState(null)

  useEffect(() => { fetchToday(); fetchEnergy() }, [])

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
    // Award points based on completion type
    const prev = Number(todayHabits[type]?.value || 0)
    if (prev < runtimeTarget && val >= runtimeTarget) {
      await awardPoints(type, POINTS[type], 1)
      await checkPerfectDay()
      showIdentity(type)
      track('habit_completed', { habit_type: type, completion_type: 'full' })
    } else if (prev === 0 && val > 0 && val < runtimeTarget) {
      await awardPoints(type, POINTS[type], 0.5)
      track('habit_completed', { habit_type: type, completion_type: 'partial' })
    }
  }

  const handleBJJ = async (meta) => {
    const habit = HABITS.find(h => h.type === 'bjj')
    await upsertHabit('bjj', 1, habit.target, meta)
    await awardPoints('bjj', POINTS.bjj)
    await checkPerfectDay()
    showIdentity('bjj')
    track('habit_completed', { habit_type: 'bjj', completion_type: 'full' })
    setShowBJJ(false)
  }

  const handleFood = async (log) => {
    await addLog(log)
    fetchFood()
  }

  return (
    <div className="px-4 py-5 pb-24 space-y-4">
      <h1 className="text-xl font-bold text-gray-900">Hábitos</h1>

      <EnergyPicker current={todayEnergy} onSelect={saveEnergy} />

      {Object.entries(HABIT_GROUPS).map(([key, group]) => {
        if (group.habits.length === 0) return null
        return (
          <div key={key}>
            <p className="text-xs text-zinc-500 uppercase tracking-widest mb-2 mt-4">
              {group.emoji} {group.label}
            </p>
            <div className="space-y-3">
              {group.habits.map(h => {
                if (h.type === 'bjj' && showBJJ) {
                  return <BJJForm key="bjj-form" onSubmit={handleBJJ} onCancel={() => setShowBJJ(false)} />
                }
                return (
                  <HabitTracker
                    key={h.type}
                    type={h.type}
                    label={h.label}
                    emoji={h.emoji}
                    value={Number(todayHabits[h.type]?.value || 0)}
                    target={h.target}
                    unit={h.unit}
                    onUpdate={(val) => handleUpdate(h.type, val)}
                  />
                )
              })}
            </div>
          </div>
        )
      })}

      <FoodSection onManualSubmit={handleFood} store={foodStore} />

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
