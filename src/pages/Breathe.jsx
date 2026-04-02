import { useState, useRef, useEffect, useCallback } from 'react'
import { hapticLight, hapticMedium, hapticHeartbeat } from '../lib/haptics'
import { useToast } from '../components/Toast'

const TECHNIQUES = [
  { id: 'box', name: 'Box Breathing', desc: '4-4-4-4 · Enfoque y calma', steps: [
    { action: 'Inhalá', seconds: 4 },
    { action: 'Mantené', seconds: 4 },
    { action: 'Exhalá', seconds: 4 },
    { action: 'Mantené', seconds: 4 },
  ]},
  { id: 'coherent', name: 'Coherente', desc: '5-5 · Pre-BJJ / concentración', steps: [
    { action: 'Inhalá', seconds: 5 },
    { action: 'Exhalá', seconds: 5 },
  ]},
  { id: 'relax', name: 'Relajación 4-7-8', desc: 'Para dormir o bajar ansiedad', steps: [
    { action: 'Inhalá', seconds: 4 },
    { action: 'Mantené', seconds: 7 },
    { action: 'Exhalá', seconds: 8 },
  ]},
]

const DURATIONS = [1, 2, 3, 5, 10, 15, 20]

export default function Breathe() {
  const [technique, setTechnique] = useState(TECHNIQUES[0])
  const [duration, setDuration] = useState(2)
  const [running, setRunning] = useState(false)
  const [phase, setPhase] = useState(null) // current step
  const [phaseTime, setPhaseTime] = useState(0) // seconds left in phase
  const [totalTime, setTotalTime] = useState(0) // total seconds left
  const [scale, setScale] = useState(1)
  const showToast = useToast()
  const cancelRef = useRef(false)

  const sleep = (ms) => new Promise(r => setTimeout(r, ms))

  const start = useCallback(async () => {
    setRunning(true)
    cancelRef.current = false
    let remaining = duration * 60
    setTotalTime(remaining)
    hapticLight()

    while (remaining > 0 && !cancelRef.current) {
      for (const step of technique.steps) {
        if (remaining <= 0 || cancelRef.current) break

        setPhase(step.action)
        setPhaseTime(step.seconds)

        // Visual: scale circle
        if (step.action === 'Inhalá') setScale(1.8)
        else if (step.action === 'Exhalá') setScale(1.0)

        // Haptic at start of phase
        hapticLight()

        // Count down this phase
        for (let s = step.seconds; s > 0; s--) {
          if (cancelRef.current) break
          setPhaseTime(s)
          remaining--
          setTotalTime(remaining)
          await sleep(1000)
        }
      }
    }

    if (!cancelRef.current) {
      hapticHeartbeat()
      showToast('🧘 Sesión completada. Oss!')
    }
    setRunning(false)
    setPhase(null)
    setScale(1)
  }, [technique, duration])

  const stop = () => {
    cancelRef.current = true
    setRunning(false)
    setPhase(null)
    setScale(1)
  }

  const mins = Math.floor(totalTime / 60)
  const secs = totalTime % 60

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-indigo-950 pb-28 pt-8 px-4 max-w-lg mx-auto flex flex-col items-center">
      {/* Header */}
      <h1 className="text-xl font-black text-white tracking-tight mb-1">Respiración</h1>
      <p className="text-xs text-slate-400 mb-8">Recuperá, enfocá, rendí mejor</p>

      {/* Circle */}
      <div className="relative w-48 h-48 mb-8">
        <div
          className="absolute inset-0 rounded-full transition-transform ease-in-out flex items-center justify-center"
          style={{
            transform: `scale(${scale})`,
            transitionDuration: phase ? (phase === 'Inhalá' ? '4s' : phase === 'Exhalá' ? (technique.id === 'relax' ? '8s' : technique.id === 'coherent' ? '5s' : '4s') : '0.3s') : '0.5s',
            background: `radial-gradient(circle, ${phase === 'Inhalá' ? '#6366f1' : phase === 'Exhalá' ? '#0ea5e9' : phase === 'Mantené' ? '#8b5cf6' : '#334155'} 0%, transparent 70%)`,
            boxShadow: running ? `0 0 60px ${phase === 'Inhalá' ? '#6366f130' : '#0ea5e930'}` : 'none',
          }}
        />
        <div className="absolute inset-0 flex flex-col items-center justify-center z-10">
          {running ? (
            <>
              <span className="text-3xl font-black text-white">{phaseTime}</span>
              <span className="text-xs font-bold text-white/60 uppercase tracking-widest mt-1">{phase}</span>
            </>
          ) : (
            <span className="text-5xl">🧘</span>
          )}
        </div>
      </div>

      {/* Timer */}
      {running && (
        <p className="text-lg font-black text-white/80 mb-6 tabular-nums">
          {String(mins).padStart(2, '0')}:{String(secs).padStart(2, '0')}
        </p>
      )}

      {/* Controls */}
      {!running ? (
        <div className="w-full space-y-4">
          {/* Technique selector */}
          <div className="space-y-2">
            {TECHNIQUES.map(t => (
              <button
                key={t.id}
                onClick={() => { setTechnique(t); hapticLight() }}
                className={`w-full text-left px-4 py-3 rounded-2xl transition-all ${
                  technique.id === t.id
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20'
                    : 'bg-white/5 text-slate-300 border border-white/10'
                }`}
              >
                <p className="text-sm font-bold">{t.name}</p>
                <p className="text-[10px] opacity-60">{t.desc}</p>
              </button>
            ))}
          </div>

          {/* Duration pills */}
          <div>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Duración</p>
            <div className="flex gap-2">
              {DURATIONS.map(d => (
                <button
                  key={d}
                  onClick={() => { setDuration(d); hapticLight() }}
                  className={`flex-1 min-h-[44px] py-2 rounded-full text-sm font-bold transition-all ${
                    duration === d
                      ? 'bg-indigo-600 text-white'
                      : 'bg-white/5 text-slate-400 border border-white/10'
                  }`}
                >
                  {d} min
                </button>
              ))}
            </div>
          </div>

          {/* Start */}
          <button
            onClick={start}
            className="w-full bg-indigo-600 text-white py-5 rounded-[2rem] font-black text-lg active:scale-[0.98] transition-all shadow-xl shadow-indigo-500/20"
          >
            Empezar sesión
          </button>
        </div>
      ) : (
        <button
          onClick={stop}
          className="w-full bg-white/10 text-white/60 py-4 rounded-[2rem] font-bold text-sm active:scale-[0.98] transition-all border border-white/10"
        >
          Parar
        </button>
      )}
    </div>
  )
}
