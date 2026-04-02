import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useHabitStore } from '../stores/habitStore'
import { usePointsStore } from '../stores/pointsStore'
import { useFoodStore } from '../stores/foodStore'
import { useEnergyStore } from '../stores/energyStore'
import { useTargetsStore } from '../stores/targetsStore'
import { useRoutineStore } from '../stores/routineStore'
// useRoutineStore also used inline for clearRoutine
import { MATI_ID, WATER_UNITS } from '../lib/constants'
import { hapticMedium } from '../lib/haptics'
import { useToast } from '../components/Toast'
import { supabase } from '../lib/supabase'
import MicroJournal from '../components/journal/MicroJournal'
import NextMealCard from '../components/dashboard/NextMealCard'

const MEAL_SLOTS = [
  { type: 'desayuno', label: 'Desayuno', emoji: '🌅', budgetPct: 0.27 },
  { type: 'almuerzo', label: 'Almuerzo', emoji: '🌞', budgetPct: 0.33 },
  { type: 'merienda', label: 'Merienda', emoji: '🌅', budgetPct: 0.12 },
  { type: 'cena', label: 'Cena', emoji: '🌙', budgetPct: 0.23 },
]

const ENERGY_LEVELS = [
  { val: 1, emoji: '😫' }, { val: 2, emoji: '😕' }, { val: 3, emoji: '😐' },
  { val: 4, emoji: '😊' }, { val: 5, emoji: '🔥' },
]

