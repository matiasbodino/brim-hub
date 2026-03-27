import { useEffect, useState } from 'react'
import { useHabitStore } from '../stores/habitStore'
import { usePointsStore } from '../stores/pointsStore'
import { useFoodStore } from '../stores/foodStore'
import { HABITS, HABIT_GROUPS, POINTS, MATI_ID } from '../lib/constants'
import { useEnergyStore } from '../stores/energyStore'

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

function FoodForm({ onSubmit }) {
  const [tipo, setTipo] = useState('almuerzo')
  const [desc, setDesc] = useState('')
  const [kcal, setKcal] = useState('')
  const [prot, setProt] = useState('')

  const handleSubmit = () => {
    if (!desc.trim() || !kcal) return
    onSubmit({
      meal_type: tipo,
      description: desc.trim(),
      calories: Number(kcal),
      protein: Number(prot) || 0,
      carbs: 0,
      fat: 0,
      confirmed: true,
      user_id: MATI_ID,
    })
    setDesc('')
    setKcal('')
    setProt('')
  }

  return (
    <div className="bg-white rounded-2xl p-4 border border-gray-100 space-y-3">
      <h3 className="font-semibold text-gray-800">🍽 Registrar comida</h3>
      <div className="flex gap-1 flex-wrap">
        {['desayuno', 'almuerzo', 'merienda', 'cena', 'snack'].map(t => (
          <button key={t} onClick={() => setTipo(t)}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
              tipo === t ? 'bg-violet-600 text-white' : 'bg-gray-100 text-gray-600'
            }`}>{t}</button>
        ))}
      </div>
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
      <button onClick={handleSubmit} disabled={!desc.trim() || !kcal}
        className="w-full py-2.5 text-sm font-semibold rounded-xl bg-violet-600 text-white disabled:opacity-40">
        Guardar comida
      </button>
    </div>
  )
}

export default function Habits() {
  const { todayHabits, fetchToday, upsertHabit } = useHabitStore()
  const { awardPoints, checkPerfectDay } = usePointsStore()
  const { addLog, fetchToday: fetchFood } = useFoodStore()
  const { todayEnergy, fetchToday: fetchEnergy, saveEnergy } = useEnergyStore()
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

    await upsertHabit(type, val, habit.target)
    // Award points based on completion type
    const prev = Number(todayHabits[type]?.value || 0)
    if (prev < habit.target && val >= habit.target) {
      await awardPoints(type, POINTS[type], 1)
      await checkPerfectDay()
      showIdentity(type)
    } else if (prev === 0 && val > 0 && val < habit.target) {
      await awardPoints(type, POINTS[type], 0.5)
    }
  }

  const handleBJJ = async (meta) => {
    const habit = HABITS.find(h => h.type === 'bjj')
    await upsertHabit('bjj', 1, habit.target, meta)
    await awardPoints('bjj', POINTS.bjj)
    await checkPerfectDay()
    showIdentity('bjj')
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

      <FoodForm onSubmit={handleFood} />

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
