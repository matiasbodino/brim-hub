import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useHabitStore } from '../stores/habitStore'
import { usePointsStore } from '../stores/pointsStore'
import { useToast } from '../components/Toast'
import { hapticLight, hapticMedium, hapticHeartbeat } from '../lib/haptics'
import { POINTS } from '../lib/constants'
import { track } from '../lib/analytics'
import { supabase } from '../lib/supabase'
import { MATI_ID } from '../lib/constants'
import { burnFromBJJ } from '../lib/activeBurn'

const STRAIN_LEVELS = [
  { emoji: '☁️', label: 'Suave', rpe: 4, color: 'bg-gray-900 border-gray-800' },
  { emoji: '💪', label: 'Moderado', rpe: 6, color: 'bg-gray-900 border-gray-800' },
  { emoji: '🔥', label: 'Intenso', rpe: 8, color: 'bg-orange-500 shadow-lg shadow-orange-500/40 border-orange-500' },
  { emoji: '💀', label: 'Destruido', rpe: 10, color: 'bg-red-600 shadow-lg shadow-red-500/40 border-red-600' },
]

export default function BJJSession() {
  const navigate = useNavigate()
  const location = useLocation()
  const showToast = useToast()
  const { upsertHabit } = useHabitStore()
  const { awardPoints } = usePointsStore()

  const meta = location.state?.meta || {}
  const [selectedStrain, setSelectedStrain] = useState(2) // default: Intenso
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const strain = STRAIN_LEVELS[selectedStrain]
  const duration = meta.duracion || 90
  const tipo = meta.tipo || 'Gi'
  const tecnicas = meta.tecnicas || ''
  const kcalBurned = burnFromBJJ(duration)

  // Strain score: RPE * duration / 10
  const strainScore = (strain.rpe * duration / 100).toFixed(1)

  // Recovery suggestion based on strain
  const getRecoverySuggestion = () => {
    if (strain.rpe >= 9) return 'Tu esfuerzo fue extremo. Mañana es día de recuperación activa. Priorizá 8hs de sueño, sumá 20g extra de proteína en la cena y hacé 10 min de Respiración 4-7-8 antes de dormir.'
    if (strain.rpe >= 7) return 'Sesión intensa. Para optimizar la recuperación, sumá un snack con proteína ahora y tomá 500ml de agua extra. Mañana bajamos pasos para que el cuerpo reconstruya.'
    if (strain.rpe >= 5) return 'Buen entrenamiento, equilibrado. Mantené la hidratación y cená con carbos para reponer glucógeno.'
    return 'Sesión técnica liviana. Perfecto para sumar volumen sin sobrecargar. Seguí con tu plan normal.'
  }

  const handleSave = async () => {
    setSaving(true)
    hapticMedium()

    // 1. Save BJJ habit
    await upsertHabit('bjj', 1, 1, {
      tipo,
      duracion: duration,
      tecnicas,
      rpe: strain.rpe,
      strain_score: Number(strainScore),
    })

    // 2. Award points
    await awardPoints('bjj', POINTS.bjj, 1)

    // 3. Save workout log
    await supabase.from('workout_logs').insert({
      user_id: MATI_ID,
      date: new Date().toISOString().slice(0, 10),
      routine_name: `BJJ ${tipo}`,
      focus: 'bjj',
      exercises: { bjj: { tipo, duracion: duration, tecnicas } },
      performance: [{ exercise: 'BJJ', category: 'bjj', actual: { duration, rpe: strain.rpe } }],
      rpe: strain.rpe,
      total_volume: kcalBurned,
      duration_min: duration,
    })

    track('bjj_session_completed', { tipo, duration, rpe: strain.rpe, strainScore })

    hapticHeartbeat()
    setSaved(true)
    setSaving(false)
    showToast(`🥋 BJJ ${tipo} guardado · +${POINTS.bjj} pts`)

    setTimeout(() => navigate('/'), 2000)
  }

  if (saved) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex flex-col items-center justify-center px-6">
        <div className="text-center animate-fade-in">
          <div className="w-20 h-20 bg-orange-500 rounded-full flex items-center justify-center mx-auto mb-5 shadow-xl shadow-orange-500/30 animate-[scale-in_0.3s_ease-out]">
            <span className="text-4xl">🥋</span>
          </div>
          <h2 className="text-xl font-black text-white">Oss!</h2>
          <p className="text-sm text-gray-400 mt-2">Sesión guardada. A recuperar.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] p-6 pb-32 max-w-lg mx-auto">
      {/* Header */}
      <div className="flex justify-between items-center mb-10">
        <h2 className="text-xl font-black text-white uppercase tracking-tighter">Sesión Finalizada</h2>
        <span className="text-orange-500 font-bold text-sm">BJJ {tipo} 🥋</span>
      </div>

      {/* Strain Selector */}
      <div className="bg-white/5 backdrop-blur-sm border border-white/10 border-t-orange-500/20 p-8 rounded-[2.5rem] text-center mb-6">
        <h3 className="text-gray-400 text-[10px] uppercase font-black tracking-widest mb-6">¿Qué tan duro fue?</h3>

        <div className="flex justify-between gap-2 mb-8">
          {STRAIN_LEVELS.map((s, i) => (
            <button
              key={i}
              onClick={() => { setSelectedStrain(i); hapticLight() }}
              className={`flex-1 py-4 rounded-2xl text-2xl border transition-all active:scale-95 ${
                selectedStrain === i ? s.color : 'bg-gray-900 border-gray-800'
              }`}
            >
              {s.emoji}
            </button>
          ))}
        </div>

        <div className="space-y-1">
          <span className="text-5xl font-black text-white italic">{strainScore}</span>
          <p className={`text-[10px] font-black uppercase tracking-widest ${
            strain.rpe >= 8 ? 'text-orange-500' : strain.rpe >= 6 ? 'text-yellow-500' : 'text-blue-400'
          }`}>
            Strain Score ({strain.label})
          </p>
        </div>

        {/* Session stats */}
        <div className="grid grid-cols-3 gap-3 mt-6">
          <div className="bg-gray-900/50 p-3 rounded-2xl text-center">
            <span className="block text-[9px] text-gray-500 uppercase font-bold">Duración</span>
            <span className="font-black text-white">{duration}'</span>
          </div>
          <div className="bg-gray-900/50 p-3 rounded-2xl text-center">
            <span className="block text-[9px] text-gray-500 uppercase font-bold">Quema</span>
            <span className="font-black text-orange-400">{kcalBurned}</span>
          </div>
          <div className="bg-gray-900/50 p-3 rounded-2xl text-center">
            <span className="block text-[9px] text-gray-500 uppercase font-bold">RPE</span>
            <span className="font-black text-white">{strain.rpe}/10</span>
          </div>
        </div>
      </div>

      {/* Recovery recommendation */}
      <div className="bg-white/5 backdrop-blur-sm border border-white/10 p-5 rounded-3xl mb-8">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0">
            <span className="text-lg">💡</span>
          </div>
          <p className="text-sm text-gray-300 leading-relaxed">{getRecoverySuggestion()}</p>
        </div>
      </div>

      {/* Técnicas (if any) */}
      {tecnicas && (
        <div className="bg-white/5 backdrop-blur-sm border border-white/10 p-4 rounded-2xl mb-6">
          <p className="text-[9px] text-gray-500 uppercase font-black tracking-widest mb-1">Técnicas trabajadas</p>
          <p className="text-xs text-gray-300">{tecnicas}</p>
        </div>
      )}

      {/* Save button */}
      <button
        onClick={handleSave}
        disabled={saving}
        className="w-full bg-white text-black font-black py-5 rounded-3xl active:scale-95 transition-all shadow-xl disabled:opacity-50"
      >
        {saving ? 'Guardando...' : 'GUARDAR Y VER RECOMENDACIÓN'}
      </button>
    </div>
  )
}