export default function Activity() {
  const navigate = useNavigate()
  const showToast = useToast()
  const { todayHabits, fetchToday, addWater, addMate, upsertHabit } = useHabitStore()
  const foodStore = useFoodStore()
  const { todayLogs, addLog, fetchToday: fetchFood, parseWithAI, aiEstimate, aiLoading, aiError, confirmAIEstimate, clearAIEstimate } = foodStore
  const { todayEnergy, fetchToday: fetchEnergy, saveEnergy } = useEnergyStore()
  const { targets } = useTargetsStore()
  const { routine } = useRoutineStore()

  const [aiText, setAiText] = useState('')
  const [weightInput, setWeightInput] = useState('')
  const [todayWeight, setTodayWeight] = useState(null)

  useEffect(() => {
    fetchToday(); fetchFood(); fetchEnergy()
    const today = new Date().toISOString().slice(0, 10)
    supabase.from('weight_logs').select('weight').eq('user_id', MATI_ID).eq('date', today).maybeSingle()
      .then(({ data }) => { if (data) setTodayWeight(data.weight) })
  }, [])

  const calTarget = targets.calories || 2100
  const waterVal = Number(todayHabits.water?.value || 0)
  const waterTarget = targets.water || 2.5
  const stepsVal = Number(todayHabits.steps?.value || 0)

  const handleAISend = async () => {
    if (!aiText.trim() || aiLoading) return
    await parseWithAI(aiText.trim(), null)
  }

  const handleConfirmAI = async () => {
    if (!aiEstimate) return
    hapticMedium()
    try {
      // Ensure meal_type is never null
      const estimate = {
        ...aiEstimate,
        rawInput: aiText,
        meal_type: aiEstimate.meal_type || getMealTypeByHour(),
      }
      await confirmAIEstimate(estimate)
      setAiText('')
      showToast('🍽 Registrado')
    } catch (err) {
      showToast('Error al guardar: ' + (err?.message || 'intentá de nuevo'))
    }
  }

  function getMealTypeByHour() {
    const h = new Date().getHours()
    if (h >= 6 && h < 11) return 'desayuno'
    if (h >= 11 && h < 16) return 'almuerzo'
    if (h >= 16 && h < 19) return 'merienda'
    return 'cena'
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] pb-28 pt-6 px-4 max-w-lg mx-auto space-y-5">

      {/* ═══ FOOD LOGGING ═══ */}
      <section>
        <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-3">🍽 Nutrición</p>

        <div className="flex gap-2 mb-4">
          <input type="text" value={aiText} onChange={e => setAiText(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAISend()}
            placeholder="¿Qué comiste?"
            className="flex-1 bg-gray-900 border border-gray-800 rounded-2xl py-3 px-4 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-blue-500" />
          <button onClick={handleAISend} disabled={!aiText.trim() || aiLoading}
            className="bg-blue-600 text-white px-4 rounded-2xl text-xs font-black active:scale-95 transition disabled:opacity-40">
            {aiLoading ? '...' : 'AI'}
          </button>
        </div>

        {aiEstimate && !aiLoading && (
          <div className="bg-indigo-600 rounded-2xl p-4 text-white mb-4">
            <p className="text-sm font-bold mb-2">{aiEstimate.description}</p>
            <div className="grid grid-cols-4 gap-2 text-center text-xs mb-3">
              <div><span className="font-black text-lg">{aiEstimate.calories}</span><br />kcal</div>
              <div><span className="font-black text-lg">{aiEstimate.protein}g</span><br />prot</div>
              <div><span className="font-black text-lg">{aiEstimate.carbs}g</span><br />carb</div>
              <div><span className="font-black text-lg">{aiEstimate.fat}g</span><br />fat</div>
            </div>
            <div className="flex gap-2">
              <button onClick={handleConfirmAI} className="flex-1 bg-white text-indigo-600 py-2.5 rounded-xl font-black text-sm active:scale-95">Confirmar</button>
              <button onClick={clearAIEstimate} className="py-2.5 px-3 bg-indigo-500 rounded-xl active:scale-95">✕</button>
            </div>
          </div>
        )}
        {aiError && <p className="text-xs text-red-400 mb-3">{aiError}</p>}

        {/* Meal Slots */}
        <div className="space-y-2">
          {MEAL_SLOTS.map(slot => {
            const logs = todayLogs.filter(l => l.meal_type === slot.type)
            const cal = logs.reduce((a, l) => a + (l.calories || 0), 0)
            const budget = Math.round(calTarget * slot.budgetPct)
            return (
              <div key={slot.type} className="bg-white/5 border border-white/10 rounded-2xl p-3">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span>{slot.emoji}</span>
                    <span className="text-xs font-bold text-gray-300">{slot.label}</span>
                  </div>
                  <span className="text-[10px] text-gray-600">{cal > 0 ? `${cal}/${budget}` : `~${budget}`} kcal</span>
                </div>
                {logs.map(l => (
                  <div key={l.id} className="flex justify-between py-1 border-t border-white/5">
                    <span className="text-[10px] text-gray-400 truncate flex-1">{l.description}</span>
                    <span className="text-[10px] text-gray-500 ml-2">{l.calories} kcal</span>
                  </div>
                ))}
              </div>
            )
          })}
        </div>

        {/* Next meal suggestion */}
        <div className="mt-3">
          <NextMealCard />
        </div>

        {todayLogs.length > 0 && (
          <button onClick={() => { hapticMedium(); addLog({ ...todayLogs[todayLogs.length - 1], id: undefined, logged_at: undefined }); showToast('🔄 Repetido') }}
            className="w-full bg-white/5 border border-blue-500/20 rounded-2xl p-3 mt-3 text-left active:bg-white/10 transition">
            <p className="text-[9px] font-black text-blue-400 uppercase">🔄 Repetir última</p>
            <p className="text-[10px] text-gray-400">{todayLogs[todayLogs.length - 1].description}</p>
          </button>
        )}
      </section>

      {/* ═══ ACTIVITIES ═══ */}
      <section>
        <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-3">🎯 Actividades</p>

        {/* Smart Gym Card */}
        {routine ? (
          <div className="bg-white/5 border border-orange-500/20 rounded-2xl p-4 mb-2">
            <div className="flex items-center justify-between mb-2">
              <div>
                <p className="text-xs font-bold text-gray-200">🏋️ {routine.routine_name}</p>
                <p className="text-[10px] text-gray-500">{routine.exercises?.length || 0} ejercicios · ~{routine.estimated_time || 60} min</p>
              </div>
              <Link to="/workout" state={{ routine }}
                className="bg-orange-500 text-white px-4 py-2 rounded-xl text-[10px] font-black active:scale-95 transition">
                EMPEZAR
              </Link>
            </div>
            <button onClick={() => { useRoutineStore.getState().clearRoutine(); hapticMedium() }}
              className="text-[10px] text-gray-600 font-bold">↻ Generar otra</button>
          </div>
        ) : (
          <div className="bg-white/5 border border-white/10 rounded-2xl p-4 mb-2">
            <p className="text-xs font-bold text-gray-300 mb-2">🏋️ Workout</p>
            <p className="text-[10px] text-gray-600 mb-3">No tenés rutina para hoy</p>
            <div className="flex gap-2">
              <Link to="/workout"
                className="flex-1 bg-blue-600 text-white py-2.5 rounded-xl text-[10px] font-black text-center active:scale-95 transition">
                🧠 Generar rutina
              </Link>
              <Link to="/workout" state={{ skipGenerate: true }}
                className="flex-1 bg-white/5 border border-white/10 text-gray-400 py-2.5 rounded-xl text-[10px] font-bold text-center active:scale-95 transition">
                📋 Ir sin rutina
              </Link>
            </div>
          </div>
        )}

        {/* Other activities */}
        <div className="grid grid-cols-3 gap-2">
          <Link to="/walk" className="bg-white/5 border border-white/10 rounded-2xl p-3 text-center active:bg-white/10 transition">
            <span className="text-xl block">🚶</span>
            <p className="text-[9px] font-bold text-gray-400 mt-1">Caminata</p>
          </Link>
          <Link to="/bjj-session" className="bg-white/5 border border-white/10 rounded-2xl p-3 text-center active:bg-white/10 transition">
            <span className="text-xl block">🥋</span>
            <p className="text-[9px] font-bold text-gray-400 mt-1">BJJ</p>
          </Link>
          <Link to="/breathe" className="bg-white/5 border border-white/10 rounded-2xl p-3 text-center active:bg-white/10 transition">
            <span className="text-xl block">🧘</span>
            <p className="text-[9px] font-bold text-gray-400 mt-1">Respirar</p>
          </Link>
        </div>
      </section>

      {/* ═══ QUICK REGISTER ═══ */}
      <section>
        <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-3">⚡ Registro rápido</p>

        {/* Water + undo */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-3 mb-2">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-gray-300">💧 Agua</span>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-gray-500">{waterVal.toFixed(1)}L / {waterTarget}L</span>
              {waterVal > 0 && (
                <button onClick={() => { hapticMedium(); upsertHabit('water', Math.max(0, waterVal - 0.25), waterTarget); showToast('↩ Deshecho') }}
                  className="text-[9px] text-red-400 font-bold bg-red-500/10 px-2 py-0.5 rounded-full active:scale-95">↩</button>
              )}
            </div>
          </div>
          <div className="flex gap-2 mb-2">
            <button onClick={() => { hapticMedium(); addWater(WATER_UNITS.VASO, waterTarget); showToast('💧') }}
              className="flex-1 min-h-[40px] bg-white/5 border border-white/10 rounded-xl text-[10px] font-bold text-blue-400 active:scale-95 transition">Vaso</button>
            <button onClick={() => { hapticMedium(); addWater(WATER_UNITS.BOTELLA, waterTarget); showToast('💧') }}
              className="flex-1 min-h-[40px] bg-white/5 border border-white/10 rounded-xl text-[10px] font-bold text-blue-400 active:scale-95 transition">Botella</button>
            <button onClick={() => { hapticMedium(); addMate(1, waterTarget); showToast('🧉') }}
              className="flex-1 min-h-[40px] bg-white/5 border border-white/10 rounded-xl text-[10px] font-bold text-emerald-400 active:scale-95 transition">🧉 Mate</button>
          </div>
          <div className="h-1 bg-gray-800 rounded-full overflow-hidden">
            <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: Math.min(100, (waterVal / waterTarget) * 100) + '%' }} />
          </div>
        </div>

        {/* Steps + undo */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-3 mb-2">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-gray-300">🚶 Pasos</span>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-gray-500">{stepsVal.toLocaleString()}</span>
              {stepsVal > 0 && (
                <button onClick={() => { hapticMedium(); upsertHabit('steps', 0, targets.steps || 10000); showToast('↩ Borrado') }}
                  className="text-[9px] text-red-400 font-bold bg-red-500/10 px-2 py-0.5 rounded-full active:scale-95">↩</button>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            {[5000, 8000, 10000].map(s => (
              <button key={s} onClick={() => { hapticMedium(); upsertHabit('steps', s, targets.steps || 10000); showToast('🚶') }}
                className={`flex-1 min-h-[40px] rounded-xl text-[10px] font-bold active:scale-95 transition ${stepsVal === s ? 'bg-blue-600 text-white' : 'bg-white/5 border border-white/10 text-gray-400'}`}>
                {s / 1000}k
              </button>
            ))}
          </div>
        </div>

        {/* Gym + BJJ toggles with undo */}
        <div className="grid grid-cols-2 gap-2 mb-2">
          <button onClick={() => {
            hapticMedium()
            const done = Number(todayHabits.gym?.value || 0) >= 1
            upsertHabit('gym', done ? 0 : 1, 1)
            showToast(done ? '↩ Gym desmarcado' : '🏋️ Gym ✓')
          }} className={`min-h-[44px] rounded-xl text-xs font-bold active:scale-95 transition ${
            Number(todayHabits.gym?.value || 0) >= 1 ? 'bg-green-600 text-white' : 'bg-white/5 border border-white/10 text-gray-400'
          }`}>
            🏋️ {Number(todayHabits.gym?.value || 0) >= 1 ? 'Gym ✓ (tap para deshacer)' : 'Marcar Gym'}
          </button>
          <button onClick={() => {
            hapticMedium()
            const done = Number(todayHabits.bjj?.value || 0) >= 1
            if (!done) { navigate('/bjj-session'); return }
            upsertHabit('bjj', 0, 1)
            showToast('↩ BJJ desmarcado')
          }} className={`min-h-[44px] rounded-xl text-xs font-bold active:scale-95 transition ${
            Number(todayHabits.bjj?.value || 0) >= 1 ? 'bg-orange-600 text-white' : 'bg-white/5 border border-white/10 text-gray-400'
          }`}>
            🥋 {Number(todayHabits.bjj?.value || 0) >= 1 ? 'BJJ ✓ (tap para deshacer)' : 'Marcar BJJ'}
          </button>
        </div>

        {/* Energy + undo */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-3 mb-2">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-gray-300">⚡ Energía</span>
            {todayEnergy && (
              <button onClick={() => { hapticMedium(); saveEnergy(null); showToast('↩ Borrado') }}
                className="text-[9px] text-red-400 font-bold bg-red-500/10 px-2 py-0.5 rounded-full active:scale-95">↩</button>
            )}
          </div>
          <div className="flex gap-2">
            {ENERGY_LEVELS.map(e => (
              <button key={e.val} onClick={() => { hapticMedium(); saveEnergy(e.val); showToast('⚡') }}
                className={`flex-1 min-h-[40px] rounded-xl text-lg transition active:scale-95 ${todayEnergy === e.val ? 'bg-violet-600 scale-110' : 'bg-white/5 border border-white/10'}`}>
                {e.emoji}
              </button>
            ))}
          </div>
        </div>

        {/* Weight */}
        {!todayWeight ? (
          <div className="bg-white/5 border border-white/10 rounded-2xl p-3">
            <span className="text-xs font-bold text-gray-300 block mb-2">⚖️ Peso</span>
            <div className="flex gap-2">
              <input type="number" step="0.1" value={weightInput} onChange={e => setWeightInput(e.target.value)}
                placeholder="ej: 85.0" className="flex-1 bg-gray-900 border border-gray-800 rounded-xl px-3 py-2 text-sm text-white" />
              <button onClick={async () => {
                if (!weightInput) return; hapticMedium()
                await supabase.from('weight_logs').upsert({ user_id: MATI_ID, date: new Date().toISOString().slice(0, 10), weight: Number(weightInput) }, { onConflict: 'user_id,date' })
                setTodayWeight(Number(weightInput)); setWeightInput(''); showToast('⚖️')
              }} disabled={!weightInput} className="bg-green-500 text-black px-4 rounded-xl font-bold text-sm active:scale-95 transition disabled:opacity-40">OK</button>
            </div>
          </div>
        ) : (
          <div className="bg-white/5 border border-green-500/20 rounded-2xl p-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-gray-300">⚖️ Peso</span>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black text-green-400">{todayWeight} kg ✓</span>
                <button onClick={async () => {
                  hapticMedium()
                  await supabase.from('weight_logs').delete().eq('user_id', MATI_ID).eq('date', new Date().toISOString().slice(0, 10))
                  setTodayWeight(null); showToast('↩ Peso borrado')
                }} className="text-[9px] text-red-400 font-bold bg-red-500/10 px-2 py-0.5 rounded-full active:scale-95">↩</button>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* ═══ ROUTINE ═══ */}
      {routine && (
        <Link to="/workout" state={{ routine }}
          className="block bg-white/5 border border-orange-500/20 rounded-2xl p-4 active:bg-orange-500/10 transition">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[9px] font-black text-orange-400 uppercase tracking-widest">🏋️ Rutina del día</p>
              <p className="text-xs text-gray-300 mt-0.5">{routine.routine_name}</p>
            </div>
            <span className="bg-orange-500 text-white px-3 py-1.5 rounded-xl text-[10px] font-black">EMPEZAR →</span>
          </div>
        </Link>
      )}

      {/* ═══ JOURNAL ═══ */}
      <section id="journal">
        <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
          <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-3">📝 Journal</p>
          <MicroJournal />
        </div>
      </section>
    </div>
  )
}
