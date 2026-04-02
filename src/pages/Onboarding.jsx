import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { MATI_ID } from '../lib/constants'
import { hapticLight, hapticMedium } from '../lib/haptics'

const GOALS = [
  { id: 'fat_loss', emoji: '🔥', label: 'Perder grasa', desc: 'Déficit inteligente sin pasar hambre' },
  { id: 'muscle', emoji: '💪', label: 'Ganar músculo', desc: 'Superávit controlado + proteína alta' },
  { id: 'bjj_perf', emoji: '🥋', label: 'Rendimiento BJJ', desc: 'Energía para el mat sin perder peso' },
  { id: 'energy', emoji: '⚡', label: 'Más energía', desc: 'Equilibrio general, dormir mejor' },
]

const LEVELS = [
  { id: 'beginner', emoji: '🌱', label: 'Recién arranco', desc: 'Nunca trackeé nada' },
  { id: 'intermediate', emoji: '📊', label: 'Algo de experiencia', desc: 'Trackeé un par de veces' },
  { id: 'advanced', emoji: '🎯', label: 'Veterano', desc: 'Trackeo hace rato' },
]

export default function Onboarding() {
  const navigate = useNavigate()
  const [step, setStep] = useState(0)
  const [goal, setGoal] = useState(null)
  const [level, setLevel] = useState(null)
  const [weight, setWeight] = useState('')
  const [saving, setSaving] = useState(false)

  const handleFinish = async () => {
    setSaving(true)
    hapticMedium()

    // Save to user_profile
    const updates = { id: MATI_ID, display_name: 'Mati' }
    if (goal === 'fat_loss') {
      updates.weekly_weight_target = -0.5
      updates.daily_calorie_target = 1900
    } else if (goal === 'muscle') {
      updates.weekly_weight_target = 0.25
      updates.daily_calorie_target = 2400
    } else if (goal === 'bjj_perf') {
      updates.weekly_weight_target = 0
      updates.daily_calorie_target = 2200
    } else {
      updates.daily_calorie_target = 2100
    }
    if (weight) updates.target_weight = Number(weight)

    await supabase.from('user_profile').upsert(updates, { onConflict: 'id' })

    // Mark onboarding done
    localStorage.setItem('brim_onboarded', 'true')
    localStorage.setItem('brim_goal', goal)
    localStorage.setItem('brim_level', level)

    setSaving(false)
    // Force App to re-evaluate route by dispatching custom event
    window.dispatchEvent(new Event('onboarding-complete'))
    navigate('/')
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex flex-col items-center justify-center px-6 max-w-lg mx-auto">
      {/* Progress dots */}
      <div className="flex gap-2 mb-10">
        {[0, 1, 2].map(i => (
          <div key={i} className={`w-2 h-2 rounded-full transition-all ${step === i ? 'bg-blue-500 w-6' : step > i ? 'bg-green-500' : 'bg-gray-700'}`} />
        ))}
      </div>

      {/* Step 0: Goal */}
      {step === 0 && (
        <div className="w-full animate-fade-in">
          <h1 className="text-2xl font-black text-white text-center mb-2">¿Cuál es tu objetivo?</h1>
          <p className="text-xs text-gray-500 text-center mb-8">Esto define cómo Brim calibra todo</p>
          <div className="space-y-3">
            {GOALS.map(g => (
              <button
                key={g.id}
                onClick={() => { setGoal(g.id); hapticLight() }}
                className={`w-full text-left px-5 py-4 rounded-2xl transition-all active:scale-[0.98] ${
                  goal === g.id
                    ? 'bg-blue-600 text-white border border-blue-500'
                    : 'bg-white/5 text-gray-300 border border-white/10'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{g.emoji}</span>
                  <div>
                    <p className="text-sm font-bold">{g.label}</p>
                    <p className="text-[10px] opacity-60">{g.desc}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
          <button
            onClick={() => { if (goal) { hapticMedium(); setStep(1) } }}
            disabled={!goal}
            className="w-full bg-white text-black font-black py-5 rounded-[2rem] mt-8 active:scale-[0.98] transition disabled:opacity-30"
          >
            Siguiente
          </button>
        </div>
      )}

      {/* Step 1: Level */}
      {step === 1 && (
        <div className="w-full animate-fade-in">
          <h1 className="text-2xl font-black text-white text-center mb-2">¿Cuánta experiencia tenés?</h1>
          <p className="text-xs text-gray-500 text-center mb-8">Para ajustar el nivel de detalle</p>
          <div className="space-y-3">
            {LEVELS.map(l => (
              <button
                key={l.id}
                onClick={() => { setLevel(l.id); hapticLight() }}
                className={`w-full text-left px-5 py-4 rounded-2xl transition-all active:scale-[0.98] ${
                  level === l.id
                    ? 'bg-blue-600 text-white border border-blue-500'
                    : 'bg-white/5 text-gray-300 border border-white/10'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{l.emoji}</span>
                  <div>
                    <p className="text-sm font-bold">{l.label}</p>
                    <p className="text-[10px] opacity-60">{l.desc}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
          <div className="flex gap-3 mt-8">
            <button onClick={() => setStep(0)} className="flex-1 bg-white/5 text-gray-400 font-bold py-4 rounded-[2rem] border border-white/10">Atrás</button>
            <button
              onClick={() => { if (level) { hapticMedium(); setStep(2) } }}
              disabled={!level}
              className="flex-[2] bg-white text-black font-black py-4 rounded-[2rem] active:scale-[0.98] transition disabled:opacity-30"
            >
              Siguiente
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Weight goal */}
      {step === 2 && (
        <div className="w-full animate-fade-in">
          <h1 className="text-2xl font-black text-white text-center mb-2">¿Peso objetivo?</h1>
          <p className="text-xs text-gray-500 text-center mb-8">Opcional — podés cambiarlo después</p>

          <div className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-6">
            <input
              type="number"
              step="0.5"
              value={weight}
              onChange={e => setWeight(e.target.value)}
              placeholder="ej: 80"
              className="w-full bg-transparent text-center text-4xl font-black text-white border-none focus:outline-none focus:ring-0 placeholder:text-gray-700"
            />
            <p className="text-center text-xs text-gray-500 mt-2">kg</p>
          </div>

          <div className="flex gap-3">
            <button onClick={() => setStep(1)} className="flex-1 bg-white/5 text-gray-400 font-bold py-4 rounded-[2rem] border border-white/10">Atrás</button>
            <button
              onClick={handleFinish}
              disabled={saving}
              className="flex-[2] bg-white text-black font-black py-4 rounded-[2rem] active:scale-[0.98] transition disabled:opacity-30"
            >
              {saving ? 'Configurando...' : weight ? 'Arrancar' : 'Saltar y arrancar'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
