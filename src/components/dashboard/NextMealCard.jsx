import { useFoodStore } from '../../stores/foodStore'
import { useTargetsStore } from '../../stores/targetsStore'
import { hapticMedium } from '../../lib/haptics'
import { useToast } from '../Toast'
import { Link } from 'react-router-dom'
import { MATI_ID } from '../../lib/constants'

export default function NextMealCard() {
  const { nextMealSuggestion, suggestionLoading, addLog, fetchNextMealSuggestion, getTodayMacros } = useFoodStore()
  const { targets } = useTargetsStore()
  const showToast = useToast()

  const macros = getTodayMacros()
  const calTarget = targets.calories || 2100
  const remaining = calTarget - macros.calories
  const protRemaining = Math.max(0, (targets.protein || 150) - Math.round(macros.protein))

  // Over target
  if (remaining < 0) {
    return (
      <div className="border border-amber-500/20 rounded-2xl p-4 bg-gradient-to-br from-amber-500/5 to-red-500/5">
        <p className="text-[9px] font-black text-amber-400 uppercase tracking-widest mb-2">⚠️ Te pasaste</p>
        <p className="text-xs text-gray-400 mb-3">Vas {macros.calories} de {calTarget} kcal (+{Math.abs(remaining)})</p>
        <p className="text-xs text-gray-500 mb-3">No pasa nada. Opciones:</p>
        <div className="space-y-2">
          <Link to="/walk" className="block bg-white/5 border border-white/10 rounded-xl p-2.5 active:bg-white/10 transition">
            <p className="text-xs text-gray-300">🚶 Caminata 20min (~140 kcal)</p>
          </Link>
          <Link to="/activity" className="block bg-white/5 border border-white/10 rounded-xl p-2.5 active:bg-white/10 transition">
            <p className="text-xs text-gray-300">🔄 Activar compensación →</p>
          </Link>
          <p className="text-[10px] text-gray-600 text-center mt-1">😌 O dejalo así, mañana seguís</p>
        </div>
      </div>
    )
  }

  // Not enough remaining for suggestion
  if (remaining < 200) {
    return (
      <div className="border border-emerald-500/20 rounded-2xl p-4 bg-gradient-to-br from-emerald-500/5 to-blue-500/5 text-center">
        <p className="text-xs text-emerald-400 font-bold">Casi completás el día 💪</p>
        <p className="text-[10px] text-gray-500 mt-1">Te quedan {remaining} kcal · {protRemaining}g prot</p>
      </div>
    )
  }

  // Loading
  if (suggestionLoading) {
    return (
      <div className="border border-blue-500/20 rounded-2xl p-4 bg-gradient-to-br from-blue-500/10 to-violet-500/10">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-blue-500 rounded animate-pulse" />
          <p className="text-xs text-gray-400">Brim está pensando tu próxima comida...</p>
        </div>
      </div>
    )
  }

  // No suggestion yet
  if (!nextMealSuggestion) return null

  const s = nextMealSuggestion

  const handleLog = async (name, cal, prot, carbs, fat) => {
    hapticMedium()
    await addLog({
      meal_type: s.meal_type || 'snack',
      description: name,
      calories: cal,
      protein: prot,
      carbs: carbs || 0,
      fat: fat || 0,
      confirmed: true,
      user_id: MATI_ID,
    })
    showToast('🍽 Registrado')
  }

  return (
    <div className="border border-blue-500/20 rounded-2xl p-4 bg-gradient-to-br from-blue-500/10 to-violet-500/10">
      <p className="text-[9px] font-black text-blue-400 uppercase tracking-widest mb-2">🧠 Para tu próxima comida</p>
      <p className="text-xs text-gray-400 mb-3">Te quedan {remaining} kcal y {protRemaining}g prot</p>

      {/* Brim says */}
      {s.brim_says && <p className="text-[10px] text-gray-500 italic mb-3">"{s.brim_says}"</p>}

      {/* Main suggestion */}
      <div className="bg-white/5 rounded-xl p-3 mb-2">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-bold text-gray-200">{s.meal_name}</p>
            <p className="text-[10px] text-gray-500">{s.macros?.kcal} kcal · {s.macros?.protein}g prot</p>
          </div>
          <button onClick={() => handleLog(s.meal_name, s.macros?.kcal, s.macros?.protein, s.macros?.carbs, s.macros?.fat)}
            className="bg-blue-500/20 text-blue-300 text-xs font-bold rounded-xl px-3 py-1.5 active:scale-95 transition">
            Loguear
          </button>
        </div>
      </div>

      {/* Refresh */}
      <button onClick={fetchNextMealSuggestion}
        className="w-full text-[10px] text-gray-600 font-bold py-1 active:text-gray-400 transition">
        🔄 Otra idea
      </button>
    </div>
  )
}
