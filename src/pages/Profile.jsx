import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { MATI_ID } from '../lib/constants'
import { usePointsStore } from '../stores/pointsStore'
import { useTargetsStore } from '../stores/targetsStore'
import { useToast } from '../components/Toast'

export default function Profile() {
  const { getLevel, totalPoints } = usePointsStore()
  const { current: level, next: nextLevel } = getLevel()
  const { targets, fetchTargets, saveTargets } = useTargetsStore()
  const [weight, setWeight] = useState('')
  const [weightSaved, setWeightSaved] = useState(false)
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [weightGoal, setWeightGoal] = useState('')
  const [weightGoalDate, setWeightGoalDate] = useState('')
  const [weeklyRate, setWeeklyRate] = useState('-0.4')
  const [goalSaved, setGoalSaved] = useState(false)
  const showToast = useToast()

  useEffect(() => {
    fetchTargets()
    // Fetch existing weight goal
    supabase.from('user_profile').select('weight_goal, weight_goal_date, weekly_weight_target').eq('id', MATI_ID).maybeSingle()
      .then(({ data }) => {
        if (data?.weight_goal) setWeightGoal(String(data.weight_goal))
        if (data?.weight_goal_date) setWeightGoalDate(data.weight_goal_date)
        if (data?.weekly_weight_target != null) setWeeklyRate(String(data.weekly_weight_target))
      })
  }, [])

  const handleSaveWeight = async () => {
    if (!weight) return
    const today = new Date().toISOString().slice(0, 10)
    const { error } = await supabase
      .from('weight_logs')
      .upsert({
        user_id: MATI_ID,
        date: today,
        weight: Number(weight),
      }, { onConflict: 'user_id,date' })
    if (error) return
    setWeightSaved(true)
    setTimeout(() => setWeightSaved(false), 2000)
  }

  const handleSaveTargets = async () => {
    setSaving(true)
    const ok = await saveTargets(form)
    setSaving(false)
    if (ok) {
      setSaved(true)
      setEditing(false)
      setTimeout(() => setSaved(false), 2000)
    }
  }

  const FIELDS = [
    { key: 'calories', label: 'Calorías', unit: 'kcal', step: 50 },
    { key: 'protein', label: 'Proteína', unit: 'g', step: 5 },
    { key: 'carbs', label: 'Carbos', unit: 'g', step: 5 },
    { key: 'fat', label: 'Grasa', unit: 'g', step: 5 },
    { key: 'water', label: 'Agua', unit: 'L', step: 0.5 },
    { key: 'steps', label: 'Pasos', unit: '', step: 500 },
    { key: 'bjj_weekly', label: 'BJJ / semana', unit: 'días', step: 1, min: 0, max: 7 },
    { key: 'gym_weekly', label: 'Gym / semana', unit: 'días', step: 1, min: 0, max: 7 },
  ]

  return (
    <div className="px-4 py-5 pb-24 space-y-5">
      <h1 className="text-xl font-bold text-gray-900">Perfil</h1>

      {/* Avatar + Level */}
      <div className="bg-white rounded-2xl p-5 border border-gray-100">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-violet-100 rounded-full flex items-center justify-center">
            <span className="text-3xl">{level.badge}</span>
          </div>
          <div>
            <div className="font-bold text-gray-900 text-lg">Mati Bodino</div>
            <div className="text-sm text-violet-600 font-semibold">{level.name}</div>
            <div className="text-xs text-gray-400">{totalPoints} pts acumulados</div>
          </div>
        </div>
        {nextLevel && (
          <div className="mt-3">
            <div className="flex justify-between text-xs text-gray-400 mb-1">
              <span>Próximo: {nextLevel.badge} {nextLevel.name}</span>
              <span>{nextLevel.min - totalPoints} pts restantes</span>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full rounded-full bg-violet-400" style={{
                width: Math.min(100, Math.round(((totalPoints - level.min) / (nextLevel.min - level.min)) * 100)) + '%'
              }} />
            </div>
          </div>
        )}
      </div>

      {/* Weight input */}
      <div className="bg-white rounded-2xl p-5 border border-gray-100">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">Registrar peso</h2>
        <div className="flex gap-2">
          <input
            type="number"
            step="0.1"
            value={weight}
            onChange={e => setWeight(e.target.value)}
            placeholder="85.0"
            className="flex-1 px-3 py-2.5 rounded-xl border border-gray-200 text-base"
          />
          <span className="flex items-center text-sm text-gray-400">kg</span>
          <button
            onClick={handleSaveWeight}
            disabled={!weight}
            className="px-4 py-2.5 bg-violet-600 text-white font-semibold text-sm rounded-xl disabled:opacity-40"
          >
            {weightSaved ? '✓' : 'Guardar'}
          </button>
        </div>
      </div>

      {/* Weight Goal */}
      <div className="bg-white rounded-2xl p-5 border border-gray-100 space-y-3">
        <h2 className="text-sm font-semibold text-gray-700">Objetivo de peso</h2>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-xs text-gray-500">Peso objetivo (kg)</label>
            <input type="number" step="0.5" value={weightGoal} onChange={e => setWeightGoal(e.target.value)}
              placeholder="80.0" className="w-full px-3 py-2 rounded-xl border border-gray-200 text-base mt-1" />
          </div>
          <div>
            <label className="text-xs text-gray-500">Fecha límite</label>
            <input type="date" value={weightGoalDate} onChange={e => setWeightGoalDate(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-gray-200 text-base mt-1" />
          </div>
        </div>
        <div>
          <label className="text-xs text-gray-500">Ritmo semanal</label>
          <div className="flex gap-2 mt-1">
            {['-0.25', '-0.5', '-0.75', '-1.0'].map(r => (
              <button key={r} onClick={() => setWeeklyRate(r)}
                className={`flex-1 py-2 text-xs font-bold rounded-xl transition ${
                  weeklyRate === r ? 'bg-violet-600 text-white' : 'bg-gray-100 text-gray-600'
                }`}>
                {r} kg
              </button>
            ))}
          </div>
        </div>
        <button
          onClick={async () => {
            const { error } = await supabase.from('user_profile').upsert({
              id: MATI_ID,
              weight_goal: weightGoal ? Number(weightGoal) : null,
              weight_goal_date: weightGoalDate || null,
              weekly_weight_target: Number(weeklyRate),
            }, { onConflict: 'id' })
            if (!error) {
              setGoalSaved(true)
              showToast('Objetivo guardado ✓')
              setTimeout(() => setGoalSaved(false), 2000)
            }
          }}
          disabled={!weightGoal}
          className="w-full py-2.5 bg-violet-600 text-white font-semibold text-sm rounded-xl disabled:opacity-40 active:scale-95 transition"
        >
          {goalSaved ? '✓ Guardado' : 'Guardar objetivo'}
        </button>
      </div>

      {/* Targets */}
      <div className="bg-white rounded-2xl p-5 border border-gray-100 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-700">Objetivos</h2>
          {saved && <span className="text-xs text-emerald-600 font-semibold">✓ Guardado</span>}
        </div>

        {editing && form ? (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              {FIELDS.map(f => (
                <div key={f.key}>
                  <label className="text-xs text-gray-500 block mb-1">{f.label} {f.unit && <span className="text-gray-300">({f.unit})</span>}</label>
                  <input
                    type="number"
                    step={f.step}
                    min={f.min ?? 0}
                    max={f.max}
                    value={form[f.key] ?? ''}
                    onChange={e => setForm({ ...form, [f.key]: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 text-base"
                  />
                </div>
              ))}
            </div>
            <div className="flex gap-2 pt-1">
              <button
                onClick={() => setEditing(false)}
                className="flex-1 py-2.5 text-sm font-semibold rounded-xl border border-gray-200 text-gray-500"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveTargets}
                disabled={saving}
                className="flex-2 py-2.5 px-6 text-sm font-semibold rounded-xl bg-violet-600 text-white disabled:opacity-40"
              >
                {saving ? 'Guardando...' : 'Guardar targets'}
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3 text-sm">
              {FIELDS.map(f => (
                <div key={f.key} className="bg-gray-50 rounded-xl p-3">
                  <div className="text-gray-500">{f.label}</div>
                  <div className="font-bold text-gray-900">
                    {f.key === 'steps' ? (targets[f.key] ?? 0).toLocaleString() : targets[f.key] ?? 0}{f.unit ? ' ' + f.unit : ''}
                  </div>
                </div>
              ))}
            </div>
            <button
              onClick={() => { setForm({ ...targets }); setEditing(true) }}
              className="w-full py-2.5 text-sm font-semibold rounded-xl border border-violet-200 text-violet-600 active:bg-violet-50 transition"
            >
              Editar targets
            </button>
          </>
        )}
      </div>
    </div>
  )
}
