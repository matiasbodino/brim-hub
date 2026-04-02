import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useHabitStore } from '../stores/habitStore'
import { useFoodStore } from '../stores/foodStore'
import { useToast } from '../components/Toast'
import { hapticLight, hapticMedium, hapticHeartbeat } from '../lib/haptics'
import { burnFromSteps } from '../lib/activeBurn'
import { POINTS } from '../lib/constants'
import { track } from '../lib/analytics'

export default function Walk() {
  const navigate = useNavigate()
  const showToast = useToast()
  const { upsertHabit, todayHabits } = useHabitStore()
  const { getTodayMacros } = useFoodStore()

  // Smart default: 50% of last meal consumed (post-prandial walk incentive)
  const macros = getTodayMacros()
  const smartTarget = macros.calories > 200 ? Math.round(macros.calories * 0.25) : 250

  const [active, setActive] = useState(false)
  const [paused, setPaused] = useState(false)
  const [seconds, setSeconds] = useState(0)
  const [distance, setDistance] = useState(0) // km
  const [targetKcal, setTargetKcal] = useState(smartTarget)
  const intervalRef = useRef(null)
  const startTimeRef = useRef(null)

  // Simulated pace (no GPS in PWA, user enters after or we estimate)
  const pace = seconds > 0 && distance > 0
    ? `${Math.floor((seconds / 60) / distance)}:${String(Math.round(((seconds / 60) / distance % 1) * 60)).padStart(2, '0')}`
    : '--:--'
  const steps = Math.round(distance * 1300) // ~1300 steps/km
  const kcalBurned = burnFromSteps(steps)
  const kcalPct = targetKcal > 0 ? Math.min(100, Math.round((kcalBurned / targetKcal) * 100)) : 0

  // Timer
  useEffect(() => {
    if (active && !paused) {
      intervalRef.current = setInterval(() => {
        setSeconds(s => s + 1)
        // Simulate distance (~5.5 km/h walking speed)
        setDistance(d => d + (5.5 / 3600))
      }, 1000)
    } else {
      clearInterval(intervalRef.current)
    }
    return () => clearInterval(intervalRef.current)
  }, [active, paused])

  const handleStart = () => {
    hapticMedium()
    setActive(true)
    setPaused(false)
    setSeconds(0)
    setDistance(0)
    startTimeRef.current = Date.now()
  }

  const handlePause = () => {
    hapticLight()
    setPaused(!paused)
  }

  const handleFinish = async () => {
    hapticHeartbeat()
    setActive(false)
    clearInterval(intervalRef.current)

    // Save steps to habits
    const currentSteps = Number(todayHabits.steps?.value || 0)
    await upsertHabit('steps', currentSteps + steps, 10000)

    track('walk_completed', { distance: distance.toFixed(2), steps, kcal: kcalBurned, seconds })
    showToast(`🚶 ${steps.toLocaleString()} pasos · ${kcalBurned} kcal quemadas`)
    navigate('/')
  }

  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60

  // Pre-walk screen
  if (!active) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] p-6 pt-12 max-w-lg mx-auto flex flex-col items-center justify-center pb-28">
        <div className="bg-white/5 backdrop-blur-sm inline-block px-4 py-1 rounded-full border border-blue-500/30 mb-6">
          <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Misión: Déficit Calórico</span>
        </div>

        <h1 className="text-5xl font-black text-white tracking-tighter mb-2">
          {targetKcal} <span className="text-xl text-gray-500 font-bold">kcal</span>
        </h1>
        <p className="text-sm text-gray-400 mb-2">para quemar caminando</p>
        {macros.calories > 0 && (
          <p className="text-[10px] text-gray-600 mb-6">Consumiste {macros.calories} kcal hoy · {Math.round(macros.calories * 0.25)} kcal = 25% post-prandial</p>
        )}

        {/* Target selector */}
        <div className="flex gap-2 mb-10 w-full">
          {[150, 250, 400, 500].map(k => (
            <button
              key={k}
              onClick={() => { setTargetKcal(k); hapticLight() }}
              className={`flex-1 min-h-[44px] py-2 rounded-full text-sm font-bold transition-all ${
                targetKcal === k ? 'bg-blue-600 text-white' : 'bg-white/5 text-gray-400 border border-white/10'
              }`}
            >
              {k}
            </button>
          ))}
        </div>

        <button
          onClick={handleStart}
          className="w-full bg-white text-black font-black py-5 rounded-[2rem] text-lg active:scale-[0.98] transition-all shadow-xl"
        >
          EMPEZAR CAMINATA
        </button>

        <button onClick={() => navigate('/')} className="mt-6 text-xs text-gray-500">
          ← Volver
        </button>
      </div>
    )
  }

  // Active walk screen
  return (
    <div className="min-h-screen bg-[#0a0a0a] relative overflow-hidden pb-28">
      {/* Background gradient (simulates map) */}
      <div className="absolute inset-0 z-0 opacity-20">
        <div className="absolute inset-0 bg-gradient-to-b from-blue-900/30 via-transparent to-[#0a0a0a]" />
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-64 h-64 bg-blue-500/10 rounded-full blur-[80px]" />
      </div>

      {/* Header */}
      <div className="relative z-10 p-6 pt-12 text-center">
        <div className="bg-white/5 backdrop-blur-sm inline-block px-4 py-1 rounded-full border border-blue-500/30 mb-4">
          <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest">
            {paused ? 'Pausado' : 'Caminando'}
          </span>
        </div>

        <h1 className="text-6xl font-black text-white tracking-tighter">
          {kcalBurned} <span className="text-xl text-gray-500 font-bold uppercase">kcal</span>
        </h1>
        <p className="text-sm text-gray-400 mt-1">
          {kcalBurned >= targetKcal ? '¡Meta alcanzada!' : `faltan ${targetKcal - kcalBurned} kcal para la meta`}
        </p>
      </div>

      {/* Progress ring */}
      <div className="relative z-10 flex items-center justify-center py-6">
        <div className="relative w-40 h-40">
          <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90 drop-shadow-[0_0_15px_rgba(59,130,246,0.3)]">
            <circle cx="50" cy="50" r="42" fill="none" stroke="#1f2937" strokeWidth="6" />
            <circle cx="50" cy="50" r="42" fill="none" stroke="#3b82f6" strokeWidth="6"
              strokeDasharray={`${kcalPct * 2.64} 264`} strokeLinecap="round"
              className="transition-all duration-1000" />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-2xl font-black text-white tabular-nums">
              {String(mins).padStart(2, '0')}:{String(secs).padStart(2, '0')}
            </span>
            <span className="text-[9px] text-gray-500 uppercase tracking-widest">Tiempo</span>
          </div>
        </div>
      </div>

      {/* Stats grid */}
      <div className="relative z-10 px-6 space-y-4">
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white/5 backdrop-blur-sm border border-white/10 p-4 rounded-3xl text-center">
            <span className="block text-[9px] text-gray-500 uppercase font-bold tracking-wider">Km</span>
            <span className="text-xl font-black text-white">{distance.toFixed(1)}</span>
          </div>
          <div className="bg-white/5 backdrop-blur-sm border border-white/10 p-4 rounded-3xl text-center">
            <span className="block text-[9px] text-gray-500 uppercase font-bold tracking-wider">Pace</span>
            <span className="text-xl font-black text-white">{pace}</span>
          </div>
          <div className="bg-white/5 backdrop-blur-sm border border-white/10 p-4 rounded-3xl text-center">
            <span className="block text-[9px] text-gray-500 uppercase font-bold tracking-wider">Pasos</span>
            <span className="text-xl font-black text-white">{steps.toLocaleString()}</span>
          </div>
        </div>

        {/* Nasal breathing check */}
        <div className="bg-white/5 backdrop-blur-sm border border-blue-500/20 p-4 rounded-3xl flex items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0">
            <span className="text-lg">👃</span>
          </div>
          <div className="flex-1">
            <h4 className="text-[10px] font-black text-white uppercase tracking-wider">Check: Respiración Nasal</h4>
            <div className="w-full bg-gray-800 h-1.5 rounded-full mt-2 overflow-hidden">
              <div className="bg-blue-500 h-full rounded-full transition-all duration-1000" style={{ width: `${Math.min(100, Math.round(seconds / (mins > 0 ? mins : 1) * 10))}%` }} />
            </div>
          </div>
          <span className="text-[10px] font-bold text-blue-400 flex-shrink-0">Mantené</span>
        </div>

        {/* Action buttons */}
        <div className="flex gap-3 pt-4">
          <button
            onClick={handlePause}
            className="flex-1 bg-gray-900 border border-gray-800 text-white font-bold py-5 rounded-3xl active:scale-95 transition-all"
          >
            {paused ? 'REANUDAR' : 'PAUSA'}
          </button>
          <button
            onClick={handleFinish}
            className="flex-[2] bg-white text-black font-black py-5 rounded-3xl shadow-xl active:scale-95 transition-all"
          >
            FINALIZAR
          </button>
        </div>
      </div>
    </div>
  )
}
