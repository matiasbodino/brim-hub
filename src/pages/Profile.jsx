import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { TARGETS, MATI_ID } from '../lib/constants'
import { usePointsStore } from '../stores/pointsStore'

export default function Profile() {
  const { getLevel, totalPoints } = usePointsStore()
  const { current: level, next: nextLevel } = getLevel()
  const [weight, setWeight] = useState('')
  const [weightSaved, setWeightSaved] = useState(false)

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

      {/* Targets */}
      <div className="bg-white rounded-2xl p-5 border border-gray-100 space-y-3">
        <h2 className="text-sm font-semibold text-gray-700">Objetivos diarios</h2>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="bg-gray-50 rounded-xl p-3">
            <div className="text-gray-500">Calorías</div>
            <div className="font-bold text-gray-900">{TARGETS.calories} kcal</div>
          </div>
          <div className="bg-gray-50 rounded-xl p-3">
            <div className="text-gray-500">Proteína</div>
            <div className="font-bold text-gray-900">{TARGETS.protein}g</div>
          </div>
          <div className="bg-gray-50 rounded-xl p-3">
            <div className="text-gray-500">Carbs</div>
            <div className="font-bold text-gray-900">{TARGETS.carbs}g</div>
          </div>
          <div className="bg-gray-50 rounded-xl p-3">
            <div className="text-gray-500">Grasa</div>
            <div className="font-bold text-gray-900">{TARGETS.fat}g</div>
          </div>
          <div className="bg-gray-50 rounded-xl p-3">
            <div className="text-gray-500">Agua</div>
            <div className="font-bold text-gray-900">{TARGETS.water}L</div>
          </div>
          <div className="bg-gray-50 rounded-xl p-3">
            <div className="text-gray-500">Pasos</div>
            <div className="font-bold text-gray-900">{TARGETS.steps.toLocaleString()}</div>
          </div>
        </div>
      </div>
    </div>
  )
}
